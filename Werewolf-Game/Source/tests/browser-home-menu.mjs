import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),base=process.env.BASE_URL||'http://127.0.0.1:3001/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[];
async function audit(page){
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.allSettled(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished));});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
 assert.deepEqual(violations,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
try{
 const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('werewolf.names')){localStorage.setItem('werewolf.names',JSON.stringify(['Alex','Blair','Casey','Drew']));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false}));localStorage.setItem('home-menu-sentinel','preserve');}});
 await page.goto(base,{waitUntil:'networkidle'});await mkdir('.cache/results',{recursive:true});
 const gear=page.getByRole('button',{name:'SETTINGS',exact:true});
 for(const [width,height,font]of [[320,700,16],[390,844,16],[527,650,16],[768,1024,16],[320,700,32],[844,390,32]]){
  await page.setViewportSize({width,height});await page.evaluate(font=>document.documentElement.style.fontSize=font+'px',font);
  assert.equal(await page.locator('.offline-notice,.home-feedback').count(),0);assert.equal(await gear.textContent(),'');
  const [g,start,how,roles]=await Promise.all([gear.boundingBox(),page.getByRole('button',{name:'START GAME',exact:true}).boundingBox(),page.getByRole('button',{name:'HOW TO PLAY',exact:true}).boundingBox(),page.getByRole('button',{name:'ROLE RULEBOOK',exact:true}).boundingBox()]);
  assert.ok(g.width>=44&&g.height>=44);assert.ok(g.y<=16&&g.x+g.width>=width-16);
  assert.ok(Math.abs(how.y-roles.y)<1);assert.ok(Math.abs(how.width-roles.width)<1);assert.ok(how.x+how.width<roles.x);assert.ok(start.width>how.width*1.9);assert.ok(start.y+start.height<=how.y);
  for(const b of [start,how,roles])assert.ok(b.height>=44);
  await audit(page);await page.screenshot({path:`.cache/results/home-menu-${width}-${font}.png`});
  const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await gear.click();const dialog=page.getByRole('dialog',{name:'SETTINGS',exact:true});await dialog.waitFor();await dialog.getByRole('heading',{name:'OFFLINE & UPDATES',exact:true}).waitFor();assert.equal(await page.locator('.offline-notice').count(),1);await audit(page);
  await dialog.getByRole('button',{name:'DONE',exact:true}).click();assert.ok(await gear.evaluate(e=>e===document.activeElement));assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),before);assert.equal(await page.locator('.offline-notice').count(),0);
  checks.push(`${width}x${height}/${font}px: equal side-by-side help links, full-width Start, corner touch-sized gear, Settings-only offline controls, focus/storage preservation and two accessibility audits`);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='16px');
 await page.getByRole('button',{name:'HOW TO PLAY',exact:true}).click();await page.getByRole('button',{name:'GOT IT',exact:true}).click();
 await page.getByRole('button',{name:'ROLE RULEBOOK',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Close role rulebook',exact:true}).click();
 await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).waitFor();assert.equal(await page.locator('.offline-notice').count(),0);
 checks.push('all three navigation buttons retain their original destinations; offline panel does not follow into setup');
 assert.deepEqual(errors,[]);await writeFile('.cache/results/home-menu.json',JSON.stringify({checks,errors},null,2));console.log('Home menu browser passed: '+checks.join('; '));
}finally{await browser.close();}
