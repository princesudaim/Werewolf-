import {continueReport} from './helpers/report-controls.mjs';
// Production-browser checks; real-device sound/haptic feel still needs human verification.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const names=['Ava','Noah','Mila','Leo','Finn'];
  localStorage.setItem('werewolf.names',JSON.stringify(names));if(!localStorage.getItem('werewolf.settings'))localStorage.setItem('werewolf.settings',JSON.stringify({sounds:true,buttonSounds:true,haptics:true,firstNightSafe:true}));
  localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
  window.__media=[];window.__notes=[];window.__vibrations=[];
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:n=>{window.__vibrations.push(n);return true;}});
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const p=new NativeAudio(...args);window.__media.push(p);return p;};window.Audio.prototype=NativeAudio.prototype;
  const NativeContext=window.AudioContext;
  if(NativeContext)window.AudioContext=class extends NativeContext{
   createOscillator(){const o=super.createOscillator(),set=o.frequency.setValueAtTime.bind(o.frequency),start=o.start.bind(o);let frequency;
    o.frequency.setValueAtTime=(value,...args)=>{frequency=value;return set(value,...args);};
    o.start=(...args)=>{window.__notes.push({frequency,scope:document.querySelector('main')?.dataset.feedbackScope});return start(...args);};return o;
   }
  };
 });
 await page.goto(base,{waitUntil:'networkidle'});
 const opener=page.getByRole('button',{name:'SETTINGS',exact:true});await opener.click();
 const dialog=page.getByRole('dialog',{name:'SETTINGS',exact:true});
 assert.ok(await dialog.isVisible());assert.ok(await dialog.getByRole('button',{name:'Close settings'}).evaluate(el=>el===document.activeElement));
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'dialog overflow');
 }
 await page.setViewportSize({width:320,height:844});
 for(let i=0;i<20;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'focus escaped native modal');}
 async function range(name,value){await dialog.getByRole('slider',{name,exact:true}).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));}
 assert.equal(await dialog.getByRole('slider',{name:'Music volume',exact:true}).count(),0);await range('Effects volume',35);await dialog.getByLabel('Vibration feel',{exact:true}).selectOption('standard');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.feedback.v1'))),{ambienceVolume:45,effectsVolume:35,hapticIntensity:'standard'});
 const before=await page.evaluate(()=>({notes:__notes.length,vibrations:__vibrations.length}));await dialog.getByRole('button',{name:'PREVIEW TAP',exact:true}).click();
 await page.waitForFunction(n=>window.__notes.length===n+1,before.notes);
 assert.equal(await page.evaluate(()=>__vibrations.length),before.vibrations);
 const notes=await page.evaluate(()=>__notes.length);await dialog.getByRole('button',{name:'PREVIEW VIBRATION',exact:true}).click();
 assert.equal(await page.evaluate(()=>__notes.length),notes);assert.equal(await page.evaluate(()=>__vibrations.at(-1)),14);
 assert.equal(await dialog.getByRole('button',{name:'PREVIEW MUSIC',exact:true}).count(),0);
 await page.screenshot({path:output+'/sound-and-feel-320.png',fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.ok(await opener.evaluate(el=>el===document.activeElement));
 assert.ok(await page.evaluate(()=>__media.every(p=>!p.src.includes('/music-'))));
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const role of ['Werewolf','Doctor','Seer','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
 await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 const roles=[];
 for(let i=0;i<5;i++){
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
  const role=await page.locator('.action h2').innerText();roles.push(role);
  assert.equal(await page.locator('main').getAttribute('data-feedback-scope'),'private');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(i===0){
   const text=await page.locator('.panel.description > p').innerText();
   await page.getByRole('button',{name:'SETTINGS',exact:true}).click();assert.equal(await dialog.getByRole('slider',{name:'Effects volume',exact:true}).inputValue(),'35');
   await dialog.getByRole('button',{name:'DONE',exact:true}).click();assert.equal(await page.locator('.action h2').innerText(),role);assert.equal(await page.locator('.panel.description > p').innerText(),text);
  }
  if(role==='Doctor'||role==='Seer'){
   const button=page.getByRole('button',{name:'COMPLETE ACTION',exact:true});assert.ok(await button.isDisabled());
   const count=await page.evaluate(()=>__notes.length);await button.evaluate(el=>el.click());assert.equal(await page.evaluate(()=>__notes.length),count);
   await page.locator('button.target:not(:disabled)').first().click();await button.click();
   if(role==='Seer'){
    assert.ok(await page.getByRole('button',{name:'SETTINGS',exact:true}).isDisabled());await page.getByRole('button',{name:'OK · HIDE RESULT',exact:true}).click();
   }
  }else await page.getByRole('button',{name:'SKIP',exact:true}).click();
  assert.equal(await page.locator('.action').count(),0,'old private card survived the handoff');
 }
 assert.deepEqual(roles.sort(),['Doctor','Seer','Villager','Villager','Werewolf']);
 assert.ok(await page.getByText('No one was killed tonight.',{exact:true}).isVisible());
 assert.ok(await page.evaluate(()=>__media.every(p=>!p.src.endsWith('/cues-rooster.wav'))));assert.ok(await page.evaluate(()=>__media.every(p=>!p.src.includes('/music-'))));
 assert.ok(await page.evaluate(()=>__media.length<=3),'ambience created extra players');
 assert.ok(await page.evaluate(()=>__notes.filter(n=>n.scope==='private').every(n=>n.frequency===220)),'private feedback differed');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 assert.ok(await page.evaluate(()=>__media.every(p=>p.paused && p.volume===0)));
 await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
 await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
 assert.ok(await page.evaluate(()=>__media.every(p=>!p.src.includes('/music-'))));
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await dialog.getByRole('button',{name:'TURN ALL OFF',exact:true}).click();
 assert.ok(await page.evaluate(()=>__media.every(p=>p.paused && p.volume===0)));assert.equal(await dialog.getByRole('button',{name:'PREVIEW TAP',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>__vibrations.at(-1)),0);await dialog.getByRole('button',{name:'DONE',exact:true}).click();
 await page.reload({waitUntil:'networkidle'});await opener.click();assert.equal(await dialog.getByLabel('Background music',{exact:true}).count(),0);assert.equal(await dialog.getByRole('slider',{name:'Effects volume',exact:true}).inputValue(),'35');
 const unsupported=await browser.newPage({viewport:{width:320,height:700}});unsupported.on('pageerror',e=>errors.push(e.message));
 await unsupported.addInitScript(()=>{Object.defineProperty(navigator,'vibrate',{configurable:true,value:undefined});localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:true}));});
 await unsupported.goto(base,{waitUntil:'networkidle'});await unsupported.getByRole('button',{name:'SETTINGS',exact:true}).click();assert.ok(await unsupported.getByText(/This browser does not offer vibration/).isVisible());assert.ok(await unsupported.getByRole('button',{name:'PREVIEW VIBRATION',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);
 console.log('Production Sound & Feel passed: native modal/focus/Escape, 320/390/768px, separate volumes and persistence, single isolated previews, current private turn unchanged, identical private cues, immediate handoff removal, no background music and bounded effect reuse, synthetic background/mute silence, short voting effects and unsupported vibration. No runtime errors. Physical-device feel not certified.');
}finally{await browser.close();}
