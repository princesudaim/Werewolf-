// CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-mayor-gambler.mjs
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {deal, roles} from '../src/werewolf-engine.ts';
const executablePath=process.env.CHROMIUM_PATH;
if(!executablePath)throw new Error('Set CHROMIUM_PATH to a Chromium executable.');
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';
await mkdir(output,{recursive:true});
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function arrange(names,counts,role){
  const original=Math.random;
  try{for(let i=1;i<1000;i++){const seed=Math.imul(i,2654435761)>>>0;Math.random=random(seed);const lineup=deal(names,Object.fromEntries(Object.keys(roles).map(r=>[r,counts[r]||0])));if(lineup[0].role===role)return {seed,lineup};}}
  finally{Math.random=original;}
  throw new Error('Could not arrange test roles');
}
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function setup(names,counts,firstRole,settings={}){
  const {seed,lineup}=arrange(names,counts,firstRole);
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({names,seed,settings})=>{
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    localStorage.setItem('werewolf.names',JSON.stringify(names));
    localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,sounds:false,buttonSounds:false,haptics:false,journalistDrawing:false,...settings}));
    localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),`./werewolf/avatars/player${i+1}.webp`]))));
  },{names,seed,settings});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'START GAME',exact:true}).click();
  await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  for(const [role,count]of Object.entries(counts))for(let i=0;i<count;i++)await page.getByRole('button',{name:'Add '+roles[role].name,exact:true}).click();
  await page.evaluate(seed=>{Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},seed);
  await page.getByRole('button',{name:/START GAME/}).click();await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();
  return {page,lineup};
}
async function reveal(page){
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  const info=page.getByRole('button',{name:'OK · HIDE INFO',exact:true});let count=0;
  while(await info.count()){await info.click();count++;}
  return {role:await page.locator('.action h2').textContent(),count};
}
async function choose(page,name){await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).click();await page.getByRole('button',{name:'COMPLETE ACTION',exact:true}).click();}
async function advanceDay(page,count){
  await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
  for(let i=0;i<count;i++)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();
  const hold=page.getByRole('button',{name:'CONTINUE →',exact:true});await hold.focus();await page.keyboard.down('Enter');await page.waitForTimeout(2100);await page.keyboard.up('Enter');
  await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();
}
try{
  const names=['Ava','Noah','Mila','Leo','Finn','Iris','Luna'];
  const {page,lineup}=await setup(names,{mayor:1,werewolf:1,seer:1,doctor:1,journalist:1,celebrity:1,villager:1},'mayor');let messages=0;
  for(let i=0;i<7;i++){
    const {role,count}=await reveal(page);messages+=count;
    assert.equal(await page.locator('.assembly-announcement').count(),0);
    if(role==='Mayor'){
      await page.screenshot({path:`${output}/mayor-ability-mobile.png`,fullPage:true});
      await page.getByRole('button',{name:'DECLARE EMERGENCY ASSEMBLY',exact:true}).click();
    }else if(role==='News Maker'){
      const headline=page.getByPlaceholder('Write a headline');
      await headline.pressSequentially('hellooooooo');assert.equal(await headline.inputValue(),'helloooooo');
      await headline.fill('one two three four');assert.equal(await headline.inputValue(),'one two th');
      await headline.fill('Turns done');await page.getByRole('button',{name:'PUBLISH IN THE MORNING',exact:true}).click();
    }else if(role==='Werewolf'||role==='Doctor')await choose(page,lineup.find(p=>p.role==='villager').name);
    else if(role==='Seer'){await choose(page,lineup.find(p=>p.role==='werewolf').name);await page.getByRole('button',{name:'OK · HIDE RESULT',exact:true}).click();}
    else await page.getByRole('button',{name:'SKIP',exact:true}).click();
    if(i<6)assert.equal(await page.locator('.player-pass').count(),1);
  }
  assert.ok(messages>=1);
  const dialog=page.getByRole('dialog',{name:'EMERGENCY VILLAGE ASSEMBLY!',exact:true});await dialog.waitFor();
  await dialog.getByText(/Ava declared their Mayoralty/).waitFor({state:'visible'});
  assert.equal(await page.locator('.morning-ok').isDisabled(),true);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.screenshot({path:`${output}/mayor-announcement-mobile.png`,fullPage:true});
  await dialog.getByRole('button',{name:'GOT IT!',exact:true}).click();
  assert.ok(await page.getByText('Turns done',{exact:true}).isVisible());
  await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();await page.getByRole('heading',{name:'DISCUSS YOUR SUSPECTS',exact:true}).waitFor();await page.close();

  const game=await setup(['Ava','Noah','Mila','Leo','Finn','Iris','Luna','Ezra'],{gambler:1,werewolf:1,villager:6},'gambler',{gamblerPredictions:1});
  const p=game.page,target=game.lineup.find(p=>p.role==='villager').name;
  for(let i=0;i<8;i++){const {role}=await reveal(p);if(role==='Gambler'||role==='Werewolf')await choose(p,target);else await p.getByRole('button',{name:'SKIP',exact:true}).click();}
  assert.equal(await p.getByText(/left the village and won/).count(),0);
  await advanceDay(p,7);
  for(let i=0;i<7;i++){
    const {role}=await reveal(p);
    if(role==='Gambler'){
      assert.ok(await p.getByText(/Correct predictions: 1 \/ 1/).isVisible());assert.equal(await p.getByText(/People you owe money to are coming tonight/).count(),0);
      await p.getByRole('button',{name:'SKIP BET',exact:true}).click();
    }else if(role==='Werewolf')await choose(p,game.lineup.find(p=>p.role==='villager'&&p.name!==target).name);
    else await p.getByRole('button',{name:'SKIP',exact:true}).click();
  }
  assert.ok(await p.getByText('Ava left the village and won',{exact:true}).isVisible());
  assert.deepEqual(errors,[]);
  console.log('Mobile Mayor/Gambler regressions passed: full private-turn queue and messages, dawn-only assembly, modal acknowledgement, 320/390px layouts, night-death credit, no false debt, next-night escape, no runtime errors.');
}finally{await browser.close();}
