import {continueReport} from './helpers/report-controls.mjs';
// Privacy-safe motion and the unchanged real two-second hold, on a production build.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];let checked=0;
try{
 for(const mode of ['normal','system-reduced','manual-reduced']){
  const reduced=mode!=='normal';
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='system-reduced'?'reduce':'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(mode=>{
   const names=['Ava','Noah','Mila','Leo'];
   localStorage.setItem('werewolf.names',JSON.stringify(names));
   localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false,firstNightSafe:true,revealDead:false}));
   if(!localStorage.getItem('werewolf.motion.v1'))localStorage.setItem('werewolf.motion.v1',JSON.stringify(mode==='manual-reduced'?'reduced':'system'));
   localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
  },mode);
  await page.goto(base,{waitUntil:'networkidle'});
  async function animation(selector,expected){assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).animationName),expected);}
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'SETTINGS',exact:true});
  assert.equal(await dialog.getByLabel('Reduce animations',{exact:true}).isChecked(),mode==='manual-reduced');
  await animation('.feedback-dialog',reduced?'none':'ww-panel-in');
  if(mode==='normal'){
   await dialog.getByLabel('Reduce animations',{exact:true}).check();await animation('.feedback-dialog','none');
   assert.equal(await page.evaluate(()=>localStorage.getItem('werewolf.motion.v1')),'"reduced"');
   await dialog.getByLabel('Reduce animations',{exact:true}).uncheck();await animation('.feedback-dialog','ww-panel-in');
   await page.emulateMedia({reducedMotion:'reduce'});await animation('.feedback-dialog','none');
   assert.equal(await dialog.getByLabel('Reduce animations',{exact:true}).isChecked(),false);assert.equal(await page.evaluate(()=>document.querySelector('main').getAnimations({subtree:true}).length),0);
   await page.emulateMedia({reducedMotion:'no-preference'});await animation('.feedback-dialog','ww-panel-in');
  }else if(mode==='system-reduced'){
   await dialog.getByLabel('Reduce animations',{exact:true}).check();await dialog.getByLabel('Reduce animations',{exact:true}).uncheck();
   await animation('.feedback-dialog','none'); // The app cannot override an OS reduction.
  }
  await dialog.getByRole('button',{name:'DONE',exact:true}).click();
  if(mode==='manual-reduced'){
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('main').getAttribute('data-motion'),'reduced');
  }
  await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  for(const role of ['Werewolf','Seer','Madman','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});const rect=await page.locator('.role-start-bar').boundingBox();assert.ok(rect.x>=-1 && rect.x+rect.width<=width+1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'fixed bar/viewport overflow');
   assert.notEqual(await page.locator('.role-start-bar').evaluate(el=>getComputedStyle(el).transform),'none','essential centering transform was removed');
  }
  await page.evaluate(()=>{Math.random=()=>0;});
  await page.getByRole('button',{name:/START GAME/}).click();await animation('.night-intro .modal',reduced?'none':'ww-panel-in');
  await continueReport(page);let wolf;const seen=[];
  for(let i=0;i<4;i++){
   const name=await page.locator('.player-pass h2').innerText();await animation('.player-pass',reduced?'none':'ww-private-in');
   await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
   while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
   const role=await page.locator('.action h2').innerText();seen.push(role);if(role==='Werewolf')wolf=name;
   assert.notEqual(role,'Madman');assert.doesNotMatch(await page.locator('.panel.description > p').innerText(),/Madman|different village role/);
   await animation('.action',reduced?'none':'ww-private-in');
   const old=await page.locator('.action').elementHandle();
   if(role==='Seer'||role==='Police'){
    const target=page.locator('button.target:not(:disabled)').first();assert.equal(await target.evaluate(el=>getComputedStyle(el).transitionDuration),reduced?'0s':'0.1s, 0.1s, 0.1s, 0.1s, 0.1s');
    await target.click();await page.getByRole('button',{name:'COMPLETE ACTION',exact:true}).click();
    const result=page.getByRole('button',{name:'OK · HIDE RESULT',exact:true});
    if(await result.count()){
     await animation('.private-info',reduced?'none':'ww-private-in');await result.click();
    }
   }else await page.getByRole('button',{name:'SKIP',exact:true}).click();
   // Check the actual old node, not just opacity. No outgoing animation retention.
   assert.equal(await old.evaluate(el=>el.isConnected),false);
   assert.equal(await page.locator('.action,.role-art,.private-info').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checked++;
  }
  assert.deepEqual(seen.sort(),['Police','Seer','Villager','Werewolf']);
  assert.ok(await page.getByText('No one was killed tonight.',{exact:true}).isVisible());await animation('.morning-title',reduced?'none':'ww-panel-in');
  await continueReport(page);await animation('.discussion-screen .timer',reduced?'none':'ww-panel-in');
  await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
  for(let i=0;i<4;i++){
   const voter=await page.locator('.voter-name').innerText();
   if(voter===wolf)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();
   else{await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+wolf+'$')})}).click();await page.getByRole('button',{name:'VOTE',exact:true}).click();}
  }
  await page.getByRole('heading',{name:'THE VILLAGE HAS DECIDED!',exact:true}).waitFor();await animation('.verdict-frame',reduced?'none':'ww-panel-in');
  assert.equal(await page.locator('.verdict-role').count(),0,'hidden public role was revealed by motion');
  const hold=page.getByRole('button',{name:'CONTINUE →',exact:true});
  await hold.focus();await page.keyboard.down(' ');await page.waitForTimeout(550);
  assert.match(await hold.innerText(),/Keep holding/);
  assert.equal(await hold.evaluate(el=>getComputedStyle(el,'::before').visibility),reduced?'hidden':'visible');
  if(!reduced){const progress=await hold.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el,'::before').transform).a);assert.ok(progress>0 && progress<1);await page.screenshot({path:output+'/hold-progress-motion.png',fullPage:true});}
  else assert.equal(await hold.evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
  await page.keyboard.up(' ');await page.waitForTimeout(1700);assert.ok(await hold.isVisible(),'a cancelled hold advanced the game');
  if(mode==='normal'){
   await hold.focus();await page.keyboard.down('Enter');await page.waitForTimeout(200);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.keyboard.up('Enter');await page.waitForTimeout(2000);assert.ok(await hold.isVisible(),'background hold advanced the game');await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  }
  const start=Date.now();await hold.focus();await page.keyboard.down('Enter');await page.waitForTimeout(2050);await page.keyboard.up('Enter');
  await page.getByRole('heading',{name:'VILLAGE WINS',exact:true}).waitFor();assert.ok(Date.now()-start>=1950);
  await animation('.match-winner-frame',reduced?'none':'ww-panel-in');
  assert.ok(await page.getByText(/Police · Madman/).count(),'Madman was not revealed at game end');
  for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  if(reduced)assert.equal(await page.evaluate(()=>document.querySelector('main').getAnimations({subtree:true}).length),0);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log(`Production motion passed: ${checked} private cards across normal/OS-reduced/manual-reduced modes, hidden Madman disguise, immediate outgoing-node removal, role-hidden public verdicts, private results, public phase/winner entrances, 320/390px fixed controls, reduced-motion precedence, cancel-on-release/background, decorative hold progress and the unchanged two-second hold. No runtime errors.`);
}finally{await browser.close();}
