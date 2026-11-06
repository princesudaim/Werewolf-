import {continueReport} from './helpers/report-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url);
const base=process.env.BASE_URL || 'http://127.0.0.1:3009/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/voting-layout';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],errors=[],avatarIds=[5,1,2,4,3,11];
try{
 for(const config of [
  {width:1064,height:961,scale:1,secret:true,skip:true},
  {width:390,height:844,scale:1,secret:false,skip:false},
  {width:320,height:568,scale:2,secret:true,skip:false,longName:true},
  {width:568,height:320,scale:2,secret:false,skip:true},
 ]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const names=[config.longName?'RayaWithAVeryLongPlayerName':'Raya','Hana','Elena','Noah','Sara','Juno'];
  await page.addInitScript(({config,names,avatarIds})=>{
   localStorage.setItem('werewolf.names',JSON.stringify(names));
   localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:true,secretVotes:config.secret,allowSkip:config.skip,sounds:false,buttonSounds:false,haptics:false}));
   localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((name,i)=>[name.toLowerCase(),`./werewolf/avatars/player${avatarIds[i]}.webp`]))));
   document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*config.scale+'px';});
  },{config,names,avatarIds});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'START GAME',exact:true}).click();
  assert.doesNotMatch(await page.locator('body').innerText(),/Tap a player to edit their name or photo|RANDOM adds a name and avatar/);
  assert.ok(await page.getByRole('button',{name:'Edit '+names[0],exact:true}).isVisible());
  assert.ok(await page.getByRole('button',{name:'RANDOM',exact:true}).isVisible());
  await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  await page.getByRole('button',{name:'Add Werewolf',exact:true}).click();
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Add Villager',exact:true}).click();
  await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
  for(let i=0;i<6;i++){
   await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
   await page.getByRole('button',{name:'SKIP',exact:true}).click();
  }
  await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(let i=0;i<6;i++){
   const heading=page.locator('.voter-heading h2');
   assert.equal(await page.locator('.voter-name').innerText(),names[i]);
   assert.equal(await heading.getAttribute('aria-label'),`${names[i]}, who are you voting for?`);
   assert.ok(await heading.evaluate(el=>el===document.activeElement),'voter heading receives handoff focus');
   assert.equal(await page.locator('.voting-help,.vote-progress').count(),0);
   assert.doesNotMatch(await page.locator('.vote-page').innerText(),/Voter \d+ of|Choose an available player|Earlier votes stay hidden|SKIP VOTE passes/);
   await page.waitForFunction(()=>[...document.querySelectorAll('.voter-avatar img,.target-avatar img')].every(img=>img.complete && img.naturalWidth>0));
   const metrics=await page.evaluate(()=>{
    const avatar=document.querySelector('.voter-avatar'),name=document.querySelector('.voter-name');
    return {avatar:avatar.getBoundingClientRect().width,name:parseFloat(getComputedStyle(name).fontSize),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,src:avatar.querySelector('img')?.getAttribute('src')};
   });
   assert.equal(metrics.name,32*config.scale);assert.equal(metrics.avatar,config.width<=360?80:96);
   assert.equal(metrics.overflow,false,'no horizontal overflow, including long names at 200%');
   assert.match(metrics.src,new RegExp(`player${avatarIds[i]}\\.webp$`));
   assert.equal(await page.locator('.target[aria-pressed="true"]').count(),0);
   assert.ok(await page.getByRole('button',{name:'VOTE',exact:true}).isDisabled());
   assert.equal(await page.getByRole('button',{name:'SKIP VOTE',exact:true}).count(),config.skip?1:0);
   assert.equal(await page.getByText(/^Votes so far:/).count(),config.secret?0:1);
   if(i===0){
    const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
    assert.deepEqual(violations,[]);
   }
   const target=page.locator('.target:not(:disabled)').first();await target.click();
   assert.equal(await target.getAttribute('aria-pressed'),'true');
   if(i===0){
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${output}/voting-${config.width}-${config.scale}x.png`,fullPage:true});
   }
   if(config.skip && i%2===0)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();
   else await page.getByRole('button',{name:'VOTE',exact:true}).click();
  }
  await page.locator('.screen-voteResult').waitFor();
  results.push({config,voters:6,status:'PASS'});await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: removed setup/voting help, prominent voter name/avatar and all 24 voter handoffs; desktop/phone/200%/landscape; secret/open votes, skip on/off, fresh selections, focus, overflow and four targeted accessibility audits.');
}finally{
 await writeFile(`${output}/voting-layout-results.json`,JSON.stringify({results,errors},null,2));await browser.close();
}
