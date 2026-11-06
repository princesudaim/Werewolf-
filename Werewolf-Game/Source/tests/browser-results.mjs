import {continueReport} from './helpers/report-controls.mjs';
// Optional production-browser regression: CHROMIUM_PATH=/path/to/chromium node tests/browser-results.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
async function audit(page){if(process.env.A11Y!=='1')return;await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));const r=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(r,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));}
import { mkdir } from 'node:fs/promises';
import { chromium as playwright } from 'playwright-core';
const executablePath=process.env.CHROMIUM_PATH;
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a Chromium executable.');
const base=process.env.BASE_URL || 'http://127.0.0.1:3000/';
const output=process.env.RESULT_SCREENSHOT_DIR || '.cache/results';
await mkdir(output,{recursive:true});
(async()=>{
const browser=await playwright.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.addInitScript(()=>{Math.random=()=>0;localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,sounds:false,buttonSounds:false,haptics:false}));localStorage.setItem('werewolf.avatars.v1',JSON.stringify({ava:'./werewolf/avatars/player1.webp',noah:'./werewolf/avatars/player2.webp',mila:'./werewolf/avatars/player3.webp',leo:'./werewolf/avatars/player4.webp'}));});
 if(process.env.TEXT_SCALE)await page.addInitScript(scale=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=16*scale+'px';}),Number(process.env.TEXT_SCALE));
 await page.goto(base,{waitUntil:'networkidle'});
 if(process.env.A11Y==='1')await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
 await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const role of ['Werewolf','Seer','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
 await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 let wolf, killed;
 for(let i=0;i<4;i++){
  const name=await page.locator('.player-pass h2').textContent();
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  const role=await page.locator('.action h2').textContent();
  if(role==='Werewolf'||role==='Seer'){
   if(role==='Werewolf'){wolf=name;killed=await page.locator('.target:not(:disabled) strong').first().textContent();}
   await page.locator('.target:not(:disabled)').first().click();await page.getByRole('button',{name:'COMPLETE ACTION',exact:true}).click();
   const hide=page.getByRole('button',{name:'OK · HIDE RESULT',exact:true});if(await hide.count())await hide.click();
  }else await page.getByRole('button',{name:'SKIP',exact:true}).click();
 }
 await audit(page);await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
 const victim=['Ava','Noah','Mila','Leo'].find(n=>n!==wolf&&n!==killed);
 for(let i=0;i<3;i++){
  const voter=await page.locator('.voter-name').textContent();
  if(voter===victim)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();
  else{await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+victim+'$')})}).click();await page.getByRole('button',{name:'VOTE',exact:true}).click();}
 }
 assert.ok(await page.getByRole('heading',{name:'THE VILLAGE HAS DECIDED!'}).isVisible());
 assert.match(await page.locator('.verdict-vote-count').textContent(),/Received 2 votes/);await audit(page);
 await page.waitForTimeout(350);await page.screenshot({path:`${output}/vote-result-mobile.png`,fullPage:true});
 const button=page.getByRole('button',{name:'CONTINUE →',exact:true});await button.focus();await page.keyboard.down('Enter');await page.waitForTimeout(2200);await page.keyboard.up('Enter');
 await page.getByRole('heading',{name:'WEREWOLVES WIN',exact:true}).waitFor();
 assert.equal(await page.locator('.match-player-card').count(),4);await audit(page);
 assert.equal(await page.getByText('WON',{exact:true}).count(),1);
 await page.screenshot({path:`${output}/end-result-mobile.png`,fullPage:true});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:700});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'no horizontal overflow at '+width);
  assert.equal(await page.getByRole('button',{name:'NIGHT RANKINGS',exact:true}).count(),0);assert.equal(await page.locator('.is-mvp').count(),1);
  assert.equal(await page.locator('.match-player-info strong').first().textContent(),wolf);
  await audit(page);assert.ok(await page.getByRole('button',{name:'START AGAIN',exact:true}).isEnabled());
 }
 assert.deepEqual(errors,[]);
 console.log('Mobile browser flow passed: night, vote count, verdict, wolf victory, cards, rankings, 320px/390px overflow, no runtime errors.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
