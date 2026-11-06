import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
const fileMode=process.env.FILE_PHASE_AUDIO==='1';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await context.addInitScript(fileMode=>{
  if(!fileMode){Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});}
  localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:false,firstNightSafe:true,passiveWait:false,allRolesWait:false}));
  for(const key of ['card-reveal','voted-out','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));
  window.__phaseMedia=[];window.__phaseStarts=[];const A=Audio;
  window.Audio=function(...args){const p=new A(...args);__phaseMedia.push(p);p.addEventListener('playing',()=>{if(p.volume>0&&p.src.includes('/audio/phase/'))__phaseStarts.push({file:p.src.split('/').pop(),loop:p.loop,offset:p.currentTime,time:performance.now()});});return p;};window.Audio.prototype=A.prototype;
 },fileMode);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const click=name=>page.getByRole('button',{name,exact:true}).click();await page.goto(process.env.BASE_URL||'http://127.0.0.1:3009/',{waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>__phaseMedia.filter(p=>p.src.includes('/audio/phase/')&&p.readyState>=3).length),2);assert.equal(await page.evaluate(()=>__phaseStarts.length),0);
 await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Villager','Villager','Villager'])await click('Add '+role);await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);await page.waitForFunction(()=>__phaseStarts.length===1);await page.waitForFunction(()=>__phaseMedia.filter(p=>p.src.includes('/audio/phase/')).every(p=>p.paused&&p.volume===0));
 for(let i=0;i<4;i++){await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click('OK · HIDE INFO');await click('SKIP');}
 await continueReport(page);await page.waitForFunction(()=>__phaseStarts.length===2);await click('SETTINGS');await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();assert.equal(await page.evaluate(()=>__phaseMedia.filter(p=>p.src.includes('/audio/phase/')).every(p=>p.paused&&p.volume===0)),true);await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();await click('DONE');await page.waitForTimeout(300);const starts=await page.evaluate(()=>__phaseStarts);assert.deepEqual(starts.map(p=>p.file),['night-start.wav','meeting-start.wav']);assert.ok(starts.every(p=>!p.loop));assert.deepEqual(errors,[]);console.log('PASS native HTML fallback: both files prebuffer silently, night and meeting play once, mute cancels and unmute does not replay.',JSON.stringify(starts));await context.close();
}finally{await browser.close();}
