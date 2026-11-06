import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
const catalog=JSON.parse(await readFile('src/audio-catalog.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('werewolf.names')){localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:true,buttonSounds:true,haptics:false,firstNightSafe:true}));}
  // Exercise local WAV fallback and scene cues with no Web Audio available; no background music exists.
  Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
  window.__plays=[];const A=Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p);p.play=()=>{window.__plays.push(p.src.split('/').pop());return play();};return p;};window.Audio.prototype=A.prototype;
 });
 const base=process.env.BASE_URL||'http://127.0.0.1:3009/';await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const files=[...Object.values(catalog.music),...Object.values(catalog.cues)].map(x=>x.file);
 assert.equal(await page.evaluate(async files=>{const keys=await caches.keys();const cache=await caches.open(keys[0]);return (await Promise.all(files.map(f=>cache.match(new URL(f,location.href).href)))).filter(Boolean).length;},files),28);
 await context.setOffline(true);await page.reload({waitUntil:'load'});
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Villager','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);let wolf;
 for(let i=0;i<4;i++){const name=await page.locator('.player-pass h2').textContent();await page.getByRole('button',{name:'SHOW ROLE WITHOUT SOUND',exact:true}).click();if(await page.locator('.action h2').textContent()==='Werewolf')wolf=name;await page.getByRole('button',{name:'SKIP',exact:true}).click();}
 assert.equal(await page.evaluate(()=>__plays.filter(x=>x==='cues-rooster.wav').length),0);
 await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
 for(let i=0;i<4;i++){if(await page.locator('.voter-name').textContent()===wolf)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();else{await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:wolf})}).click();await page.getByRole('button',{name:'VOTE',exact:true}).click();}}
 await continueReport(page);await page.getByRole('heading',{name:'VILLAGE WINS',exact:true}).waitFor();await page.waitForFunction(()=>__plays.some(x=>x.startsWith('game-end-')));
 assert.ok(await page.evaluate(()=>__plays.some(x=>x.startsWith('game-end-'))&&!__plays.includes('cues-mvp.wav')&&__plays.includes('cues-add.wav')&&!__plays.includes('cues-rooster.wav')&&!__plays.some(p=>p.startsWith('music-'))));assert.equal(await page.locator('.is-mvp').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS: all 28 effect assets cached; offline reload and complete village-win/MVP match without background music, silent morning (no rooster), short celebration, scene cues and WAV-only button fallback; no runtime errors.');
}finally{await browser.close();}
