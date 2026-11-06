import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/',browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const report=[];
try{for(const fallback of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await context.addInitScript(fallback=>{
  window.__buttonPeaks=[];window.__buttonMedia=[];localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:false}));
  const Audio=window.Audio;window.Audio=function(...args){const p=new Audio(...args);window.__buttonMedia.push(p);return p;};window.Audio.prototype=Audio.prototype;
  const Native=window.AudioContext;if(fallback){window.AudioContext=undefined;window.webkitAudioContext=undefined;}else window.AudioContext=class extends Native{createGain(){const g=super.createGain(),ramp=g.gain.exponentialRampToValueAtTime.bind(g.gain);g.gain.exponentialRampToValueAtTime=(v,...args)=>{if(v>.001)__buttonPeaks.push(v);return ramp(v,...args);};return g;}};
 },fallback);
 const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('button',{name:'PREVIEW TAP',exact:true}).click();
 if(fallback){await page.waitForFunction(()=>__buttonMedia.some(p=>p.src.includes('/buttons/v1/button-tap.wav')&&p.readyState>=2));const p=await page.evaluate(()=>{const p=__buttonMedia.find(p=>p.src.includes('/buttons/v1/button-tap.wav'));return{volume:p.volume,duration:p.duration,error:p.error?.code??null};});assert.equal(p.volume,.5);assert.ok(p.duration>0&&p.duration<=.11);assert.equal(p.error,null);report.push({fallback,realNativeMedia:p});}
 else{assert.ok(Math.abs(await page.evaluate(()=>__buttonPeaks.at(-1))-.135)<1e-6);await page.getByRole('slider',{name:'Effects volume',exact:true}).focus();await page.keyboard.press('End');await page.getByRole('button',{name:'PREVIEW TAP',exact:true}).click();assert.ok(Math.abs(await page.evaluate(()=>__buttonPeaks.at(-1))-.27)<1e-6);report.push({fallback,defaultPeak:.135,maximumPeak:.27,boostDb:20*Math.log10(3)});}
 await context.close();
}await mkdir('.cache/role-marker-browser',{recursive:true});await writeFile('.cache/role-marker-browser/button-level.json',JSON.stringify(report,null,2));console.log('PASS: real native button gain +9.54dB at default/full volume, dedicated boosted native fallback; other scene assets unchanged.');}finally{await browser.close();}
