import {continueReport} from './helpers/report-controls.mjs';
// CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-smart-descriptions-batch5.mjs
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {deal,roles} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';
await mkdir(output,{recursive:true});
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function firstRoleSeed(names,counts,role){
  const original=Math.random;
  try{for(let i=1;i<1000;i++){
    const seed=Math.imul(i,2654435761)>>>0;Math.random=random(seed);
    if(deal(names,counts)[0].role===role)return seed;
  }}finally{Math.random=original;}
  throw new Error('No matching seed');
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];let checked=0;
try{
  for(const role of ['villager','muted','sickman','survivor','jester'])for(const enabled of [false,true]){
    const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts[role]=1;counts.werewolf=1;counts.villager=role==='villager'?4:3;
    const names=['Ava','Noah','Mila','Leo','Finn'];const seed=firstRoleSeed(names,counts,role);
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({names,enabled})=>{
      localStorage.setItem('werewolf.names',JSON.stringify(names));
      localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:enabled,sickStartingNights:enabled?5:1,sickDoctorBonus:enabled?3:0,survivorShieldCount:enabled?5:1,sounds:false,buttonSounds:false,haptics:false}));
      localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
    },{names,enabled});
    if(process.env.TEXT_SCALE)await page.addInitScript(scale=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*scale+'px';}),Number(process.env.TEXT_SCALE));
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'START GAME',exact:true}).click();
    await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
    for(const [id,count]of Object.entries(counts))for(let i=0;i<count;i++)await page.getByRole('button',{name:'Add '+roles[id].name,exact:true}).click();
    await page.evaluate(seed=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},seed);
    await page.getByRole('button',{name:/START GAME/}).click();
    await continueReport(page);
    await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
    while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
    assert.equal(await page.locator('.action h2').textContent(),roles[role].name);
    const text=await page.locator('.panel.description > p').innerText();
    assert.ok(descriptionFits(text));assert.doesNotMatch(text,/Wolf Pup|Hypnotizer|Infecting|Friends Maker|Doctor/);
    if(role==='villager')assert.match(text,/You have no action at night/);
    if(role==='muted'){assert.match(text,/Each night you can mute someone/);assert.doesNotMatch(text,/You can speak normally|morning report names the muted player|Silence ends at the next night|choose another living player to silence/);}
    if(role==='sickman')assert.match(text,enabled?/You have 5 nights left without help/:/Without help, you die tonight/);
    if(role==='survivor'){
      assert.ok(text.includes(enabled?'5 shields left':'1 shield left'));
      assert.equal(text.includes('cannot use one tonight'),enabled);
      assert.equal(await page.getByRole('button',{name:/USE SHIELD/}).count(),enabled?0:1);
    }
    if(role==='jester'){assert.match(text,/vote you out/);assert.match(text,/you win and the game ends/);}
    assert.equal(await page.locator('button.target').count(),role==='muted'?names.length:0);
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'horizontal overflow');
    }
    if(role==='survivor' && enabled)await page.screenshot({path:output+'/smart-survivor-batch5.png',fullPage:true});
    checked++;await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(`Browser batch 5 passed: ${checked} actual private-role cards, five roles, both settings modes, limits, initial nights/shields and safe-night instructions, 320/390px layouts and no runtime errors.`);
}finally{await browser.close();}
