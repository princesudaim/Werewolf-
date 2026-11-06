import {continueReport} from './helpers/report-controls.mjs';
// CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-smart-descriptions-batch7.mjs
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {deal,roles,disguiseMadmanCards} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';
await mkdir(output,{recursive:true});
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function firstRoleSeed(names,counts,role){
  const original=Math.random;
  try{for(let i=1;i<1000;i++){
    const seed=Math.imul(i,2654435761)>>>0;Math.random=random(seed);
    const dealt=deal(names,counts);if(dealt[0].role===role)return {seed,apparent:disguiseMadmanCards(dealt).players[0].role};
  }}finally{Math.random=original;}
  throw new Error('No matching seed');
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];let checked=0;
try{
  for(const role of ['charmer','gambler','mindflayer','intelligence','madman'])for(const [enabled,wait] of [[false,0],[true,0],[true,15]]){
    const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts[role]=1;counts.werewolf=1;counts.villager=3;
    const names=['Ava','Noah','Mila','Leo','Finn'];const {seed,apparent}=firstRoleSeed(names,counts,role);
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({names,enabled,wait,role})=>{
      localStorage.setItem('werewolf.names',JSON.stringify(names));
      localStorage.setItem('werewolf.settings',JSON.stringify({charmerMessages:enabled,charmerFirstNight:enabled?2:1,gamblerPredictions:3,gamblerBetProtection:enabled,mindStartingParasites:enabled?1:3,mindRegenPercent:enabled?100:0,intelligenceInterval:enabled?1:2,roleWaitSeconds:{[role]:wait},sounds:false,buttonSounds:false,haptics:false}));
      localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
    },{names,enabled,wait,role});
    if(process.env.TEXT_SCALE)await page.addInitScript(scale=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*scale+'px';}),Number(process.env.TEXT_SCALE));
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'START GAME',exact:true}).click();
    await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
    for(const [id,count]of Object.entries(counts))for(let i=0;i<count;i++)await page.getByRole('button',{name:'Add '+roles[id].name,exact:true}).click();
    if(role==='madman'){
      await page.getByRole('button',{name:'View Madman details',exact:true}).click();
      const reference=await page.locator('#role-details-description').innerText();
      assert.ok(descriptionFits(reference));assert.match(reference,/different village role/);assert.match(reference,/when the game ends/);assert.doesNotMatch(reference,/Wait 15/);
      await page.getByRole('button',{name:'Close role details',exact:true}).click();
    }
    await page.evaluate(seed=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},seed);
    await page.getByRole('button',{name:/START GAME/}).click();
    await continueReport(page);
    await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
    while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
    assert.equal(await page.locator('.action h2').textContent(),roles[apparent].name);
    const text=await page.locator('.panel.description > p').innerText();
    assert.ok(descriptionFits(text));assert.doesNotMatch(text,/Wolf Pup|Hypnotizer|Infecting|different village role|Madman/);
    if(wait && role!=='madman')assert.match(text,/Wait 15 seconds/);
    if(role==='charmer'){
      assert.match(text,enabled?/Wait until night 2/:/Choose your 1 friend/);
      if(enabled)assert.doesNotMatch(text,/Send 1|Messages arrive/);else assert.match(text,/Private messages are off/);
    }
    if(role==='gambler'){
      assert.match(text,/Get 3 more correct guesses/);assert.match(text,/die tonight or are voted out tomorrow/);
      assert.match(text,enabled?/A bet saves you from attacks/:/A bet does not save you from attacks/);
      assert.doesNotMatch(text,/Doctor|revived/);
    }
    if(role==='mindflayer'){
      assert.match(text,enabled?/1 tiny creature left/:/3 tiny creatures left/);
      assert.match(text,enabled?/Skip to get 1 more/:/Skipping gives no new creatures/);
    }
    if(role==='intelligence')assert.match(text,enabled?/Get names tonight/:/No report tonight/);
    if(role==='madman')assert.notEqual(apparent,'madman');
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'horizontal overflow');
    }
    if(role==='gambler' && enabled && !wait)await page.screenshot({path:output+'/smart-gambler-batch7.png',fullPage:true});
    checked++;await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(`Browser batch 7 passed: ${checked} actual private-role cards, five roles, both settings modes plus role waits, limits, own stock, configured timing, public Madman reference and private disguise privacy, 320/390px layouts and no runtime errors.`);
}finally{await browser.close();}
