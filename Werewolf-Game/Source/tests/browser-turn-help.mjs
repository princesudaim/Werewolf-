import {continueReport} from './helpers/report-controls.mjs';
// Real three-night flow: hints must follow existing own resources, never hidden blockers/outcomes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {deal,roles} from '../src/werewolf-engine.ts';
const require=createRequire(import.meta.url),base=process.env.BASE_URL||'http://127.0.0.1:3000/',output=process.env.RESULT_SCREENSHOT_DIR||'.cache/results';await mkdir(output,{recursive:true});
const names=['Ava','Noah','Mila','Leo','Finn','Iris','Luna','Sam'];
const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,necromancer:1,instigator:1,mindflayer:1,doctor:1,villager:2});
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let seed,lineup;const original=Math.random;try{for(let n=1;n<1000;n++){Math.random=random(n);const p=deal(names,counts);if(p[0].role==='necromancer'){seed=n;lineup=p;break;}}}finally{Math.random=original;}assert.ok(lineup);
const doctor=lineup.find(p=>p.role==='doctor').name,victims=lineup.filter(p=>p.role==='villager').map(p=>p.name);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const reports=[],errors=[];
try{
 for(const config of [{width:320,height:568,scale:1},{width:390,height:844,scale:1,spacing:true},{width:320,height:568,scale:2},{width:568,height:320,scale:2}])for(const regeneration of [0,100]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({names,config,regeneration})=>{localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,sounds:false,buttonSounds:false,haptics:false,doctorSelfProtect:true,doctorRepeatProtect:true,sheriffEveryNight:false,necromancerUses:1,instigatorMaxUses:1,mindStartingParasites:1,mindRegenPercent:regeneration,secretVotes:true,revealDead:false}));localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*config.scale+'px';});},{names,config,regeneration});
  const session=await context.newCDPSession(page);await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,left:12,bottom:34,right:12}});
  await page.goto(base,{waitUntil:'networkidle'});if(config.spacing)await page.addStyleTag({content:'*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}p{margin-bottom:2em!important}'});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const [r,n]of Object.entries(counts))for(let i=0;i<n;i++)await page.getByRole('button',{name:'Add '+roles[r].name,exact:true}).click();await page.evaluate(seed=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},seed);await page.getByRole('button',{name:/START GAME/}).click();
  async function acknowledge(){const ok=page.getByRole('button',{name:'OK · HIDE INFO',exact:true});while(await ok.count())await ok.click();}
  async function choose(name,button='COMPLETE ACTION'){await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).click();await page.getByRole('button',{name:button,exact:true}).click();}
  async function audit(state){
   const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),manualReview:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};});reports.push({config,regeneration,state,...result});assert.deepEqual(result.violations,[]);assert.equal(result.overflow,false);
   const hint=page.locator('.turn-help');if(await hint.count()){assert.equal(await hint.locator('button,[tabindex],[aria-live],[role="status"],[role="alert"]').count(),0);assert.doesNotMatch(await hint.innerText(),/Madman|blocked|successful|protected|Police/i);await hint.scrollIntoViewIfNeeded();assert.ok(await hint.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.equal(await hint.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),14*config.scale,'hint text does not scale with the root font');}
  }
  let living=8;
  for(let night=1;night<=3;night++){
   await continueReport(page);
   for(let i=0;i<living;i++){
    assert.equal(await page.locator('.turn-help').count(),0);assert.ok(await page.locator('.player-pass h2').evaluate(el=>el===document.activeElement));await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await acknowledge();const role=await page.locator('.action h2').innerText(),hint=page.locator('.turn-help');let old;
    if(role==='Necromancer'){
     if(night===2){assert.equal(await hint.count(),0);await choose(victims[0]);}
     else{assert.match(await hint.innerText(),night===1?/No dead player is available/:/No revivals left/);await audit(night===1?'no-dead-player':'revivals-used');old=await hint.elementHandle();await page.getByRole('button',{name:'SKIP',exact:true}).click();}
    }else if(role==='Sheriff'){
     if(night===1){assert.equal(await hint.count(),0);await choose(victims[0]);}
     else{assert.match(await hint.innerText(),/shot has already been used/);if(night===2)await audit('shot-used');old=await hint.elementHandle();await page.getByRole('button',{name:'SKIP',exact:true}).click();}
    }else if(role==='Vote Marker'){
     if(night===1){assert.equal(await hint.count(),0);await choose(doctor);}
     else{assert.match(await hint.innerText(),/No vote marks left/);if(night===2)await audit('marks-used');old=await hint.elementHandle();await page.getByRole('button',{name:'SKIP',exact:true}).click();}
    }else if(role==='Mind Flayer'){
     if(night===1 || (night===3 && regeneration===100)){
      assert.equal(await hint.count(),0);if(night===3)await audit('creature-restored');await choose(night===1?doctor:victims[1],'PLACE TINY CREATURE');
     }else{
      assert.match(await hint.innerText(),regeneration===0?/Regeneration is off/:/skip and try to get one/);await audit(night===2?'no-creatures':'still-no-creatures');old=await hint.elementHandle();if(config.scale===2 && regeneration===0 && night===2)await page.screenshot({path:`${output}/turn-help-${config.width}-200.png`,fullPage:false});await page.getByRole('button',{name:'SKIP AND TRY TO GET ONE',exact:true}).click();await page.getByRole('button',{name:'OK · HIDE RESULT',exact:true}).click();
     }
    }else if(role==='Werewolf'||role==='Doctor')await choose(doctor);else await page.getByRole('button',{name:'SKIP',exact:true}).click();
    if(old)assert.equal(await old.evaluate(el=>el.isConnected),false);assert.equal(await page.locator('.turn-help').count(),0);
   }
   assert.equal(await page.locator('.morning-next-step').textContent(),'Next: discussion and voting.');assert.ok((await page.getByRole('button',{name:'CONTINUE →',exact:true}).getAttribute('aria-describedby')).split(' ').includes('morning-next-step'));living=night===1?7:8;
   if(night<3){await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();for(let i=0;i<living;i++)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();const hold=page.getByRole('button',{name:'CONTINUE →',exact:true});await hold.focus();await page.keyboard.down('Enter');await page.waitForTimeout(2100);await page.keyboard.up('Enter');}
  }
  await context.close();
 }
 assert.equal(reports.length,48);assert.deepEqual(errors,[]);console.log('Turn-flow help passed: 48 resource-state accessibility audits, eight complete three-night flows, 0/100% regeneration, real revival/shot/mark use, no hint while available or after handoff, no new controls/live regions, large text/spacing/synthetic safe areas and unchanged morning routing. Physical-device/AT/manual contrast checks remain separate.');
}finally{await writeFile(output+'/turn-flow-results.json',JSON.stringify({reports,errors},null,2));await browser.close();}
