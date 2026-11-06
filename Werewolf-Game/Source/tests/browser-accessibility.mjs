// Automated setup/dialog checks, not a WCAG conformance or screen-reader certification.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url),base=process.env.BASE_URL || 'http://127.0.0.1:3000/';const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const reports=[],errors=[];
try{
 for(const config of [{width:320,height:568,scale:1},{width:390,height:844,scale:1,spacing:true},{width:320,height:568,scale:2},{width:568,height:320,scale:2}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(scale=>{
   if(!sessionStorage.getItem('setup-test-seeded')) {const names=['AlexandertheGreatPlayer12','Noah','Mila','Leo'];localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false}));sessionStorage.setItem('setup-test-seeded','true');}
   document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*scale+'px';});
  },config.scale);
  const session=await context.newCDPSession(page);await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,left:12,bottom:34,right:12}});
  await page.goto(base,{waitUntil:'networkidle'});if(config.spacing)await page.addStyleTag({content:'*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}p{margin-bottom:2em!important}'});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  async function audit(screen){
   const report=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),fonts:[...(document.querySelector('dialog:modal') || document.querySelector('main')).querySelectorAll('*')].filter(el=>!el.closest('svg') && el.getBoundingClientRect().width>2 && [...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim())).map(el=>({key:el.tagName+'|'+el.className+'|'+[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' '),size:parseFloat(getComputedStyle(el).fontSize)})),width:innerWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};});
   // A scrollable row can be cut by the viewport/fixed footer after the deliberate bottom-scroll test.
   // Do not hide those findings: verify each reported target at its focused, scrolled-into-view position.
   report.viewportEdgeTargetChecks=[];
   const scroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
   for(const violation of report.violations){
    if(violation.id!=='target-size')continue;
    const remaining=[];
    for(const node of violation.nodes){
     if(!node.summary.includes('partially obscured')){remaining.push(node);continue;}
     const target=page.locator(node.target[0]);await target.focus();await target.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
     const bounds=await target.boundingBox();assert.ok(bounds.width>=43.9 && bounds.height>=43.9,'edge target is actually undersized');
     assert.ok(await target.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el || el.contains(hit);}),'focused target remains obscured');
     const issues=await target.evaluate(async el=>(await axe.run(el,{runOnly:{type:'rule',values:['target-size']}})).violations);
     assert.deepEqual(issues,[],'target-size finding persists after focusing and scrolling');
     report.viewportEdgeTargetChecks.push({...node,focusedBounds:bounds,focusedAudit:'PASS'});
    }
    violation.nodes=remaining;
   }
   report.violations=report.violations.filter(v=>v.nodes.length);
   if(report.viewportEdgeTargetChecks.length)await page.evaluate(({x,y})=>scrollTo({left:x,top:y,behavior:'instant'}),scroll);
   reports.push({config,screen,...report});assert.deepEqual(report.violations,[],`${screen} ${JSON.stringify(config)}`);assert.equal(report.overflow,false,`${screen}: horizontal overflow`);assert.ok(report.width<=config.width+1,`${screen}: mobile layout viewport expanded to ${report.width}`);
   const frame=page.locator('dialog:modal .role-detail-frame');if(await frame.count())assert.ok(await frame.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'clipped role-frame content');
  }
  async function boundaries(dialog){
   const controls=dialog.locator('button,input,select,textarea,summary,[tabindex]');
   const usable=[];for(let i=0;i<await controls.count();i++){const el=controls.nth(i);if(await el.evaluate(el=>el.tabIndex>=0 && !el.matches(':disabled,input[type="hidden"]') && el.getClientRects().length>0))usable.push(el);}
   const first=usable[0],last=usable.at(-1);await first.focus();await page.keyboard.press('Shift+Tab');assert.ok(await last.evaluate(el=>el===document.activeElement),'backward Tab escape');await page.keyboard.press('Tab');assert.ok(await first.evaluate(el=>el===document.activeElement),'forward Tab escape');
   assert.ok(await first.evaluate(el=>getComputedStyle(el).outlineStyle!=='none' && parseFloat(getComputedStyle(el).outlineWidth)>=2),'missing focus ring');
  }
  async function targets(selector){for(const el of await page.locator(selector).all()){if(!await el.isVisible())continue;const b=await el.boundingBox();assert.ok(b.width>=43.9 && b.height>=43.9,`small target ${selector}: ${JSON.stringify(b)}`);}}
  await audit('home');assert.equal(await page.locator('.home-start').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),18*config.scale);await targets('.home-buttons button');
  const feedbackOpener=page.getByRole('button',{name:'SETTINGS',exact:true});await feedbackOpener.click();const feedback=page.getByRole('dialog',{name:'SETTINGS',exact:true});await audit('feedback');await boundaries(feedback);await targets('.feedback-dialog button');
  const controls=feedback.locator('input,select');
  for(const el of await controls.all()){
   await el.focus();const rect=await el.boundingBox(),port=await page.locator('.feedback-content').boundingBox();assert.ok(rect.y>=port.y-1 && rect.y+rect.height<=port.y+port.height+1,'focused setting hidden by dialog chrome');
  }
  if(config.scale===2)await page.screenshot({path:`${output}/setup-feedback-${config.width}-200.png`,fullPage:false});
  await page.keyboard.press('Escape');assert.ok(await feedbackOpener.evaluate(el=>el===document.activeElement),'feedback opener focus not restored');
  const bookOpener=page.getByRole('button',{name:'ROLE RULEBOOK',exact:true});await bookOpener.click();const book=page.getByRole('dialog',{name:'ROLE RULEBOOK',exact:true});await audit('rulebook');await boundaries(book);
  const search=book.getByRole('textbox',{name:'Find a role'});await search.fill('doctor');const searchBox=await search.boundingBox(),bookPort=await book.locator('.role-rulebook-content').boundingBox();assert.ok(searchBox.y>=bookPort.y-1 && searchBox.y+searchBox.height<=bookPort.y+bookPort.height+1,'rulebook search hidden by its header');const titleBox=await book.getByRole('heading',{name:'ROLE RULEBOOK',exact:true}).boundingBox(),bookHeader=await book.locator('.role-rulebook-header').boundingBox();assert.ok(titleBox.y+titleBox.height<=bookHeader.y+bookHeader.height,'rulebook heading clipped by flex shrink');assert.equal(await book.locator('.role-rulebook-entry').count(),1);await search.fill('not-a-role');assert.ok(await book.getByText('No roles found. Try another name.').isVisible());await page.keyboard.press('Escape');assert.ok(await bookOpener.evaluate(el=>el===document.activeElement));
  await page.getByRole('button',{name:'HOW TO PLAY',exact:true}).click();await audit('how-to-play');
  const howBook=page.getByRole('button',{name:'ROLE RULEBOOK',exact:true});await howBook.click();await audit('how-to-reference');assert.equal(await page.locator('.role-rulebook-entry').count(),35);await page.keyboard.press('Escape');assert.ok(await howBook.evaluate(el=>el===document.activeElement));await page.getByRole('button',{name:'GOT IT',exact:true}).click();
  await page.getByRole('button',{name:'START GAME',exact:true}).click();await audit('roster');
  assert.match(await page.locator('#player-count-help').textContent(),/Next: choose one role/);
  assert.ok(await page.locator('.setup-header').evaluate(el=>parseFloat(getComputedStyle(el).paddingTop)>=24));
  await page.getByRole('button',{name:'PLAYER LIBRARY',exact:true}).click();await audit('library');await page.getByRole('button',{name:'ALL-TIME RANKINGS',exact:true}).click();await audit('rankings');await page.getByRole('button',{name:'Go back',exact:true}).click();await page.getByRole('button',{name:'Go back',exact:true}).click();
  await page.getByRole('button',{name:'Delete players',exact:true}).click();await audit('delete-mode');await targets('.remove-roster');await page.getByRole('button',{name:'Exit delete mode',exact:true}).click();
  await targets('.setup-header button,.random-player-button,.setup-primary');
  await page.getByRole('button',{name:'Add player',exact:true}).click();await audit('player-form');await page.getByRole('button',{name:'ADD PLAYER',exact:true}).click();await audit('name-error');assert.ok(await page.getByRole('alert').isVisible());assert.ok(await page.getByRole('textbox',{name:'PLAYER NAME'}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  const avatar=page.getByRole('button',{name:'Choose or change game avatar',exact:true});await avatar.click();const source=page.getByRole('dialog',{name:'Choose photo or avatar',exact:true});await audit('photo-options');await boundaries(source);
  await source.getByRole('button',{name:'Game avatars',exact:true}).click();const picker=page.getByRole('dialog',{name:'Game avatars',exact:true});await audit('avatar-picker');await boundaries(picker);assert.ok(await picker.getByRole('button',{name:'Back to photo options',exact:true}).evaluate(el=>el===document.activeElement));await page.keyboard.press('Escape');assert.ok(await avatar.evaluate(el=>el===document.activeElement),'avatar chooser opener lost after switching sheet content');
  await page.getByRole('button',{name:'Go back',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();await audit('roles');assert.ok(await page.locator('.role-page-header').evaluate(el=>parseFloat(getComputedStyle(el).paddingTop)>=24));await targets('.role-page .stepper button,.role-page-header .back');
  assert.equal(await page.locator('.setup-settings-group').count(),4);
  const timing=page.getByRole('region',{name:'TURN TIMING',exact:true});
  await timing.getByRole('checkbox',{name:'Wait time for passive roles',exact:true}).check();await timing.getByRole('checkbox',{name:'Wait time for every role',exact:true}).check();
  for(const [name,steps] of [['Passive role wait seconds',2],['Every role wait seconds',6]]){
   const range=timing.getByRole('slider',{name,exact:true});await range.focus();await page.keyboard.press('Home');for(let i=0;i<steps;i++)await page.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),String(steps+1));assert.ok(await range.evaluate(el=>el.closest('label').previousElementSibling.querySelector('input[type=checkbox]')));assert.equal(await range.getAttribute('aria-describedby'),null);
  }
  await targets('.setup-wait-duration input');await audit('timing-both-on');if(config.scale===2)await page.screenshot({path:`${output}/settings-waits-${config.width}-200.png`,fullPage:false});
  await timing.getByRole('checkbox',{name:'Wait time for passive roles',exact:true}).uncheck();assert.equal(await timing.getByRole('slider',{name:'Passive role wait seconds',exact:true}).count(),0);assert.equal(await timing.getByRole('slider',{name:'Every role wait seconds',exact:true}).inputValue(),'7');await audit('timing-passive-off');
  await timing.getByRole('checkbox',{name:'Wait time for passive roles',exact:true}).check();assert.equal(await timing.getByRole('slider',{name:'Passive role wait seconds',exact:true}).inputValue(),'3');await audit('timing-restored');
  await timing.getByRole('checkbox',{name:'Wait time for passive roles',exact:true}).uncheck();await timing.getByRole('checkbox',{name:'Wait time for every role',exact:true}).uncheck();await audit('timing-both-off');
  assert.equal(await page.getByRole('region',{name:'PREFERENCES',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'SETTINGS',exact:true}).count(),0);await audit('setup-preferences-removed');
  await page.reload({waitUntil:'networkidle'});if(config.spacing)await page.addStyleTag({content:'*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}p{margin-bottom:2em!important}'});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  const saved=await page.evaluate(()=>({settings:JSON.parse(localStorage.getItem('werewolf.settings')),feedback:JSON.parse(localStorage.getItem('werewolf.feedback.v1'))}));assert.equal(saved.settings.passiveWait,false);assert.equal(saved.settings.allRolesWait,false);assert.equal(saved.settings.passiveWaitSeconds,3);assert.equal(saved.settings.allRolesWaitSeconds,7);assert.equal(saved.feedback.ambienceVolume,45);assert.equal(saved.settings.buttonSounds,false);await audit('settings-reopened');
  const footer=await page.locator('.role-start-bar').boundingBox();assert.ok(await page.locator('.role-page').evaluate((el,height)=>parseFloat(getComputedStyle(el).paddingBottom)>=height,footer.height),'fixed footer space not reserved');
  // A final card must scroll fully above the fixed action bar, not just exist offscreen.
  const lastStepper=page.locator('.role-page .stepper button').last();await lastStepper.scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const lastRect=await lastStepper.boundingBox(),bar=await page.locator('.role-start-bar').boundingBox();assert.ok(lastRect.y+lastRect.height<=bar.y+1,'footer covers last role control');
  assert.equal(await page.locator('#role-count-help').count(),0);
  assert.equal(await page.locator('.setup-quick-guide').count(),0);await audit('setup-guide-removed');
  const previousCounts=await page.locator('.stepper span').allTextContents();await page.getByRole('button',{name:'RANDOM DISTRIBUTION',exact:false}).click();await audit('distribution');assert.deepEqual(await page.locator('.stepper span').allTextContents(),previousCounts);assert.match(await page.locator('.distribution-options').textContent(),/replaces your selected lineup/);
  const detailsOpener=page.getByRole('button',{name:'View Doctor details',exact:true});await detailsOpener.click();const details=page.getByRole('dialog',{name:'DOCTOR',exact:true});await audit('doctor');await boundaries(details);
  await details.getByText('ROLE SETTINGS',{exact:true}).click();await audit('doctor-settings');await targets('.role-details .settings-number-control button');
  for(const el of await details.locator('input,select').all()){
   if(!await el.isVisible())continue;await el.focus();const rect=await el.boundingBox(),port=await details.locator('.role-detail-body').boundingBox();assert.ok(rect.y>=port.y-1 && rect.y+rect.height<=port.y+port.height+1,'role setting focus hidden behind dialog header');
  }
  const slider=details.getByRole('slider').first();const before=await slider.inputValue();await slider.focus();await page.keyboard.press('ArrowLeft');assert.equal(await details.getByRole('heading',{name:'DOCTOR',exact:true}).count(),1,'slider arrow navigated role browser');assert.ok(Number(await slider.inputValue())<=Number(before));
  if(config.scale===2)await page.screenshot({path:`${output}/setup-doctor-${config.width}-200.png`,fullPage:false});
  await page.keyboard.press('Escape');assert.ok(await detailsOpener.evaluate(el=>el===document.activeElement));
  const randomOpener=page.getByRole('button',{name:'View random VILLAGERS details',exact:true});await randomOpener.click();const random=page.getByRole('dialog',{name:'RANDOM VILLAGERS',exact:true});await audit('random-details');await boundaries(random);await random.getByRole('checkbox',{name:'One player per random role',exact:true}).check();await audit('random-unique-details');await page.keyboard.press('Escape');assert.ok(await randomOpener.evaluate(el=>el===document.activeElement));assert.match(await page.locator('.random-pick-help').textContent(),/do not repeat/);
  if(config.scale===1){
   await page.emulateMedia({forcedColors:'active'});const checkbox=page.getByRole('checkbox',{name:'Show dead player’s role',exact:true});await checkbox.focus();
   assert.ok(await checkbox.evaluate(el=>{const visual=el.nextElementSibling;return getComputedStyle(visual).outlineStyle!=='none' && parseFloat(getComputedStyle(visual).borderWidth)>=2;}),'forced-color focus/state border missing');
   await page.emulateMedia({forcedColors:'none'});
  }
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Add Villager',exact:true}).click();assert.equal(await page.locator('#role-count-help').count(),0);await audit('count-matches-invalid');
  await page.getByRole('button',{name:'START GAME 4 / 4',exact:true}).click();assert.match(await page.getByRole('alert').textContent(),/keep wolves fewer than half/);await audit('invalid-lineup');
  const error=page.getByRole('alert');await error.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const el=document.querySelector('.role-start-bar .warning');return el.scrollTop+el.clientHeight>=el.scrollHeight-1;},null,{timeout:2000});assert.ok(await error.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-1),'cannot read the end of a wrapped lineup error');await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('.role-start-bar .warning').scrollTop===0,null,{timeout:2000});assert.equal(await error.evaluate(el=>el.scrollTop),0);
  if(config.scale===2)await page.screenshot({path:`${output}/setup-invalid-${config.width}-200.png`,fullPage:false});
  const errorBar=await page.locator('.role-start-bar').boundingBox();assert.ok(errorBar.height<config.height-44,'error footer consumes entire viewport');
  await page.getByRole('button',{name:'Add Werewolf',exact:true}).click();assert.equal(await page.locator('#role-count-help').count(),0);assert.ok(await page.getByRole('button',{name:'START GAME 5 / 4',exact:true}).isDisabled());await audit('excess-count');
  await page.getByRole('button',{name:'Remove Villager',exact:true}).click();await audit('count-matches-valid');await page.getByRole('button',{name:'START GAME 4 / 4',exact:true}).click();assert.ok(await page.locator('.night-intro').isVisible());assert.equal(await page.locator('.setup-quick-guide,#role-count-help').count(),0);
  await context.close();
 }
 for(const normal of reports.filter(r=>r.config.width===320 && r.config.scale===1)){
  const large=reports.find(r=>r.screen===normal.screen && r.config.width===320 && r.config.scale===2),fonts=new Map(large.fonts.map(f=>[f.key,f.size]));
  for(const font of normal.fonts){if(font.key==='BUTTON|back|‹')continue; // Decorative arrow behaves like the fixed-size SVG icons.
   if(fonts.has(font.key))assert.ok(Math.abs(fonts.get(font.key)-2*font.size)<.2,`${normal.screen}: text did not double: ${font.key}`);
  }
 }
 assert.deepEqual(errors,[]);console.log(`Setup accessibility passed: ${reports.length} screen audits at 320/390px and 200% root text at 320px/landscape, no detected WCAG A/AA violations, doubled readable text, text-spacing overrides, emulated safe-area insets, responsive controls, full-size targets, dialog Tab/Escape/opener focus, sheet-content focus, visible settings and fixed-footer clearance. Automated results are not full WCAG or real-device certification; manual-review findings are recorded.`);
}finally{await writeFile(output+'/accessibility-results.json',JSON.stringify({reports,errors},null,2));await browser.close();}
