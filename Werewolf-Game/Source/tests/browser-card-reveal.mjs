// Real production Web Audio, native decode/start instrumentation; not physical-device certification.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/';
const output=process.env.RESULT_SCREENSHOT_DIR||'.cache/card-reveal-browser';await mkdir(output,{recursive:true});
const revealCatalog=JSON.parse(await readFile('src/card-reveal-catalog.json','utf8'));
const files=revealCatalog.clips.map(c=>c.file);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],starts:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  if(!localStorage.getItem('werewolf.names')){
   localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo','Finn','Zoe']));
   localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:false,haptics:true,firstNightSafe:true}));
   localStorage.setItem('werewolf.morning-death.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.game-end.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.voted-out.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:65}));
  }
  window.__decoded=0;window.__durations=[];window.__starts=[];window.__nodes=[];window.__oscillators=0;window.__clicks=[];window.__vibrations=[];window.__media=[];
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:n=>{__vibrations.push(n);return true;}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-card-reveal]'))__clicks.push(performance.now());},true);
  const AC=AudioContext;window.AudioContext=class extends AC{
   async decodeAudioData(bytes){const buffer=await super.decodeAudioData(bytes);buffer.__revealIndex=++window.__decoded;window.__durations.push(buffer.duration);return buffer;}
   createOscillator(){window.__oscillators++;return super.createOscillator();}
   createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);source.start=(...args)=>{__starts.push({time:performance.now(),click:__clicks.at(-1),buffer:source.buffer?.__revealIndex,duration:source.buffer?.duration});return start(...args);};source.stop=(...args)=>{source.__stopped=true;return stop(...args);};source.addEventListener('ended',()=>source.__ended=true);__nodes.push(source);return source;}
  };
  const A=Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p);p.play=()=>{if(p.volume>0)__media.push(p.src);return play();};return p;};window.Audio.prototype=A.prototype;
 });
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 assert.equal(await page.evaluate(async files=>{const cache=await caches.open((await caches.keys())[0]);return (await Promise.all(files.map(f=>cache.match(new URL(f,location.href).href)))).filter(Boolean).length;},files),14);
 report.checks.push('all 14 processed reveal files present in installed offline cache');
 // Entire match and native decoding below are offline, after an offline reload.
 await context.setOffline(true);await page.reload({waitUntil:'load'});
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();const dialog=page.getByRole('dialog',{name:'SETTINGS',exact:true});
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.equal(await dialog.getByLabel('Button sounds',{exact:true}).isChecked(),false);assert.equal(await dialog.getByLabel('Card reveal sounds',{exact:true}).isChecked(),true);
 await page.screenshot({path:output+'/card-reveal-settings.png',fullPage:true});await dialog.getByRole('button',{name:'DONE',exact:true}).click();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const role of ['Werewolf','Villager','Villager','Villager','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
 await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 const roles=[];
 for(let i=0;i<6;i++){
  let peer=null;if(i===5){peer=await context.newPage();peer.on('pageerror',e=>report.errors.push(e.message));await peer.goto(base,{waitUntil:'load'});await peer.getByRole('button',{name:'SETTINGS',exact:true}).waitFor();}
  const before=await page.evaluate(()=>__starts.length);
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  if(i===5){
   await peer.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>__starts.length),before);await peer.close();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__starts.length),before);report.checks.push('cooperating second tab audio-focus claim cancels pending reveal, no stale replay');
  }else if(i===2){
   // Synthetic visibility event exercises production cancellation, not actual OS background behavior.
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),before);
   await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__starts.length),before);
   report.checks.push('pending reveal cancelled on visibility loss; no replay after return');
  }else if(i===3){
   await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),before);
   await dialog.getByRole('button',{name:'DONE',exact:true}).click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__starts.length),before);
   report.checks.push('opening Settings cancels pending reveal; closing does not replay');
  }else{
   await page.waitForFunction(n=>__starts.length===n+1,before);const entry=await page.evaluate(()=>__starts.at(-1));
   assert.ok(entry.time-entry.click>=245&&entry.time-entry.click<=350,JSON.stringify(entry));assert.ok(entry.duration<=4);
   if(report.starts.length)assert.notEqual(entry.buffer,report.starts.at(-1).buffer);report.starts.push(entry);
   assert.equal(await page.evaluate(()=>__oscillators),0,'reveal played an immediate tap');
   assert.ok(await page.evaluate(()=>__nodes.filter(n=>!n.__ended&&!n.__stopped).length<=1));
   if(i===0){await page.getByRole('button',{name:'SETTINGS',exact:true}).click();assert.ok(await page.evaluate(()=>__nodes.every(n=>n.__ended||n.__stopped)));await dialog.getByRole('button',{name:'DONE',exact:true}).click();}
  }
  while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
  roles.push(await page.locator('.action h2').textContent());await page.getByRole('button',{name:'SKIP',exact:true}).click();
  assert.ok(await page.evaluate(()=>__nodes.every(n=>n.__ended||n.__stopped)));
 }
 assert.equal(await page.evaluate(()=>__decoded),14);
 const decoded=(await page.evaluate(()=>__durations)).sort((a,b)=>a-b),expected=revealCatalog.clips.map(c=>c.seconds).sort((a,b)=>a-b);
 decoded.forEach((seconds,i)=>assert.ok(Math.abs(seconds-expected[i])<.0001));assert.ok(Math.abs(Math.max(...decoded)-4)<.0001);
 report.checks.push('actual offline PCM decode matches all original-or-4s durations; no padding; current versioned assets');
 assert.deepEqual(roles.sort(),['Villager','Villager','Villager','Villager','Villager','Werewolf']);assert.ok(await page.evaluate(()=>__vibrations.some(n=>n>0)));
 assert.equal(await page.evaluate(()=>__media.length),0);report.checks.push('native offline decode of all 14, 3 nonrepeating 250ms starts, haptics retained, no immediate tap, works with other effects disabled, no overlapping sources');
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await dialog.getByRole('button',{name:'TURN ALL OFF',exact:true}).click();
 assert.equal(await dialog.getByLabel('Card reveal sounds',{exact:true}).isChecked(),false);await dialog.getByRole('button',{name:'DONE',exact:true}).click();await page.reload({waitUntil:'load'});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.card-reveal.v1'))),{enabled:false,volume:65});assert.equal(await page.evaluate(()=>__starts.length),0);
 assert.deepEqual(report.errors,[]);report.checks.push('independent settings at 320/390/768px, TURN ALL OFF and deliberate reveal mute persist after offline reload');
 await writeFile(output+'/results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
