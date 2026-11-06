// Real native-browser Muter actions, day-only speech restriction, Police, recovery/offline and layout.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {roles,deal} from '../src/werewolf-engine.ts';
import {validateGameSnapshot} from '../src/game-snapshot.ts';
import {inspectRecovery,makeCheckpoint,writeRecovery} from '../src/match-recovery.ts';
import {continueReport} from './helpers/report-controls.mjs';
import {installMorningDeathProbe} from './helpers/morning-death-probe.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3009/',require=createRequire(import.meta.url),report={checks:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
const choose=(page,name)=>page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).click();
async function saved(page){const data=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),key=Object.keys(data).find(k=>k.startsWith('werewolf.match-recovery.v1:')&&!k.endsWith(':commit'));assert.ok(key);const result=inspectRecovery({getItem:k=>data[k]??null},key,'werewolf-match-1',validateGameSnapshot);assert.equal(result.status,'ready');return{data,key,cp:result.checkpoint};}
async function resume(page){const target=(await saved(page)).cp.payload.state.screen;await click(page,'RESUME SAVED MATCH');if(['action','privateResult','vote','discussion'].includes(target))await click(page,'SHOW SAVED TURN');await page.locator('.screen-'+target).waitFor();}
async function reveal(page){await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click(page,'OK · HIDE INFO');return page.locator('.action h2').textContent();}
async function audit(page,label){await page.evaluate(async()=>{await document.fonts.ready;await Promise.allSettled(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished));});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(issues,[],label);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');}
async function setup(names,spec,seed=0,recovery=true){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(!recovery?{serviceWorkers:'block'}:{})});await context.addInitScript(installMorningDeathProbe);
 await context.addInitScript(({names})=>{if(!localStorage.getItem('muter-test')){localStorage.setItem('muter-test','1');localStorage.setItem('werewolf.names',JSON.stringify(names));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:true,doctorSelfProtect:true,doctorRepeatProtect:true,policeNotifyBlocked:true,buttonSounds:false,sounds:false,haptics:false,passiveWait:false,allRolesWait:false}));for(const key of ['card-reveal','voted-out','game-end'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));localStorage.setItem('werewolf.morning-death.v1',JSON.stringify({enabled:true,volume:50}));}}, {names});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});
 if(recovery){await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await click(page,'SETTINGS');await page.getByRole('checkbox',{name:'Save this match for recovery',exact:true}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await click(page,'DONE');}
 await click(page,'START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();assert.equal(await page.getByRole('button',{name:'Add Muted',exact:true}).count(),0);for(const [role,count]of Object.entries(spec))for(let i=0;i<count;i++)await click(page,'Add '+roles[role].name);
 await page.evaluate(seed=>Math.random=()=>seed,seed);await page.getByRole('button',{name:/START GAME/}).click();return{context,page};
}
try{
 const names=['Ava','Noah','Mila','Leo','Ivy','Omar','Zoe','Ezra'];
 const {context,page}=await setup(names,{werewolf:1,muted:2,police:1,doctor:1,villager:3});
 let state=(await saved(page)).cp.payload.state,doctor=state.players.find(p=>p.role==='doctor').name,wolf=state.players.find(p=>p.role==='werewolf').name;
 const muters=state.players.filter(p=>p.role==='muted');let migrated=false;
 await continueReport(page);
 for(let i=0;i<8;i++){
  const name=await page.locator('.player-pass h2').textContent(),role=await reveal(page);
  if(role==='Muter'){
   assert.match(await page.locator('.description p').textContent(),/Each night you can mute someone/);assert.equal(await page.getByRole('button',{name:'MUTE PLAYER',exact:true}).isDisabled(),true);
   assert.equal(await page.locator('.target').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).isDisabled(),true);
   assert.equal(await page.locator('.target:not(:disabled)').count(),7);await choose(page,doctor);
   if(!migrated){
    await page.locator('.target.selected strong').waitFor();await audit(page,'Muter choice');const before=await saved(page),payload=structuredClone(before.cp.payload);delete payload.state.morningMuted;delete payload.refs.muteAttempts;
    const legacy=makeCheckpoint(payload,'werewolf-match-1',before.cp.matchId,Date.now(),before.cp),data={};assert.equal(writeRecovery({getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},before.key,legacy,validateGameSnapshot).ok,true);
    await page.evaluate(data=>{for(const [k,v]of Object.entries(data))localStorage.setItem(k,v);},data);await page.reload({waitUntil:'networkidle'});await resume(page);
    assert.deepEqual((await saved(page)).cp.payload.state.selected,before.cp.payload.state.selected);assert.equal((await saved(page)).cp.expiresAt,before.cp.expiresAt);assert.equal(await page.locator('.target.selected strong').textContent(),doctor);migrated=true;
   }
   await click(page,'MUTE PLAYER');const queued=await saved(page);assert.ok(queued.cp.payload.refs.muteAttempts.some(a=>queued.cp.payload.state.players[a.actor].name===name));await page.reload({waitUntil:'networkidle'});await resume(page);assert.deepEqual((await saved(page)).cp.payload.refs.muteAttempts,queued.cp.payload.refs.muteAttempts);
  }else if(role==='Doctor'){await choose(page,doctor);await click(page,'COMPLETE ACTION');}else if(role==='Police')await click(page,'SKIP BLOCK');else await click(page,'SKIP');
 }
 await page.getByRole('heading',{name:'NO ONE DIED',exact:true}).waitFor();assert.equal(await page.locator('.morning-muted').count(),1);assert.equal(await page.getByText(doctor+' was muted.',{exact:true}).count(),1);
 const news=await page.locator('.morning-muted').textContent();for(const m of muters)assert.ok(!news.includes(m.name));assert.equal(await page.evaluate(()=>__morningDeathAudio.plays.length),0);
 const morning=await saved(page);assert.equal(morning.cp.payload.state.morningMuted.length,1);await audit(page,'Morning announcement');
 await context.setOffline(true);await page.reload({waitUntil:'load'});await resume(page);assert.equal(await page.getByText(doctor+' was muted.',{exact:true}).count(),1);assert.equal((await saved(page)).cp.expiresAt,morning.cp.expiresAt);assert.equal(await page.evaluate(()=>__morningDeathAudio.plays.length),0);
 report.checks.push('Muter renamed in setup/private cards; speaks normally, cannot select self, can target any other living role, action needs a selection; two Muters announce a shared target once without revealing their identities');
 report.checks.push('pre-Muter checkpoint with selected target migrates behind privacy gates; queued actions survive reload, fixed expiry unchanged; offline morning reload preserves silence and does not play a death sound');
 await continueReport(page);await page.getByRole('heading',{name:'MUTED TODAY',exact:true}).waitFor();
 for(const [width,height,font]of [[320,700,32],[844,390,32],[390,844,16]]){await page.setViewportSize({width,height});await page.evaluate(f=>document.documentElement.style.fontSize=f+'px',font);await audit(page,'Muted discussion '+width+'/'+font);}
 await click(page,'END DISCUSSION →');let voted=false;
 for(let i=0;i<8;i++){if(await page.locator('.voter-name').textContent()===doctor){await choose(page,wolf);await click(page,'VOTE');voted=true;}else await click(page,'SKIP VOTE');}assert.ok(voted);
 await continueReport(page);assert.deepEqual((await saved(page)).cp.payload.state.morningMuted,[]);assert.deepEqual((await saved(page)).cp.payload.refs.muteAttempts,[]);await continueReport(page);
 for(let i=0;i<8;i++){
  const role=await reveal(page);if(role==='Muter')await click(page,'SKIP MUTE');else if(role==='Doctor'||role==='Werewolf'){await choose(page,doctor);await click(page,'COMPLETE ACTION');}else if(role==='Police')await click(page,'SKIP BLOCK');else await click(page,'SKIP');
 }
 await page.getByRole('heading',{name:'NO ONE DIED',exact:true}).waitFor();assert.equal(await page.locator('.morning-muted').count(),0);assert.equal(await page.evaluate(()=>__morningDeathAudio.plays.length),0);
 report.checks.push('muted player actually votes; restriction expires at the next night, muted Doctor still protects against the next wolf attack; both Muters may skip, no stale announcement; accessible no-overflow discussion at 320px/200% and landscape');await context.close();
 for(const seed of [0,0.5]){
  const names=['Ava','Noah','Mila','Leo'],spec={werewolf:1,muted:1,police:1,villager:1},counts=Object.fromEntries(Object.keys(roles).map(r=>[r,spec[r]||0]));let lineup;const old=Math.random;try{Math.random=()=>seed;lineup=deal(names,counts);}finally{Math.random=old;}
  const muter=lineup.find(p=>p.role==='muted'),police=lineup.find(p=>p.role==='police'),target=lineup.find(p=>p.role==='villager');assert.equal(muter.id<police.id,seed===0);
  const {context,page}=await setup(names,spec,seed,false);await continueReport(page);
  for(let i=0;i<4;i++){const role=await reveal(page);if(role==='Muter'){await choose(page,target.name);await click(page,'MUTE PLAYER');}else if(role==='Police'){await choose(page,muter.name);await click(page,'COMPLETE ACTION');}else await click(page,'SKIP');}
  await page.getByRole('heading',{name:'NO ONE DIED',exact:true}).waitFor();assert.equal(await page.locator('.morning-muted').count(),0);await page.getByText(muter.name+"'s ability was blocked last night",{exact:true}).waitFor();report.checks.push('Police cancels Muter when Police acts '+(seed===0?'after':'before')+' the Muter');await context.close();
 }
 assert.deepEqual(report.errors,[]);await mkdir('.cache/muter-browser',{recursive:true});await writeFile('.cache/muter-browser/result.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
