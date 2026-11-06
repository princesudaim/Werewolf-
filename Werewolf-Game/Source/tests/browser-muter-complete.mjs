import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {roles,deal,isEligibleMadmanRole} from '../src/werewolf-engine.ts';
import {continueReport} from './helpers/report-controls.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/',report={checks:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
try{
 for(const fake of [false,true]){
  const names=fake?['Ava','Noah','Mila','Leo','Ivy']:['Ava','Noah','Mila','Leo'];const spec=fake?{werewolf:1,madman:1,villager:3}:{werewolf:1,muted:1,villager:2};
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(({names,fake})=>{localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:true,sounds:false,buttonSounds:false,haptics:false,passiveWait:!fake,passiveWaitSeconds:15,allRolesWait:false}));for(const key of ['card-reveal','voted-out','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));},{names,fake});
  await page.goto(base,{waitUntil:'networkidle'});
  if(!fake){await click(page,'ROLE RULEBOOK');await page.getByPlaceholder('Find a role').fill('Muter');const entry=page.locator('[data-role="muted"]');assert.equal(await entry.locator('h4').textContent(),'Muter');assert.match(await entry.textContent(),/Each night you can mute someone/);assert.doesNotMatch(await entry.textContent(),/You can speak normally|morning report names the muted player|Silence ends at the next night|choose another living player to silence/);assert.match(await entry.textContent(),/You may skip; repeats on later nights are allowed/);await click(page,'Close role rulebook');}
  await click(page,'START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  assert.equal(await page.locator('#role-power-muted').textContent(),'4');await click(page,'View Muter details');assert.match(await page.getByRole('dialog').textContent(),/Each night you can mute someone/);assert.doesNotMatch(await page.getByRole('dialog').textContent(),/You can speak normally|morning report names the muted player|Silence ends at the next night/);assert.ok(await page.getByRole('img',{name:'Power 4 out of 10, estimated for current settings',exact:true}).isVisible());await page.getByText('ROLE SETTINGS',{exact:true}).click();await page.getByText(/Muter is an active role/).waitFor();assert.equal(await page.getByText('This role has no additional night ability to configure.',{exact:true}).count(),0);await click(page,'Close role details');
  for(const [r,n]of Object.entries(spec))for(let i=0;i<n;i++)await click(page,'Add '+roles[r].name);
  let seed;
  if(fake){const eligible=Object.keys(roles).filter(isEligibleMadmanRole);seed=(eligible.indexOf('muted')+.01)/eligible.length;}
  else{const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,spec[r]||0]));const original=Math.random;try{for(let n=1;n<1000;n++){Math.random=()=>n/1000;if(deal(names,counts)[0].role==='muted'){seed=n/1000;break;}}}finally{Math.random=original;}assert.ok(seed!==undefined);}
  await page.evaluate(seed=>Math.random=()=>seed,seed);await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);let seen=false;
  for(let i=0;i<names.length;i++){
   await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click(page,'OK · HIDE INFO');const role=await page.locator('.action h2').textContent();
   if(role==='Muter'){seen=true;assert.equal(await page.locator('.role-power-game').textContent(),'4');assert.match(await page.locator('.description p').textContent(),/You may skip/);assert.equal(await page.locator('.wait-card').count(),0);assert.equal(await page.getByRole('button',{name:'SKIP MUTE',exact:true}).isEnabled(),true);if(fake){await page.locator('.target:not(:disabled)').first().click();await click(page,'MUTE PLAYER');}else break;}
   else await click(page,'SKIP');
  }
  assert.ok(seen);if(fake){await page.getByRole('heading',{name:'NO ONE DIED',exact:true}).waitFor();assert.equal(await page.locator('.morning-muted').count(),0);report.checks.push('real Madman deal can disguise as Muter, looks like Muter with power 4, but its attempted silence never produces a morning announcement');}else report.checks.push('Rulebook/role details/settings help and setup/private power badges agree at 4/10; Muter acts immediately despite the passive-role wait being 15 seconds');await context.close();
 }
 assert.deepEqual(report.errors,[]);await mkdir('.cache/muter-complete',{recursive:true});await writeFile('.cache/muter-complete/browser.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
