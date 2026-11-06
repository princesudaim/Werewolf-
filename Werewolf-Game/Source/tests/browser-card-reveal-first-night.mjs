// Actual native reveal playback across two nights, recovered Night 2 and replay.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {continueReport} from './helpers/report-controls.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/';
const output=process.env.RESULT_SCREENSHOT_DIR||'.cache/first-night-reveal-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={checks:[],firstNightStarts:[],replayStarts:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{
  if(!localStorage.getItem('werewolf.names')){
   localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:true,firstNightSafe:true}));
   localStorage.setItem('werewolf.morning-death.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.game-end.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.voted-out.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:65}));
  }
  window.__starts=[];window.__decoded=0;window.__clicks=[];window.__notes=0;window.__vibrations=[];
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:n=>{__vibrations.push(n);return true;}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-card-reveal]'))__clicks.push(performance.now());},true);
  const C=AudioContext;window.AudioContext=class extends C{
   async decodeAudioData(bytes){const b=await super.decodeAudioData(bytes);b.__index=++__decoded;return b;}
   createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s);s.start=(...args)=>{__starts.push({time:performance.now(),click:__clicks.at(-1),buffer:s.buffer.__index});return start(...args);};return s;}
   createOscillator(){const s=super.createOscillator(),start=s.start.bind(s);s.start=(...args)=>{__notes++;return start(...args);};return s;}
  };
 });
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();assert.ok(await page.getByText(/On Night 1 only, a random sound/).isVisible());await page.getByRole('checkbox',{name:'Save this match for recovery',exact:true}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await page.getByRole('button',{name:'DONE',exact:true}).click();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of ['Werewolf','Villager','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 let wolf;const villagers=[];
 for(let i=0;i<4;i++){
  const name=await page.locator('.player-pass h2').textContent();await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await page.waitForFunction(count=>__starts.length===count,i+1);
  const entry=await page.evaluate(()=>__starts.at(-1));assert.ok(entry.time-entry.click>=245&&entry.time-entry.click<=350);if(i)assert.notEqual(entry.buffer,report.firstNightStarts.at(-1).buffer);report.firstNightStarts.push(entry);
  if(await page.locator('.action h2').textContent()==='Werewolf')wolf=name;else villagers.push(name);await page.getByRole('button',{name:'SKIP',exact:true}).click();
 }
 report.checks.push('native 250ms nonrepeating reveals for all four players on Night 1');
 await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();await continueReport(page);await page.getByRole('heading',{name:'NIGHT 2 STARTED',exact:true}).waitFor();await continueReport(page);
 const nameBefore=await page.locator('.player-pass h2').textContent();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'RESUME SAVED MATCH',exact:true}).click();const gate=page.getByRole('button',{name:'SHOW SAVED TURN',exact:true});if(await gate.count())await gate.click();await page.locator('.screen-pass').waitFor();assert.equal(await page.locator('.player-pass h2').textContent(),nameBefore);
 const select=async name=>page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:name})}).click();
 for(let i=0;i<4;i++){
  assert.equal(await page.getByRole('button',{name:/SHOW YOUR ROLE/}).isDisabled(),false);assert.equal(await page.locator('.reveal-sound-notice').count(),0);assert.equal(await page.getByRole('button',{name:'SHOW ROLE WITHOUT SOUND',exact:true}).count(),0);
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__starts.length),0);assert.equal(await page.locator('.reveal-sound-notice').count(),0);
  if(await page.locator('.action h2').textContent()==='Werewolf'){await select(villagers[0]);await page.getByRole('button',{name:'COMPLETE ACTION',exact:true}).click();}else await page.getByRole('button',{name:'SKIP',exact:true}).click();
 }
 assert.equal(await page.evaluate(()=>__decoded),0,'recovered Night 2 must not prepare reveal buffers');assert.ok(await page.evaluate(()=>__notes>0&&__vibrations.some(n=>n>0)));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.card-reveal.v1'))),{enabled:true,volume:65});
 report.checks.push('recovered Night 2: four normal reveals, zero reveal playback/decoding/loading prompts; other button effects and haptics preserved; device preference unchanged');
 await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();for(let i=0;i<3;i++){if(await page.locator('.voter-name').textContent()===wolf)await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();else{await select(wolf);await page.getByRole('button',{name:'VOTE',exact:true}).click();}}await continueReport(page);await page.getByRole('heading',{name:'VILLAGE WINS',exact:true}).waitFor();
 await page.getByRole('button',{name:'START AGAIN',exact:true}).click();await page.getByRole('heading',{name:'NIGHT 1 STARTED',exact:true}).waitFor();await continueReport(page);await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();await page.waitForFunction(()=>__starts.length===1);report.replayStarts=await page.evaluate(()=>__starts);assert.ok(report.replayStarts[0].time-report.replayStarts[0].click>=245);report.checks.push('START AGAIN resets to Night 1 and enables reveal audio again');
 assert.deepEqual(report.errors,[]);await writeFile(output+'/results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
