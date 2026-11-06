import {continueReport} from './helpers/report-controls.mjs';
// CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-smart-descriptions-batch6.mjs
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
  for(const role of ['strongwolf','whitewolf','serialkiller','raven','thief'])for(const [enabled,safe] of [[false,false],[true,false],[true,true]]){
    const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts[role]=1;counts.werewolf=1;counts.villager=3;
    const names=['Ava','Noah','Mila','Leo','Finn'];const seed=firstRoleSeed(names,counts,role);
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({names,enabled,safe})=>{
      localStorage.setItem('werewolf.names',JSON.stringify(names));
      localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:safe,whiteWolfBetrayPack:enabled,wolfRandomTies:enabled,serialKillerInterval:enabled?2:1,thiefDeathOnly:false,thiefAttackInterval:enabled?2:1,ravenReflectAttackers:enabled,sounds:false,buttonSounds:false,haptics:false}));
      localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
    },{names,enabled,safe});
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
    assert.ok(descriptionFits(text));assert.doesNotMatch(text,/Wolf Pup|Hypnotizer|Infecting|Friends Maker/);
    if(role==='raven'){
      assert.match(text,/Mark 1 player tonight/);
      assert.match(text,enabled?/they die instead/:/Marked players can still kill you/);
      assert.equal(await page.getByRole('button',{name:'ACTIVATE CURSE'}).count(),0);
    }else if(safe)assert.match(text,/No attacks tonight/);
    if(role==='strongwolf'){
      assert.match(text,/You win with the Werewolves/);
      if(!safe)assert.match(text,/Tonight, attack 1 player/);
    }
    if(role==='whitewolf'){
      assert.match(text,/Be the last player alive to win/);
      if(!safe){
        assert.ok(text.includes(`You ${enabled?'can':'cannot'} target wolves you know`));
        assert.match(text,enabled?/picks a tied player at random/:/no one dies from the Werewolves’ vote/);
      }
    }
    if(['serialkiller','thief'].includes(role) && !safe){
      assert.equal(text.includes('No attack tonight'),enabled);
      assert.match(text,enabled?/nights 2, 4, 6/:/Attack 1 player each night/);
    }
    if(role==='serialkiller')assert.doesNotMatch(text,/checked|checks/i);
    if(role==='thief')assert.match(text,/If your target dies and you survive, take their role/);
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'horizontal overflow');
    }
    if(role==='whitewolf' && enabled && !safe)await page.screenshot({path:output+'/smart-whitewolf-batch6.png',fullPage:true});
    checked++;await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(`Browser batch 6 passed: ${checked} actual private-role cards, five roles, both settings modes plus safe first night, limits, role-aware targets and intervals, 320/390px layouts and no runtime errors.`);
}finally{await browser.close();}
