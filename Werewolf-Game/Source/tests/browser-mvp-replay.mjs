import {installGameEndProbe} from './helpers/game-end-probe.mjs';
import {continueReport} from './helpers/report-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {inspectRecovery} from '../src/match-recovery.ts';
const require=createRequire(import.meta.url),base=process.env.BASE_URL||'http://127.0.0.1:3009/',output=process.env.RESULT_SCREENSHOT_DIR||'.cache/mvp-browser';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],errors=[];
try{
 for(const config of [{width:390,height:844,scale:1,recovery:true},{width:1064,height:961,scale:1,recovery:false},{width:320,height:568,scale:2,recovery:true},{width:568,height:320,scale:2,recovery:false}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const names=[config.scale===2?'RayaWithAVeryLongPlayerName':'Raya','Hana','Elena','Noah','Sara','Juno'];
  await page.addInitScript(({names,scale,audio})=>{
   if(audio){window.__audioPlays=[];const A=window.Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p);p.play=()=>{window.__audioPlays.push(p.src.split('/').pop());return play();};return p;};window.Audio.prototype=A.prototype;}
   Math.random=()=>0;
   if(!localStorage.getItem('werewolf.names')){
    localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,sounds:audio,buttonSounds:audio,haptics:false}));
    localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((name,i)=>[name.toLowerCase(),`./werewolf/avatars/player${[5,1,2,4,3,11][i]}.webp`]))));
   }
   document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize=16*scale+'px');
  },{names,scale:config.scale,audio:process.env.AUDIO==='1'});
  if(process.env.AUDIO==='1')await page.addInitScript(installGameEndProbe);
  await page.goto(base,{waitUntil:'networkidle'});
  async function saved(){const data=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),key=Object.keys(data).find(k=>k.startsWith('werewolf.match-recovery.v1:')&&!k.endsWith(':commit'));assert.ok(key);const r=inspectRecovery({getItem:k=>data[k]??null},key,'werewolf-match-1',()=>true);assert.equal(r.status,'ready');return r.checkpoint;}
  async function resume(screen){await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'RESUME SAVED MATCH',exact:true}).click();const reveal=page.getByRole('button',{name:'SHOW SAVED TURN',exact:true});if(await reveal.count())await reveal.click();await page.locator('.screen-'+screen).waitFor();}
  if(config.recovery){await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Save this match for recovery'}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await page.getByRole('button',{name:'DONE',exact:true}).click();}
  await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  if(process.env.HIDE_VOTED_ROLES==='1'){const toggle=page.getByRole('checkbox',{name:'Hide voted-out player roles',exact:true});assert.equal(await toggle.isChecked(),false);await toggle.check();assert.equal(await page.getByRole('checkbox',{name:'Show dead player’s role',exact:true}).isChecked(),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.settings')).hideVotedOutRoles),true);}
  for(const role of ['Werewolf','Doctor','Seer','Villager','Villager','Villager'])await page.getByRole('button',{name:'Add '+role,exact:true}).click();
  await page.getByRole('button',{name:/START GAME/}).click();const original=config.recovery?await saved():null;await continueReport(page);
  const select=async name=>page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:name})}).click();
  for(let i=0;i<6;i++){
   await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();const role=await page.locator('.action h2').innerText();
   if(['Doctor','Werewolf','Seer'].includes(role)){
    await select(role==='Seer'?'Juno':names[0]);await page.getByRole('button',{name:'COMPLETE ACTION',exact:true}).click();const hide=page.getByRole('button',{name:'OK · HIDE RESULT',exact:true});if(await hide.count())await hide.click();
   }else await page.getByRole('button',{name:'SKIP',exact:true}).click();
  }
  assert.ok(await page.getByText('No one was killed tonight.',{exact:true}).isVisible());
  if(process.env.AUDIO==='1')assert.equal(await page.evaluate(()=>__audioPlays.filter(x=>x==='cues-rooster.wav').length),0);
  if(config.recovery){const before=await saved();assert.ok(before.payload.refs.performance.events.some(e=>e.actor===3&&e.kind==='save'));await resume('morning');if(process.env.AUDIO==='1')assert.equal(await page.evaluate(()=>__audioPlays.filter(x=>x==='cues-rooster.wav').length),0);const after=await saved();assert.deepEqual(after.payload.refs.performance,before.payload.refs.performance);assert.equal(after.expiresAt,original.expiresAt);}
  await continueReport(page);await page.getByRole('button',{name:'END DISCUSSION →',exact:true}).click();
  for(let i=0;i<6;i++){
   const name=await page.locator('.voter-name').innerText();if(name==='Juno')await page.getByRole('button',{name:'SKIP VOTE',exact:true}).click();else{await select('Juno');await page.getByRole('button',{name:'VOTE',exact:true}).click();}
  }
  if(process.env.HIDE_VOTED_ROLES==='1'){
   const check=async()=>{assert.equal(await page.locator('.verdict-player h3').textContent(),'Juno');assert.equal(await page.locator('.verdict-role').count(),0);assert.doesNotMatch(await page.locator('.vote-verdict').textContent(),/werewolf/i);assert.doesNotMatch(await page.locator('.vote-verdict').evaluate(el=>[...el.querySelectorAll('[alt],[aria-label]')].map(n=>n.getAttribute('alt')||n.getAttribute('aria-label')).join(' ')),/werewolf/i);assert.ok(await page.locator('.vote-verdict img').evaluateAll(images=>images.every(i=>!/(?:^|\/)werewolf\.webp/.test(i.getAttribute('src')||''))));};await check();
   if(config.recovery){assert.equal((await saved()).payload.state.settings.hideVotedOutRoles,true);await resume('voteResult');await check();}
   await page.screenshot({path:`${output}/hidden-verdict-${config.width}-${config.scale}x.png`,fullPage:true});
  }
  await continueReport(page);await page.getByRole('heading',{name:'VILLAGE WINS',exact:true}).waitFor();
  await page.getByRole('button',{name:'START AGAIN',exact:true}).waitFor();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('START AGAIN'))?.disabled);
  if(process.env.AUDIO==='1'){await page.waitForFunction(()=>__endAudio.plays.length===1);assert.equal(await page.evaluate(()=>__endAudio.plays.length),1);assert.ok(await page.evaluate(()=>__audioPlays.every(x=>!x.startsWith('cues-win-')&&x!=='cues-mvp.wav')));}
  assert.equal(await page.locator('.match-player-card').count(),6);assert.equal(await page.locator('.is-mvp').count(),1);assert.equal(await page.locator('.is-mvp .match-player-info strong').textContent(),'Noah');
  assert.match(await page.locator('.is-mvp .performance-reason').innerText(),/1 save.*1 correct vote/);assert.match(await page.locator('.is-mvp .match-player-score').innerText(),/9 pts/);
  assert.equal(await page.getByRole('button',{name:'NIGHT RANKINGS',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'PLAYER RESULTS',exact:true}).count(),0);
  assert.equal(await page.locator('.match-player-info strong').last().textContent(),'Juno');assert.equal(await page.locator('.match-player-state').last().innerText(),'DEAD');
  const deadRow=page.getByRole('article',{name:'Juno: lost',exact:true});
  assert.match(await deadRow.locator('.match-player-score').innerText(),/-1 pts/,'one good attack +1, minus 2 for being dead');
  assert.match(await deadRow.locator('.performance-reason').innerText(),/Death −2 pts/);
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('button',{name:'DONE',exact:true}).click();
  assert.match(await deadRow.locator('.match-player-score').innerText(),/-1 pts/,'Settings/rerender cannot stack the deduction');

  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'results fit viewport');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const issues=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(issues,[]);
  await page.screenshot({path:`${output}/rankings-${config.width}-${config.scale}x.png`,fullPage:true});
  const standings=await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.rankings.v1'))),records=standings.records||standings;assert.ok(records.every(r=>r.played===1));
  await page.evaluate(()=>Math.random=()=>.99999);await page.getByRole('button',{name:'START AGAIN',exact:true}).click();await page.getByRole('heading',{name:'NIGHT 1 STARTED',exact:true}).waitFor();
  if(config.recovery){
   const next=await saved();assert.notEqual(next.matchId,original.matchId);assert.equal(next.payload.state.won,null);assert.deepEqual(next.payload.state.ballots,[]);assert.equal(next.payload.state.round,1);assert.equal(next.payload.refs.performance.events.length,0);assert.equal(next.payload.refs.performance.partial,false);
   for(const k of ['names','avatars','counts','randomCounts','settings'])assert.deepEqual(next.payload.state[k],original.payload.state[k],k);
   assert.notDeepEqual(next.payload.state.players.map(p=>p.role),original.payload.state.players.map(p=>p.role));
   for(const k of ['gamblerCorrect','stolenRoles','watchTargets','shieldUses','celebrityFameUsed','privateReports'])assert.deepEqual(next.payload.state[k],{},k);
   for(const k of ['lovers','curses','mindParasites','hypnosisExpiry'])assert.deepEqual(next.payload.refs[k],{},k);
   await resume('nightIntro');assert.equal((await saved()).matchId,next.matchId);assert.equal((await saved()).payload.refs.performance.events.length,0);
  }
  const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.rankings.v1')));assert.deepEqual(again.records||again,records);
  results.push({config,status:'PASS',mvp:'Noah',score:9});await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: factual Doctor MVP, single tiered list, 4 screen/text configurations, accessibility/overflow, setup-preserving shuffled replay, clean ledger/resources, recovery across old/new matches and once-only standings.');
}finally{await writeFile(`${output}/mvp-replay-results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
