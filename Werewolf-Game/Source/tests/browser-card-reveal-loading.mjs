// Cold production-page tests: no service worker cache, no wait-for-all-clips workaround.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {continueReport} from './helpers/report-controls.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/latest-preview.html';
const output=process.env.RESULT_SCREENSHOT_DIR||'.cache/reveal-loading-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],errors:[],starts:[]};
function seed(){
 localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));
 localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:false,haptics:true,firstNightSafe:true}));
 localStorage.setItem('werewolf.morning-death.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.game-end.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.voted-out.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:75}));
 window.__decoded=0;window.__starts=[];window.__clicks=[];window.__allowResume=false;
 Object.defineProperty(navigator,'vibrate',{configurable:true,value:()=>true});
 document.addEventListener('click',event=>{if(event.target.closest('[data-card-reveal]'))__clicks.push(performance.now());},true);
 const C=AudioContext;window.AudioContext=class extends C{
  async decodeAudioData(bytes){const buffer=await super.decodeAudioData(bytes);buffer.__index=++__decoded;return buffer;}
  createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{__starts.push({at:performance.now(),click:__clicks.at(-1),buffer:source.buffer.__index,decoded:__decoded});return start(...args);};return source;}
 };
}
async function enter(page){
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const role of ['Werewolf','Villager','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
 await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
}
async function fresh(){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.addInitScript(seed);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));return {context,page};
}
async function played(page,count){
 await page.waitForFunction(n=>__starts.length===n,count);const start=await page.evaluate(()=>__starts.at(-1));assert.ok(start.at-start.click>=245&&start.at-start.click<=350,JSON.stringify(start));report.starts.push(start);return start;
}
try{
 // Nothing ready: report loading, do not accept a silently muted normal reveal;
 // explicit no-sound progress remains possible and readiness completion never replays.
 {
  const {context,page}=await fresh();let release;const held=new Promise(r=>release=r);let requests=0;
  await context.route('**/werewolf/audio/card-reveal/**',async route=>{requests++;await held;await route.continue();});
  await page.goto(base,{waitUntil:'load'});await page.getByRole('button',{name:'START GAME',exact:true}).waitFor();
  assert.ok(requests>0,'preload must start at home, not only on handoff');await enter(page);
  assert.equal(await page.evaluate(()=>__decoded),0);assert.ok(await page.getByRole('button',{name:/SHOW YOUR ROLE/}).isDisabled());assert.match(await page.getByRole('status').textContent(),/sounds are loading/);
  await page.setViewportSize({width:320,height:568});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:output+'/loading-320.png',fullPage:true});
  await page.getByRole('button',{name:'SHOW ROLE WITHOUT SOUND',exact:true}).click();assert.equal(await page.locator('.action').count(),1);
  release();await page.waitForFunction(()=>__decoded>0);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),0);assert.equal(await page.locator('.action').count(),1);
  report.checks.push('cold/mobile: menu preloads; zero-ready normal reveal disabled with clear status; explicit no-sound progress; no automatic/late replay when loading completes');await context.close();
 }
 // Exactly one clip ready, 13 held: first reveal must play at 250ms. Selection
 // cannot pick an unloaded URL. No immediate repeat until a different clip loads.
 {
  const {context,page}=await fresh();let release;const held=new Promise(r=>release=r);
  await context.route('**/werewolf/audio/card-reveal/**',async route=>{if(!route.request().url().endsWith('reveal-07.wav'))await held;await route.continue();});
  await page.goto(base,{waitUntil:'load'});await enter(page);
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();const first=await played(page,1);assert.equal(first.decoded,1);
  await page.getByRole('button',{name:'SKIP',exact:true}).click();assert.ok(await page.getByRole('button',{name:/SHOW YOUR ROLE/}).isDisabled());assert.match(await page.getByRole('status').textContent(),/sounds are loading/);
  release();await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();const second=await played(page,2);assert.notEqual(second.buffer,first.buffer);
  report.checks.push('partial cold load: one decoded clip plays at 250ms while 13 remain held; waits for a different clip rather than repeating; next explicit reveal plays normally');await context.close();
 }
 // All downloads fail: user-visible recovery and direct-gesture retry, no secret
 // state loss and no implicit replay of a failed request.
 {
  const {context,page}=await fresh();let fail=true;
  await context.route('**/werewolf/audio/card-reveal/**',route=>fail?route.abort():route.continue());await page.goto(base,{waitUntil:'load'});await enter(page);
  const retry=page.getByRole('button',{name:'RETRY REVEAL SOUND',exact:true});await retry.waitFor();assert.match(await page.getByRole('status').textContent(),/could not load/);assert.ok(await page.getByRole('button',{name:/SHOW YOUR ROLE/}).isDisabled());
  fail=false;await retry.click();await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await played(page,1);
  report.checks.push('failed downloads are explicit; retry recovers, preserves handoff and plays only after a new SHOW YOUR ROLE press');await context.close();
 }
 // Simulated browser autoplay rejection. Real PCM decoding remains native.
 {
  const {context,page}=await fresh();await context.addInitScript(()=>{
   const C=AudioContext;window.AudioContext=class extends C{get state(){return window.__allowResume?super.state:'suspended';}resume(){return window.__allowResume?super.resume():Promise.reject(Error('simulated browser policy'));}};
  });
  await page.goto(base,{waitUntil:'load'});await enter(page);await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  await page.getByText(/browser did not enable reveal audio/).waitFor();assert.equal(await page.evaluate(()=>__starts.length),0);assert.equal(await page.locator('.action').count(),0);
  await page.evaluate(()=>{__allowResume=true;});await page.getByRole('button',{name:'RETRY REVEAL SOUND',exact:true}).click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),0);
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await played(page,1);
  await page.getByRole('button',{name:'SKIP',exact:true}).click();
  // Also exercise rejection after the click has already revealed the private card.
  await page.evaluate(()=>{__allowResume=false;});await page.getByRole('button',{name:/SHOW YOUR ROLE/}).evaluate(el=>el.click());
  await page.getByText(/browser did not enable reveal audio/).waitFor();assert.equal(await page.locator('.action').count(),1);assert.equal(await page.evaluate(()=>__starts.length),1);
  await page.evaluate(()=>{__allowResume=true;});await page.getByRole('button',{name:'RETRY REVEAL SOUND',exact:true}).click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),1);
  await page.getByRole('button',{name:'SKIP',exact:true}).click();await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await played(page,2);
  report.checks.push('simulated autoplay rejection is explicit on handoff and after a reveal; gesture retry unlocks without stale replay or skipped turns; next explicit reveal plays');await context.close();
 }
 assert.deepEqual(report.errors,[]);await writeFile(output+'/results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
