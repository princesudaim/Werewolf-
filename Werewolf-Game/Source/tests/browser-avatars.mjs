// Exact original avatars, saved-profile/recovery compatibility, layout and offline checks.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {inspectRecovery,makeCheckpoint,writeRecovery} from '../src/match-recovery.ts';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/';
const fixture=JSON.parse(await readFile(new URL('./fixtures/avatar-original-hashes.json',import.meta.url),'utf8'));
const names=['Ava','Noah','Mila','Leo','Ivy','Omar','Zoe','Ezra'];
const legacy=['player1.webp','player2.webp','player3.webp','player4.webp','player5.webp','player7.webp','player8.webp','player9.webp'];
const avatars=Object.fromEntries(names.map((name,i)=>[name.toLowerCase(),'./werewolf/avatars/'+legacy[i]]));
const expected=Object.fromEntries(Object.entries(avatars).map(([name,path])=>[name,fixture.replacements.find(i=>i.old===path)?.path||path]));
const sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.addInitScript(({names,avatars})=>{
  if(!localStorage.getItem('avatar-original-test')){
   localStorage.setItem('avatar-original-test','1');localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.avatars.v1',JSON.stringify(avatars));
   localStorage.setItem('werewolf.library.v1',JSON.stringify([{name:'Sam',avatar:'./werewolf/avatars/player9.webp'}]));
   localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false,firstNightSafe:true}));
   localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:false,volume:0}));
  }
 },{names,avatars});
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 for(const i of fixture.replacements){const r=await page.request.get(new URL(i.path,base).href);assert.equal(r.status(),200);assert.equal(sha(await r.body()),i.sha256);const old=await page.request.get(new URL(i.old,base).href);assert.equal(old.status(),404);}
 checks.push('all seven HTTP photos match original attachment SHA-256; all seven removed files return 404');
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Save this match for recovery'}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await page.getByRole('button',{name:'DONE',exact:true}).click();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
 for(let i=0;i<names.length;i++)assert.equal(await page.getByRole('button',{name:'Edit '+names[i],exact:true}).locator('img').getAttribute('src'),expected[names[i].toLowerCase()]);
 await page.getByRole('button',{name:'PLAYER LIBRARY',exact:true}).click();assert.equal(await page.locator('.library-select').filter({hasText:'Sam'}).locator('img').getAttribute('src'),fixture.replacements.at(-1).path);await page.getByRole('button',{name:'Go back',exact:true}).click();
 checks.push('all eight saved roster portraits and a saved library-only player resolve correctly, including untouched number four');
 async function openPicker(){await page.getByRole('button',{name:'Edit Ava',exact:true}).click();await page.getByRole('button',{name:'Choose or change game avatar',exact:true}).click();await page.getByRole('button',{name:/Game avatars/}).click();await page.getByRole('dialog',{name:'Game avatars',exact:true}).waitFor();}
 await openPicker();
 assert.equal(await page.locator('.avatar-grid button').count(),19);
 for(const i of fixture.replacements)assert.equal(await page.getByRole('button',{name:'Choose avatar '+i.position,exact:true}).locator('img').getAttribute('src'),i.path);
 await page.waitForFunction(()=>[...document.querySelectorAll('.avatar-grid img')].every(i=>i.complete&&i.naturalWidth>0));
 for(const [width,height,font]of [[390,844,16],[320,640,16],[844,390,16],[320,700,32]]){
  await page.setViewportSize({width,height});await page.evaluate(f=>document.documentElement.style.fontSize=f+'px',font);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('.picker-inner').scrollWidth<=document.querySelector('.picker-inner').clientWidth+1));
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='16px');await mkdir('.cache/avatars',{recursive:true});await page.screenshot({path:'.cache/avatars/picker.png'});
 await page.getByRole('button',{name:'Close avatar selection',exact:true}).click();await page.getByRole('button',{name:'SAVE PLAYER',exact:true}).click();
 for(const i of fixture.replacements){await openPicker();await page.getByRole('button',{name:'Choose avatar '+i.position,exact:true}).click();await page.getByRole('button',{name:'SAVE PLAYER',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.avatars.v1')));assert.equal(saved.ava,i.path);assert.equal(new Set(Object.values(saved).filter(Boolean)).size,Object.values(saved).filter(Boolean).length);}
 checks.push('all 19 picker photos decode; exact slot labels; no overflow at 320px, landscape or 200% text; all seven select/save without duplicate assignments');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Save this match for recovery'}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await page.getByRole('button',{name:'DONE',exact:true}).click();await page.getByRole('button',{name:'START GAME',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Edit Ava',exact:true}).locator('img').getAttribute('src'),fixture.replacements.at(-1).path);
 await page.getByRole('button',{name:/CHOOSE ROLES/}).click();await page.getByRole('button',{name:'Add Werewolf',exact:true}).click();for(let i=0;i<7;i++)await page.getByRole('button',{name:'Add Villager',exact:true}).click();await page.getByRole('button',{name:/START GAME/}).click();await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();await page.locator('.player-pass').waitFor();
 const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),key=Object.keys(stored).find(k=>k.startsWith('werewolf.match-recovery.v1:')&&!k.endsWith(':commit'));assert.ok(key);
 const inspection=inspectRecovery({getItem:k=>stored[k]??null},key,'werewolf-match-1',()=>true);assert.equal(inspection.status,'ready');const previous=inspection.checkpoint,payload=structuredClone(previous.payload);payload.state.avatars=avatars;
 const checkpoint=makeCheckpoint(payload,'werewolf-match-1',previous.matchId,Date.now(),previous),data={};assert.equal(writeRecovery({getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},key,checkpoint,()=>true).ok,true);
 await page.evaluate(data=>{for(const [k,v]of Object.entries(data))localStorage.setItem(k,v);},data);
 async function resume(){await page.getByRole('button',{name:'RESUME SAVED MATCH',exact:true}).click();if(await page.getByRole('button',{name:'SHOW SAVED TURN',exact:true}).count())await page.getByRole('button',{name:'SHOW SAVED TURN',exact:true}).click();await page.locator('.player-pass').waitFor();const name=await page.locator('.player-pass h2').textContent();assert.equal(await page.locator('.pass-avatar img').getAttribute('src'),expected[name.toLowerCase()]);await page.waitForFunction(()=>document.querySelector('.pass-avatar img')?.naturalWidth>0);}
 await page.reload({waitUntil:'networkidle'});await resume();checks.push('a valid older active-match checkpoint with removed legacy paths resumes with the corresponding new photo, not a broken image');
 const all=[...fixture.replacements.map(i=>({path:i.path,sha256:i.sha256})),...Object.entries(fixture.preserved).map(([path,sha256])=>({path:'./'+path,sha256}))];
 const hashes=await page.evaluate(async all=>{const keys=await caches.keys();const out=[];for(const i of all){let response;for(const key of keys){const c=await caches.open(key);response=await c.match(new URL(i.path,location.href));if(response)break;}if(!response)throw Error('Missing '+i.path);const b=await response.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');out.push(hash);}return out;},all);
 assert.deepEqual(hashes,all.map(i=>i.sha256));await context.setOffline(true);await page.reload({waitUntil:'load'});await resume();
 checks.push('all 19 offline cache hashes match; offline reload/resume loads the original photo successfully');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await writeFile('.cache/avatars/browser-'+(new URL(base).pathname==='/'?'root':'subpath')+'.json',JSON.stringify({base,checks,errors,failed},null,2));console.log('PASS avatar originals: '+checks.join('; '));
}finally{await browser.close();}
