// Native, offline production playback: every-night and discussion one-shots, never loops.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
import {installPhaseProbe} from './helpers/phase-audio-probe.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/';
const output=process.env.RESULT_SCREENSHOT_DIR||'.cache/phase-cue-browser';await mkdir(output,{recursive:true});
const catalog=JSON.parse(await readFile('src/phase-audio-catalog.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],plays:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(installPhaseProbe);await context.addInitScript(()=>{
  if(!localStorage.getItem('werewolf.names')){
   localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:false,firstNightSafe:true}));localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:false,volume:65}));
  }
  window.__players=[];
  const A=Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p);__players.push(p);p.play=()=>{if(p.volume>0)__plays.push({file:p.src.split('/').pop(),time:performance.now(),volume:p.volume,loop:p.loop});return play();};p.addEventListener('ended',()=>__ended.push(p.src.split('/').pop()));return p;};window.Audio.prototype=A.prototype;
 });
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const files=Object.values(catalog.cues).map(c=>c.file);assert.equal(await page.evaluate(async files=>{const cache=await caches.open((await caches.keys())[0]);return (await Promise.all(files.map(f=>cache.match(new URL(f,location.href).href)))).filter(Boolean).length;},files),2);
 await context.setOffline(true);await page.reload({waitUntil:'load'});
 const click=name=>page.getByRole('button',{name,exact:true}).click();const count=file=>page.evaluate(file=>__plays.filter(p=>p.file===file).length,file);
 const heard=async(file,n)=>{await page.waitForFunction(({file,n})=>__plays.filter(p=>p.file===file).length===n,{file,n});};
 await click('SETTINGS');await page.getByRole('checkbox',{name:'Save this match for recovery',exact:true}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await click('DONE');
 await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Villager','Villager','Villager'])await click('Add '+role);await page.getByRole('button',{name:/START GAME/}).click();assert.equal(await count('night-start.wav'),0);await continueReport(page);await heard('night-start.wav',1);
 await page.waitForFunction(()=>__ended.includes('night-start.wav'));await page.waitForTimeout(500);assert.equal(await count('night-start.wav'),1);await click('SETTINGS');await click('DONE');assert.equal(await count('night-start.wav'),1);assert.ok(await page.evaluate(()=>__activePhase.size===0&&__players.every(p=>p.paused&&p.volume===0)));
 report.checks.push('CONTINUE triggers offline native night 1 sound, not intro entry; completes once without loop or Settings restart');
 let wolf;const villagers=[];
 for(let i=0;i<4;i++){const name=await page.locator('.player-pass h2').textContent();await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();if(await page.locator('.action h2').textContent()==='Werewolf')wolf=name;else villagers.push(name);await click('SKIP');}
 assert.equal(await count('meeting-start.wav'),0);await continueReport(page);await heard('meeting-start.wav',1);await page.waitForFunction(()=>__ended.includes('meeting-start.wav'));await page.waitForTimeout(1100);assert.equal(await count('meeting-start.wav'),1);assert.ok(await page.evaluate(()=>__activePhase.size===0&&__players.every(p=>p.paused&&p.volume===0)));
 report.checks.push('meeting sound begins at discussion, never during morning/private cards; finishes once despite timer rerenders');
 await click('END DISCUSSION →');for(let i=0;i<4;i++)await click('SKIP VOTE');await continueReport(page);await page.getByRole('heading',{name:'NIGHT 2 STARTED',exact:true}).waitFor();assert.equal(await count('night-start.wav'),1);await continueReport(page);await heard('night-start.wav',2);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(await page.evaluate(()=>__activePhase.size===0&&__players.every(p=>p.paused&&p.volume===0)));await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(300);assert.equal(await count('night-start.wav'),2);
 report.checks.push('night 2 also waits for CONTINUE; hiding stops playback without a return replay');
 const select=async name=>page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:name})}).click();
 for(let i=0;i<4;i++){await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();if(await page.locator('.action h2').textContent()==='Werewolf'){await select(villagers[0]);await click('COMPLETE ACTION');}else await click('SKIP');}
 await continueReport(page);await heard('meeting-start.wav',2);await click('SETTINGS');await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();assert.ok(await page.evaluate(()=>__activePhase.size===0&&__players.every(p=>p.paused&&p.volume===0)));await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();await click('DONE');await page.waitForTimeout(400);assert.equal(await count('meeting-start.wav'),2);
 report.checks.push('each discussion gets one meeting sound; Button sounds mute stops it and unmute does not replay it');
 await click('END DISCUSSION →');for(let i=0;i<3;i++){if(await page.locator('.voter-name').textContent()===wolf)await click('SKIP VOTE');else{await select(wolf);await click('VOTE');}}await continueReport(page);await page.getByRole('heading',{name:'VILLAGE WINS',exact:true}).waitFor();await click('START AGAIN');await page.getByRole('heading',{name:'NIGHT 1 STARTED',exact:true}).waitFor();assert.equal(await count('night-start.wav'),2);
 report.plays=await page.evaluate(()=>__plays.filter(p=>['night-start.wav','meeting-start.wav'].includes(p.file)));assert.ok(report.plays.every(p=>!p.loop&&p.native&&p.volume>0));assert.ok(report.plays.every(p=>p.latencyMs>=0&&p.latencyMs<150));assert.equal(report.plays.filter(p=>p.file==='night-start.wav').length,2);assert.equal(report.plays.filter(p=>p.file==='meeting-start.wav').length,2);assert.ok(await page.evaluate(()=>__plays.every(p=>!p.file.startsWith('music-')&&p.file!=='cues-rooster.wav'&&!p.loop)));
 report.checks.push('replay starts its new night once; no ambient/background loops or animal sounds');
 await page.reload({waitUntil:'load'});await click('RESUME SAVED MATCH');const gate=page.getByRole('button',{name:'SHOW SAVED TURN',exact:true});if(await gate.count())await gate.click();await page.getByRole('heading',{name:'NIGHT 1 STARTED',exact:true}).waitFor();await page.waitForTimeout(600);assert.equal(await count('night-start.wav'),0);assert.equal(await count('meeting-start.wav'),0);await continueReport(page);await heard('night-start.wav',1);report.checks.push('replay/recovered night intro stays quiet until CONTINUE; then its new night sound plays once');
 assert.deepEqual(report.errors,[]);await writeFile(output+'/results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
