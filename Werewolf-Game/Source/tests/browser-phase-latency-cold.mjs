import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
import {installPhaseProbe} from './helpers/phase-audio-probe.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let release;const held=new Promise(resolve=>release=resolve);let released=false;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await context.route('**/audio/phase/v1/**',async route=>{if(!released)await held;await route.continue();});await context.addInitScript(installPhaseProbe);
 await context.addInitScript(()=>{localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:false,firstNightSafe:true,passiveWait:false,allRolesWait:false}));for(const key of ['card-reveal','voted-out','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const click=name=>page.getByRole('button',{name,exact:true}).click();
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:3009/',{waitUntil:'domcontentloaded'});await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Villager','Villager','Villager'])await click('Add '+role);await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 assert.equal(await page.evaluate(()=>__plays.length),0,'a cold night cue is not queued');
 for(let i=0;i<4;i++){await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click('OK · HIDE INFO');await click('SKIP');}
 await continueReport(page);assert.equal(await page.evaluate(()=>__plays.length),0,'a cold meeting cue is not queued');
 released=true;release();await page.waitForFunction(()=>__phaseDecoded.length===2);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>__plays.length),0,'finishing old downloads cannot start either overdue cue');
 await click('END DISCUSSION →');for(let i=0;i<4;i++)await click('SKIP VOTE');await continueReport(page);assert.equal(await page.evaluate(()=>__plays.length),0);await continueReport(page);await page.waitForFunction(()=>__plays.length===1);const play=await page.evaluate(()=>__plays[0]);assert.equal(play.file,'night-start.wav');assert.ok(play.native&&play.latencyMs>=0&&play.latencyMs<150);assert.equal(play.loop,false);assert.deepEqual(errors,[]);
 console.log('PASS: both phase downloads deliberately held past night and meeting; neither starts late when released. Next explicit night CONTINUE starts the prepared native cue promptly.',JSON.stringify(play));await context.close();
}finally{released=true;release();await browser.close();}
