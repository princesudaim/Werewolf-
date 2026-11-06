import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {continueReport} from './helpers/report-controls.mjs';
import {installBallotProbe} from './helpers/ballot-audio-probe.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/',fallback=process.env.HTML_BALLOT_AUDIO==='1';
const catalog=JSON.parse(await readFile('src/ballot-audio-catalog.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={fallback,checks:[],scenarios:[],errors:[]};
try{
 for(const mode of ['mixed no elimination','final vote elimination','final skip elimination']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(fallback?{serviceWorkers:'block'}:{})});await context.addInitScript(installBallotProbe,{fallback});
  await context.addInitScript(mode=>{
   if(!localStorage.getItem('werewolf.names')){localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo','Ivy','Zoe']));localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:false,firstNightSafe:true,passiveWait:false,allRolesWait:false,secretVotes:mode!=='mixed no elimination'}));for(const key of ['card-reveal','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.voted-out.v1',JSON.stringify({enabled:true,volume:50}));}
   window.__ballotSample=0;Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:array=>{array.fill(window.__ballotSample);return array;}});
  },mode);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));const click=name=>page.getByRole('button',{name,exact:true}).click();await page.goto(base,{waitUntil:'networkidle'});
  if(!fallback){await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);const files=Object.values(catalog.cues).map(c=>c.file);assert.equal(await page.evaluate(async files=>{const names=await caches.keys(),found=new Set();for(const n of names){const c=await caches.open(n);for(const f of files)if(await c.match(new URL(f,location.href)))found.add(f);}return found.size;},files),3);await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>__ballotProbe.decoded.filter(f=>f.startsWith('ballot-')).length===3);}
  await click('SETTINGS');await page.getByRole('checkbox',{name:'Save this match for recovery',exact:true}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await click('DONE');await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();await click('Add Werewolf');for(let i=0;i<5;i++)await click('Add Villager');await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
  for(let i=0;i<6;i++){await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click('OK · HIDE INFO');await click('SKIP');}
  assert.equal(await page.evaluate(()=>__ballotProbe.plays.length),0,'night SKIP never plays vote clips');await continueReport(page);await click('END DISCUSSION →');
  const count=()=>page.evaluate(()=>__ballotProbe.plays.filter(p=>p.category==='ballot').length);
  if(mode==='mixed no elimination'){
   for(let i=0;i<6;i++){
    await page.evaluate(i=>window.__ballotSample=i===2?0xffffffff:0,i);const before=await count();assert.equal(await page.getByRole('button',{name:'VOTE',exact:true}).isDisabled(),true);
    if(i===3||i===4){await click('SETTINGS');if(i===3)await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();else{await page.getByRole('slider',{name:'Effects volume',exact:true}).focus();await page.keyboard.press('Home');}await click('DONE');}
    if(i===0||i===2){await page.locator('.target:not(:disabled)').nth(i===0?0:1).click();assert.equal(await count(),before,'target selection is silent for this pool');const oscillators=await page.evaluate(()=>__ballotProbe.oscillators);await click('VOTE');assert.equal(await page.evaluate(()=>__ballotProbe.oscillators),oscillators,'no generic tap layered onto the custom vote sound');}else await click('SKIP VOTE');
    if(i===3||i===4){assert.equal(await count(),before);await click('SETTINGS');if(i===3)await page.getByRole('checkbox',{name:'Button sounds',exact:true}).click();else{await page.getByRole('slider',{name:'Effects volume',exact:true}).focus();await page.keyboard.press('Home');for(let j=0;j<7;j++)await page.keyboard.press('ArrowRight');}await click('DONE');assert.equal(await count(),before,'unmute/volume restore must not replay the skipped sound');}
    else{await page.waitForFunction(n=>__ballotProbe.plays.filter(p=>p.category==='ballot').length===n,before+1);await page.waitForFunction(()=>__ballotProbe.plays.at(-1).ended);assert.equal(await page.evaluate(()=>__ballotProbe.plays.at(-1).stopped),false,'next voter/result screen must allow natural completion');}
   }
   await page.getByRole('heading',{name:'NO ONE WAS VOTED OUT',exact:true}).waitFor();const plays=await page.evaluate(()=>__ballotProbe.plays);assert.equal(plays.length,4);assert.equal(new Set(plays.slice(0,3).map(p=>p.file)).size,3);assert.ok(Math.abs(plays.at(-1).volume-.35)<.00001);assert.ok(await page.evaluate(()=>!__ballotProbe.html.includes('cues-divided.wav')),'no divided chime over final ballot');
   await page.reload({waitUntil:'networkidle'});await click('RESUME SAVED MATCH');await page.getByRole('heading',{name:'NO ONE WAS VOTED OUT',exact:true}).waitFor();assert.equal(await page.evaluate(()=>__ballotProbe.plays.length),0,'recovery never repeats a ballot sound');report.scenarios.push({mode,plays,recoveryNoReplay:true});
  }else{
   for(let i=0;i<6;i++){
    const voter=await page.locator('.voter-name').textContent(),before=await count();
    if(voter==='Ava'||(i===5&&mode==='final skip elimination'))await click('SKIP VOTE');
    else{await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:/^Ava$/})}).click();assert.equal(await count(),before);await click('VOTE');}
    assert.equal(await count(),i===5?5:i+1);
   }
   await page.getByRole('heading',{name:'THE VILLAGE HAS DECIDED!',exact:true}).waitFor();await page.waitForFunction(()=>__ballotProbe.plays.some(p=>p.category==='elimination'));const probe=await page.evaluate(()=>({...__ballotProbe,active:__ballotProbe.active.size})),last=probe.plays.at(-1);
   assert.equal(last.category,'elimination');assert.equal(last.ballotsAtStart,0);assert.ok(last.latencyMs>=0&&last.latencyMs<150,'elimination is not delayed by a queued vote confirmation');assert.equal(probe.maxVoices,1);assert.equal(probe.plays.filter(p=>p.category==='ballot').length,5);report.scenarios.push({mode,plays:probe.plays,maxVoices:probe.maxVoices});
  }
  const plays=report.scenarios.at(-1).plays;assert.ok(plays.every(p=>!p.loop&&p.latencyMs>=0&&p.latencyMs<150));const votes=plays.filter(p=>p.category==='ballot');for(let i=1;i<votes.length;i++)assert.notEqual(votes[i].file,votes[i-1].file);await context.close();
 }
 assert.deepEqual(report.errors,[]);report.checks.push('Verified three Drive recordings, real native sources/gains or native HTML fallback; offline cache on WebAudio runs','VOTE/SKIP only on commit, no target/night-skip playback or layered generic tap; same independent nonrepeating pool','Natural tails survive next voter/final no-elimination screen; rapid votes use one voice, no stacking','Button sounds/zero volume respected; volume35%, unmute and recovery never replay old requests','Final VOTE and final SKIP elimination prioritize immediate independent voted-out audio, never overlap or queue it');await mkdir('.cache/ballot-browser',{recursive:true});await writeFile('.cache/ballot-browser/'+(fallback?'fallback.json':'offline.json'),JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
