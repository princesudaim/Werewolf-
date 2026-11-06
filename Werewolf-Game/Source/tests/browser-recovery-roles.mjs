import {continueReport} from './helpers/report-controls.mjs';
// Exhaustively compare all persisted fields before/after real reloads during a complete all-role night.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {roles} from '../src/werewolf-engine.ts';
import {inspectRecovery} from '../src/match-recovery.ts';
const base=process.env.BASE_URL||'http://127.0.0.1:3001/',executablePath=process.env.CHROMIUM_PATH;
if(!executablePath)throw Error('Set CHROMIUM_PATH');
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
async function saved(){const data=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),key=Object.keys(data).find(k=>k.startsWith('werewolf.match-recovery.v1:')&&!k.endsWith(':commit'));assert.ok(key,'save must still exist');const r=inspectRecovery({getItem:k=>data[k]??null},key,'werewolf-match-1',()=>true);assert.equal(r.status,'ready');assert.equal(await page.getByText(/Recovery could not be updated/).count(),0);return r.checkpoint;}
let roundtrips=0;
async function reload(){const before=await saved();await page.reload({waitUntil:'load'});await page.getByRole('button',{name:'RESUME SAVED MATCH'}).click();await page.getByRole('button',{name:'SHOW SAVED TURN'}).click();const after=await saved();assert.equal(after.matchId,before.matchId);assert.equal(after.expiresAt,before.expiresAt);assert.deepEqual(after.payload,before.payload,'all 71 state + 34 ref fields survive this turn exactly');roundtrips++;}
async function hideInfo(){while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).click();}
try{
 await page.addInitScript(({count})=>{localStorage.setItem('werewolf.names',JSON.stringify(Array.from({length:count},(_,i)=>'Player '+String(i+1).padStart(2,'0'))));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false,firstNightSafe:true,passiveWait:false,allRolesWait:false,roleWaitSeconds:{},journalistDrawing:false,charmerMessages:true}));},{count:Object.keys(roles).length});
 await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Save this match for recovery'}).click();await page.getByText(/Recovery is on for the next match/).waitFor();await page.getByRole('button',{name:'DONE',exact:true}).click();await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();for(const role of Object.values(roles))await page.getByRole('button',{name:'Add '+role.name,exact:true}).click();await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 const seen=[];
 for(let i=0;i<Object.keys(roles).length;i++){
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();const cp=await saved(),actor=cp.payload.state.players.find(p=>p.id===cp.payload.state.queue[cp.payload.state.index]);seen.push(actor.role);
  if(cp.payload.state.turnInfo.length){await reload();assert.ok(await page.locator('.private-info').isVisible());}await hideInfo();await reload();
  // Exercise the one-message allowance, including a reload after sending and before choosing a friend.
  const composer=page.locator('.friend-message-compose');
  const skipNames=['SKIP CHOICE','KEEP TARGET','SKIP AND TRY TO GET ONE','SKIP BLOCK','SAVE HYPNOSIS FOR LATER','SAVE REVIVAL FOR LATER','SAVE BULLET FOR LATER','SAVE WATER FOR LATER','SKIP THEFT','SKIP BET'];let done=false;
  for(const name of skipNames){const b=page.getByRole('button',{name,exact:true});if(await b.count()){await b.click();done=true;break;}}
  if(!done && actor.role==='journalist'){await page.getByPlaceholder('Write a headline').fill('helloooooo');await page.getByRole('button',{name:'PUBLISH IN THE MORNING',exact:true}).click();done=true;}
  if(!done){const skip=page.getByRole('button',{name:'SKIP',exact:true});if(await skip.count()){await skip.click();done=true;}}
  if(!done){const complete=page.getByRole('button',{name:'COMPLETE ACTION',exact:true});let selected=0;while(await complete.isDisabled()){await page.locator('.target:not(:disabled):not(.selected)').first().click();assert.ok(++selected<=2);}
   if(await composer.count()){await composer.locator('textarea').fill('Saved once, not twice.');await page.getByRole('button',{name:'SEND MESSAGE',exact:true}).click();await reload();assert.equal(await page.locator('.friend-message-compose').count(),0);assert.ok((await saved()).payload.refs.friendMessagesSent.has(actor.id));}
   await complete.click();
  }
  const hide=page.getByRole('button',{name:'OK · HIDE RESULT',exact:true});if(await hide.count()){await reload();await hide.click();}
  console.log(`Recovered turn ${i+1}/${Object.keys(roles).length}: ${roles[actor.role].name}`);
 }
 const final=await saved();assert.equal(final.payload.state.screen,'morning');assert.equal(final.payload.state.players.length,Object.keys(roles).length);assert.ok(final.payload.state.newspapers.some(p=>p.headline==='helloooooo'));assert.ok(final.payload.refs.friendInbox.some(m=>m.text==='Saved once, not twice.'));assert.equal(new Set(seen).size,Object.keys(roles).length-1,'Madman is intentionally an apparent Doctor/Mayor/Chef, not a new identity');assert.deepEqual(errors,[]);
 console.log(`All-role recovery passed: ${Object.keys(roles).length} natural turns, ${roundtrips} full 105-field snapshot comparisons, pending private messages, Friends send-once, stock/resources/attempts, original lineup, morning newspaper.`);
}finally{await browser.close();}
