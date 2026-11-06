import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {deal,roles} from '../src/werewolf-engine.ts';
import {continueReport} from './helpers/report-controls.mjs';
const require=createRequire(import.meta.url),base=process.env.BASE_URL||'http://127.0.0.1:3009/';
const report={checks:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
const names=Array.from({length:14},(_,i)=>`P${i+1}`),spec={werewolf:2,strongwolf:1,lonewolf:1,wolfpup:1,hypnowolf:1,villager:8};
const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,spec[r]||0]));
const oldRandom=Math.random;let lineup;try{Math.random=()=>.25;lineup=deal(names,counts);}finally{Math.random=oldRandom;}
const victim=lineup.find(p=>p.role==='villager').name,lone=lineup.find(p=>p.role==='lonewolf');
const click=name=>page.getByRole('button',{name,exact:true}).click();
async function dimensions(){return page.locator('.targets').evaluate(grid=>({height:grid.getBoundingClientRect().height,cards:[...grid.querySelectorAll('.target')].map(c=>{const r=c.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};})}));}
async function bounds(){
 const errors=await page.locator('.target-portrait').evaluateAll(photos=>photos.flatMap(photo=>{const a=photo.getBoundingClientRect();return[...photo.querySelectorAll('.wolf-claw-marker,.wolf-own-label,.wolf-target-count')].flatMap(mark=>{const r=mark.getBoundingClientRect();return r.left<a.left-1||r.top<a.top-1||r.right>a.right+1||r.bottom>a.bottom+1?['marker escaped avatar']:[];});}));
 assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
async function audit(){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);}
try{
 await mkdir('.cache/pack-targeting',{recursive:true});
 await page.addInitScript(names=>{
  localStorage.setItem('werewolf.names',JSON.stringify(names));
  localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,passiveWait:false,allRolesWait:false,sounds:false,buttonSounds:false,haptics:false}));
  localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map(n=>[n.toLowerCase(),'./werewolf/avatars/photo-01-20261106.png']))));
  for(const key of ['card-reveal','voted-out','game-end','morning-death'])localStorage.setItem('werewolf.'+key+'.v1',JSON.stringify({enabled:false,volume:50}));
 },names);
 await page.goto(base,{waitUntil:'networkidle'});await click('START GAME');await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const [role,n]of Object.entries(spec))for(let i=0;i<n;i++)await click('Add '+roles[role].name);
 await page.evaluate(()=>Math.random=()=>.25);await page.getByRole('button',{name:/START GAME/}).click();await continueReport(page);
 let earlier=[],strongSeen=false,ownTested=false,pupSeen=false,loneSeen=false;
 for(let i=0;i<14;i++){
  const name=await page.locator('.player-pass h2').textContent(),me=lineup.find(p=>p.name===name);
  await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
  while(await page.getByRole('button',{name:'OK · HIDE INFO',exact:true}).count())await click('OK · HIDE INFO');
  const role=await page.locator('.action h2').textContent();
  if(['Werewolf','Strong Werewolf','Hypnotizer Wolf','Wolf Pup'].includes(role)){
   assert.equal(await page.getByRole('button',{name:'TEAM CHOICES',exact:true}).count(),1);
   if(role==='Wolf Pup'){
    pupSeen=true;assert.equal(await page.locator('.wolf-own-choice').count(),0);assert.equal(await page.locator('.target:not(:disabled)').count(),0);await click('TEAM CHOICES');await page.getByRole('dialog',{name:'TEAM CHOICES',exact:true}).waitFor();await page.keyboard.press('Escape');await click('SKIP');continue;
   }
   const target=page.locator('.target').filter({has:page.locator('strong',{hasText:new RegExp('^'+victim+'$')})});
   const before=await dimensions();await target.click();assert.deepEqual(await dimensions(),before,'selection must not change any card/grid dimensions');
   assert.equal(await page.locator('.wolf-own-choice').count(),1);assert.equal(await target.locator('.role-target-marker').getAttribute('data-marker-role'),me.role);if(role==='Werewolf')await page.waitForFunction(()=>{const image=document.querySelector('.wolf-claw-marker');return image?.complete&&image.naturalWidth===517;});await bounds();
   if(role==='Werewolf'){
    const transparency=await target.locator('.wolf-claw-marker').evaluate(image=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let clear=0,red=0,opaqueWhite=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]===0)clear++;if(pixels[i+3]>200&&pixels[i]>pixels[i+1]+50)red++;if(pixels[i+3]>200&&pixels[i]>240&&pixels[i+1]>240&&pixels[i+2]>240)opaqueWhite++;}return{clear,red,opaqueWhite,inline:image.src.startsWith('data:image/png')};});
    assert.ok(transparency.clear>200000&&transparency.red>20000);assert.equal(transparency.opaqueWhite,0);assert.equal(transparency.inline,true,'claw is embedded in the offline HTML; no uncached image request');
   }
   if(!ownTested){
    await target.click();assert.equal(await page.locator('.wolf-own-choice').count(),0);assert.deepEqual(await dimensions(),before);
    const other=page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^(?!'+victim+'$)')})}).first();await other.click();assert.equal(await page.locator('.wolf-own-choice').count(),1);
    await target.click();assert.equal(await page.getByLabel(`Your choice: ${victim}`,{exact:true}).count(),1);assert.deepEqual(await dimensions(),before);ownTested=true;
   }
   if(role==='Strong Werewolf'){
    strongSeen=true;assert.equal(earlier.length,3);assert.equal(await target.locator('.wolf-target-count').textContent(),'3');
    for(const [width,height,text] of [[390,844,false],[320,700,false],[320,700,true],[844,390,false]]){
     await page.setViewportSize({width,height});await page.evaluate(text=>document.documentElement.style.fontSize=text?'200%':'',text);await bounds();
     const selected=await dimensions();await target.click();assert.deepEqual(await dimensions(),selected);await target.click();assert.deepEqual(await dimensions(),selected);
     await click('TEAM CHOICES');const dialog=page.getByRole('dialog',{name:'TEAM CHOICES',exact:true});await dialog.waitFor();assert.equal(await dialog.locator('li').count(),4);
     for(const previous of earlier)assert.ok((await dialog.textContent()).includes(previous.name));
     assert.ok(!(await dialog.textContent()).includes(lone.name+' (you)'));assert.match(await dialog.textContent(),/Hypnotize/);assert.match(await dialog.textContent(),/Attack/);
     await audit();await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Close team choices'}).evaluate(el=>el===document.activeElement),true);
     await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.getByRole('button',{name:'TEAM CHOICES',exact:true}).evaluate(el=>el===document.activeElement),true);
     assert.equal(await target.getAttribute('aria-pressed'),'true');await bounds();await audit();
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='');await target.scrollIntoViewIfNeeded();
    await page.screenshot({path:'.cache/pack-targeting/selected-targets.png',fullPage:true});await target.screenshot({path:'.cache/pack-targeting/selected-avatar.png'});

   }
   await click(role==='Hypnotizer Wolf'?'HYPNOTIZE':'COMPLETE ACTION');earlier.push(me);
  }else{
   assert.equal(await page.locator('.wolf-choice,.wolf-target-count,.pack-choices-button,.pack-choices-dialog').count(),0,'no pack choices leak to non-pack roles');
   if(role==='Lone Werewolf'){loneSeen=true;await page.locator('.target:not(:disabled)').filter({has:page.locator('strong',{hasText:new RegExp('^'+victim+'$')})}).click();await click('COMPLETE ACTION');}
   else await click('SKIP');
  }
  assert.equal(await page.locator('.pack-choices-dialog').count(),0);
 }
 assert.ok(strongSeen&&ownTested&&pupSeen&&loneSeen);assert.equal(await page.locator('.wolf-choice,.wolf-target-count,.pack-choices-button').count(),0,'private marks do not appear in the morning');
 assert.deepEqual(report.errors,[]);
 report.checks.push('Picking/deselecting/switching a victim never changes any card or grid dimensions; markers remain within avatar bounds','Three teammates plus your own choice remain compact and readable; full names and Attack/Hypnotize stay available through the touch/keyboard modal','390px,320px,320px at 200% text and landscape: no overflow, axe passes, modal traps focus/Escape restores focus and selection','Wolf Pup can read without selecting; Lone Werewolf and villagers never see pack choices; no mark or open dialog on next private turn/public morning');
 await writeFile('.cache/pack-targeting/browser.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{await context.close();await browser.close();}
