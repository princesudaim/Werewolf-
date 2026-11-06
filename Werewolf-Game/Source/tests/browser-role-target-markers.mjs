import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {roles,deal} from '../src/werewolf-engine.ts';
import {continueReport} from './helpers/report-controls.mjs';
const require=createRequire(import.meta.url),base=process.env.BASE_URL||'http://127.0.0.1:3009/',output='.cache/role-marker-browser';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],errors:[]},names=Array.from({length:7},(_,i)=>'P'+(i+1)),spec={werewolf:1,doctor:1,seer:1,chef:1,necromancer:1,villager:2};
let lineup;const old=Math.random;try{Math.random=()=>.25;lineup=deal(names,Object.fromEntries(Object.keys(roles).map(k=>[k,spec[k]||0])));}finally{Math.random=old;}
const victim=lineup.find(p=>p.role==='villager').name;
try{
 await mkdir(output,{recursive:true});const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(names=>{localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,buttonSounds:false,haptics:false,passiveWait:false,allRolesWait:false}));localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map(n=>[n.toLowerCase(),'./werewolf/avatars/photo-01-20261106.png']))));for(const key of ['card-reveal','voted-out','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));},names);
 const click=name=>page.getByRole('button',{name,exact:true}).click(),target=name=>page.locator('.target').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})});
 const dimensions=()=>page.locator('.targets').evaluate(g=>[...g.querySelectorAll('.target')].map(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top+scrollY};}));
 async function bounds(){assert.deepEqual(await page.locator('.target-portrait').evaluateAll(nodes=>nodes.flatMap(n=>{const p=n.getBoundingClientRect(),errors=[];if(Math.abs(p.width-p.height)>1)errors.push('photo not square');for(const m of n.querySelectorAll('.target-status,.role-target-marker')){const b=m.getBoundingClientRect();if(b.left<p.left-1||b.top<p.top-1||b.right>p.right+1||b.bottom>p.bottom+1)errors.push('overlay escaped photo');if(m.classList.contains('role-target-marker')&&(b.width>26.1||b.height>26.1||b.width>p.width*.33))errors.push('marker too large');}return errors;})),[]);assert.equal(await page.locator('.target > small').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 async function audit(){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);}
 await page.goto(base,{waitUntil:'networkidle'});await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const [role,n]of Object.entries(spec))for(let i=0;i<n;i++)await click('Add '+roles[role].name);await page.evaluate(()=>Math.random=()=>.25);await page.getByRole('button',{name:/START GAME/}).click();
 let deadChecks=0;
 for(let night=1;night<=2;night++){
  await page.locator('.night-intro').waitFor();await continueReport(page);await page.locator('.player-pass h2').waitFor();
  for(let turn=0;turn<(night===1?7:6);turn++){
   const name=await page.locator('.player-pass h2').textContent(),actor=lineup.find(p=>p.name===name);await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click('OK · HIDE INFO');
   assert.equal(await page.locator('.role-target-marker').count(),0,'new voter never inherits old selection');
   if(night===2&&await page.locator('.targets').count()){
    assert.equal(await target(victim).locator('.target-portrait .target-status').textContent(),'DEAD');await bounds();const heights=await dimensions();assert.ok(Math.max(...heights.map(v=>v.height))-Math.min(...heights.map(v=>v.height))<1,'DEAD adds no card height');deadChecks++;
   }
   if(actor.role==='villager'||(actor.role==='necromancer'&&night===1)){await click('SKIP');continue;}
   const before=await dimensions();let chosen;
   if(actor.role==='werewolf')chosen=night===1?target(victim):page.locator('.target:not(:disabled)').first();
   else if(actor.role==='necromancer')chosen=target(victim);
   else chosen=page.locator('.target:not(:disabled)').filter({hasNot:page.locator('strong',{hasText:new RegExp('^'+victim+'$')})}).first();
   await chosen.click();assert.equal(await chosen.locator('.role-target-marker').getAttribute('data-marker-role'),actor.role);assert.deepEqual(await dimensions(),before);await bounds();
   await chosen.click();assert.equal(await page.locator('.role-target-marker').count(),0);assert.deepEqual(await dimensions(),before);await chosen.click();
   if(actor.role==='chef'){await page.locator('.target:not(:disabled):not(.selected)').first().click();assert.equal(await page.locator('.role-target-marker').count(),2);}
   if(actor.role==='doctor'&&night===1){await chosen.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/doctor-small-cross.png',fullPage:true});}
   if(actor.role==='necromancer'&&night===2){
    for(const [width,height,text]of [[390,844,false],[320,700,false],[320,700,true],[844,390,false]]){await page.setViewportSize({width,height});await page.evaluate(t=>document.documentElement.style.fontSize=t?'200%':'',text);await bounds();await audit();const d=await dimensions();await chosen.click();assert.deepEqual(await dimensions(),d);await chosen.click();assert.deepEqual(await dimensions(),d);}
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='');await chosen.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/dead-and-necromancer-contained.png',fullPage:true});
    // Explicit escaped-status layout fixture: same real portrait component markup,
    // with the alternative public status; this is not a claim of a Gambler win.
    await chosen.locator('.target-status').evaluate(el=>{el.textContent='ESCAPED';el.dataset.status='escaped';});await bounds();assert.deepEqual(await dimensions(),before);await chosen.locator('.target-status').evaluate(el=>{el.textContent='DEAD';el.dataset.status='dead';});
   }
   await click('COMPLETE ACTION');if(actor.role==='seer'||actor.role==='chef')await click('OK · HIDE RESULT');assert.equal(await page.locator('.role-target-marker').count(),0);
  }
  assert.equal(await page.locator('.role-target-marker').count(),0,'no marker leaks into morning');
  if(night===1){await continueReport(page);await click('END DISCUSSION →');assert.equal(await target(victim).locator('.target-status').textContent(),'DEAD');await bounds();assert.equal(await page.locator('.role-target-marker').count(),0,'no role hints in voting');for(let i=0;i<6;i++)await click('SKIP VOTE');await continueReport(page);}
 }
 assert.ok(deadChecks>0);assert.deepEqual(report.errors,[]);report.checks.push('Real seven-player match: Werewolf/Doctor/Seer/Chef selections and Necromancer selection of real dead player','Selection/deselection/multi-target overlays never change card/grid dimensions or square photos','DEAD inside avatar in voting/night grids; ESCAPED explicit alternate-status layout fixture','Small markers <=26px and <=32% of photo width; original wolf claw retained','390/320/200%-text/landscape bounds + axe audit; no public/next-turn role-marker leakage');await writeFile(output+'/result.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));await context.close();
}finally{await browser.close();}
