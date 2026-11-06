import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
const withPhase=process.env.WITH_PHASE_AUDIO==='1';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(withPhase=>{
  localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:withPhase,haptics:false,firstNightSafe:true}));localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:65}));
  const files=new WeakMap(),buffers=new WeakMap(),phaseBuffers=new WeakSet(),fetchOriginal=fetch;window.__phaseSources=[];window.__sources=[];window.__roleDecoded=0;
  window.fetch=async(...args)=>{const response=await fetchOriginal(...args),url=String(args[0]);if(url.includes('card-reveal/')){const array=response.arrayBuffer.bind(response);response.arrayBuffer=async()=>{const bytes=await array();files.set(bytes,url);return bytes;};}return response;};
  const C=AudioContext;window.AudioContext=class extends C{
   async decodeAudioData(bytes){const isPhase=[673240,599680].includes(bytes.byteLength);const b=await super.decodeAudioData(bytes);if(isPhase)phaseBuffers.add(b);if(files.has(bytes)){buffers.set(b,files.get(bytes));__roleDecoded++;}return b;}
   createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);let event;s.start=(...args)=>{if(phaseBuffers.has(s.buffer)){event={phase:true,stopped:false,ended:false};__phaseSources.push(event);s.addEventListener('ended',()=>event.ended=true);}if(buffers.has(s.buffer)){event={file:buffers.get(s.buffer),stopped:false,ended:false};__sources.push(event);s.addEventListener('ended',()=>event.ended=true);}return start(...args);};s.stop=(...args)=>{if(event)event.stopped=true;return stop(...args);};return s;}
  };
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BASE_URL||'http://127.0.0.1:3009/',{waitUntil:'networkidle'});await page.waitForFunction(()=>__roleDecoded===14);const click=name=>page.getByRole('button',{name,exact:true}).click();await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Raven','Seer','Gambler'])await click('Add '+role);await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);let popups=0,seerResult=false;
 for(let i=0;i<4;i++){
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();const role=await page.locator('.action h2').textContent(),info=page.getByRole('button',{name:'OK · HIDE INFO',exact:true});
  if(await info.count()){
   if(popups===0)await info.click(); // Dismiss before the 250ms deadline.
   await page.waitForFunction(n=>__sources.length===n,i+1);
   if(popups!==0)await info.click(); // Dismiss during actual playback.
   popups++;await page.waitForTimeout(40);assert.equal(await page.evaluate(()=>__sources.at(-1).stopped),false,'OK must not cancel the same turn sound');
  }else await page.waitForFunction(n=>__sources.length===n,i+1);
  if(withPhase)assert.ok(await page.evaluate(()=>__phaseSources.every(p=>p.stopped||p.ended)),'night cue cannot overlap the private reveal');
  if(role==='Seer'){
   await page.locator('.target:not(:disabled)').first().click();await click('COMPLETE ACTION');await page.getByRole('button',{name:'OK · HIDE RESULT',exact:true}).waitFor();assert.equal(await page.evaluate(()=>__sources.at(-1).stopped),false,'private result popup must preserve same-turn audio');seerResult=true;
  }
  await page.waitForFunction(()=>__sources.at(-1).ended);assert.equal(await page.evaluate(()=>__sources.at(-1).stopped),false,'sound must reach its natural end');
  if(role==='Seer')await click('OK · HIDE RESULT');else if(role==='Raven'){await page.locator('.target:not(:disabled)').first().click();await click('COMPLETE ACTION');}else if(role==='Gambler')await click('SKIP BET');else await click('SKIP');
 }
 if(withPhase)assert.equal(await page.evaluate(()=>__phaseSources.length),1);assert.equal(popups,2);assert.ok(seerResult);assert.deepEqual(errors,[]);console.log('PASS: mobile/touch ('+(withPhase?'phase sound ON':'buttons muted')+'): Raven/Gambler info OK before and during reveal audio, Seer private-result popup, all four native clips naturally finish; no cancelled sources or runtime errors.');
}finally{await browser.close();}
