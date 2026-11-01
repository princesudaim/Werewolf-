// CHROMIUM_PATH=/path/to/chromium node --experimental-strip-types tests/browser-friend-messages.mjs
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
  const {page,lineup}=await setup(['Ava','Noah','Mila','Leo','Finn'],{charmer:1,werewolf:1,doctor:1,villager:2},'charmer',{charmerMessages:true,doctorRepeatProtect:true});
  const charmer=lineup.find(p=>p.role==='charmer'),friend=lineup.find(p=>p.role==='villager'),protectedPlayer=lineup.filter(p=>p.role==='villager')[1];
  let replies=0,letters=0;
  for(let night=1;night<=3;night++){
    for(let i=0;i<5;i++){
      const name=await page.locator('.player-pass h2').textContent();
      await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
      const dialog=page.getByRole('dialog',{name:'PRIVATE MESSAGE',exact:true});
      if(await dialog.count()){
        if(name===friend.name){
          assert.ok(night>=2);assert.ok(await dialog.getByText(night===2?'First letter':'Second letter',{exact:true}).isVisible());letters++;
          await dialog.getByLabel('Your reply',{exact:true}).fill(night===2?'One reply':'Later reply');
          await dialog.getByRole('button',{name:'SEND REPLY',exact:true}).click();
          assert.equal(await dialog.getByLabel('Your reply',{exact:true}).count(),0);assert.equal(await dialog.getByRole('button',{name:'SEND REPLY',exact:true}).count(),0);
          assert.ok(await dialog.getByRole('status').isVisible());assert.ok(await dialog.getByText(night===2?'First letter':'Second letter',{exact:true}).isVisible());
          if(night===2)await page.screenshot({path:`${output}/friend-reply-after-send.png`,fullPage:true});
          replies++;
        }else{
          assert.equal(night,3);assert.equal(name,charmer.name);assert.ok(await dialog.getByText('One reply',{exact:true}).isVisible());
          assert.equal(await dialog.getByLabel('Your reply',{exact:true}).count(),0);
        }
      }
      const close=page.getByRole('button',{name:'OK · HIDE INFO',exact:true});while(await close.count())await close.click();
      const role=await page.locator('.action h2').textContent();
      if(role==='Friends Maker'){
        if(night===1)await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+friend.name+'$')})}).click();
        assert.ok(await page.getByPlaceholder('Write a private message').isVisible(),'composer restores each night');
        if(night<=2){
          await page.getByPlaceholder('Write a private message').fill(night===1?'First letter':'Second letter');await page.getByRole('button',{name:'SEND MESSAGE',exact:true}).click();
          assert.equal(await page.getByPlaceholder('Write a private message').count(),0);assert.equal(await page.getByRole('button',{name:'SEND MESSAGE',exact:true}).count(),0);
          assert.ok(await page.getByText(/You cannot send again tonight/).isVisible());
          if(night===1)await page.screenshot({path:`${output}/friend-message-after-send.png`,fullPage:true});
        }
        await page.getByRole('button',{name:night===1?'COMPLETE ACTION':'SKIP',exact:true}).click();
      }else if(role==='Doctor'||role==='Werewolf')await choose(page,protectedPlayer.name);
      else await page.getByRole('button',{name:'SKIP',exact:true}).click();
    }
    assert.ok(await page.getByText('No one was killed tonight.',{exact:true}).isVisible());
    if(night<3)await advanceDay(page,5);
  }
  assert.equal(letters,2);assert.equal(replies,2);assert.deepEqual(errors,[]);
  console.log('Browser Friends messaging passed: one send/reply, composers removed, message remains readable, allowance restored next night, exactly-once next-night delivery, no runtime errors.');
}finally{await browser.close();}
