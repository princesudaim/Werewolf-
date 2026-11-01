// Production phone-browser check: CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-smart-descriptions.mjs
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {deal,roles} from '../src/werewolf-engine.ts';
import {SMART_DESCRIPTION_ROLES,descriptionFits} from '../src/smart-role-descriptions.ts';
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
  for(const role of SMART_DESCRIPTION_ROLES)for(const withPup of role==='wolfpup'?[true]:[false,true]){
    const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
    counts[role]=1;counts.villager=4;if(withPup && role!=='wolfpup')counts.wolfpup=1;
    const names=Array.from({length:Object.values(counts).reduce((a,b)=>a+b,0)},(_,i)=>`Player ${i+1}`);
    const seed=firstRoleSeed(names,counts,role);
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(names=>{
      localStorage.setItem('werewolf.names',JSON.stringify(names));
      localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,sounds:false,buttonSounds:false,haptics:false}));
      localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
    },names);
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'START GAME',exact:true}).click();
    await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
    for(const [id,count]of Object.entries(counts))for(let i=0;i<count;i++)await page.getByRole('button',{name:'Add '+roles[id].name,exact:true}).click();
    await page.evaluate(seed=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},seed);
    await page.getByRole('button',{name:/START GAME/}).click();
    await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();
    await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
    while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();
    assert.equal(await page.locator('.action h2').textContent(),roles[role].name);
    const text=await page.locator('.panel.description > p').innerText();
    assert.ok(descriptionFits(text),text);
    assert.doesNotMatch(text,/Friends Maker|Lone Werewolf keeps|Infecting Wolf|Hypnotizer Wolf/,'absent roles must not be mentioned');
    if(!withPup)assert.doesNotMatch(text,/Wolf Pup/);
    if(withPup && ['werewolf','hypnowolf','rabidwolf'].includes(role))assert.match(text,/Wolf Pup/);
    if(role==='hypnowolf')assert.match(text,/1 use left/);
    if(role==='werewolf')assert.match(text,/If votes tie, no one dies from the Werewolves’ vote/);
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
    }
    if(role==='hypnowolf' && !withPup)await page.screenshot({path:output+'/smart-hypnotizer-no-pup.png',fullPage:true});
    checked++;await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(`Browser smart descriptions passed: ${checked} dealt-lineup cases, all five roles, absent/present Pup rules, limits, 320/390px layout, no runtime errors.`);
}finally{await browser.close();}
