// End-screen layout fixture using the actual production component and styles.
// Optional BEFORE_SOURCE points to a pre-change src directory for measured comparison.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url),site=resolve('dist'),output=resolve(process.env.RESULT_SCREENSHOT_DIR||'.cache/compact-results-browser');
await mkdir(output,{recursive:true});
const players=[{id:0,name:'Raya',role:'doctor',alive:false},{id:1,name:'Noah',role:'villager',alive:true},{id:2,name:'Sara',role:'seer',alive:false},{id:3,name:'Mila',role:'gambler',alive:false,escaped:true},{id:4,name:'Remy',role:'werewolf',alive:true},{id:5,name:'Leo',role:'serialkiller',alive:false},{id:6,name:'ElenaWithAVeryLongPlayerName',role:'hypnowolf',alive:true}];
const props={players,avatars:Object.fromEntries(players.map((p,i)=>[p.name.toLowerCase(),`./werewolf/avatars/player${[1,2,3,4,5,11,13][i]}.webp`])),side:'village',title:process.env.HEADLINE_TEXT||'VILLAGE WINS',winnerIds:[1,2,3],madmen:[6],corrupted:[],round:4,rankingError:false,performance:{events:[{key:'save1',actor:0,kind:'save',good:true},{key:'save2',actor:0,kind:'save',good:true},{key:'vote',actor:0,kind:'vote',good:true}],partial:false,recoveryEnabled:false}};
const variants={after:resolve('src')};if(process.env.BEFORE_SOURCE)variants.before=resolve(process.env.BEFORE_SOURCE);
const bundles={},styles={};
for(const [key,src] of Object.entries(variants)){
 const input=`import React from 'react';import{createRoot}from'react-dom/client';import{MatchResults}from${JSON.stringify(resolve(src,'MatchResults.tsx'))};createRoot(document.getElementById('root')).render(<main className="app screen-end day"><div className="shell"><MatchResults {...${JSON.stringify(props)}} onMenu={()=>{}} onRestart={()=>{}}/></div></main>);`;
 bundles[key]=(await build({stdin:{contents:input,resolveDir:process.cwd(),loader:'tsx'},nodePaths:[resolve('node_modules')],bundle:true,write:false,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}})).outputFiles[0].contents;
 // Match the app's import order: legacy shared CSS may follow the ranking CSS.
 styles[key]=(await Promise.all(['match-ranking.css','werewolf.css','accessibility.css','gameplay-accessibility.css'].map(p=>readFile(resolve(src,p),'utf8')))).join('\n');
}
const types={'.webp':'image/webp','.png':'image/png','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{
 const match=new URL(req.url,'http://fixture.test').pathname.match(/^\/(before|after)\/(.*)$/)||[null,'after',new URL(req.url,'http://fixture.test').pathname.slice(1)];if(!match||!variants[match[1]]){res.writeHead(404).end();return;}
 const [,key,path]=match;res.setHeader('Cache-Control','no-store');
 if(path===''){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Results layout fixture</title><link rel="stylesheet" href="styles.css"></head><body><div id="root"></div><script src="fixture.js"></script></body></html>');}
 else if(path==='styles.css'){res.setHeader('Content-Type','text/css');res.end(styles[key]);}
 else if(path==='fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundles[key]);}
 else{res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(resolve(site,path)));}
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
try{
 for(const config of [{width:390,height:844,scale:1},{width:320,height:700,scale:1},{width:1064,height:961,scale:1},{width:568,height:320,scale:1},{width:320,height:568,scale:2},{width:390,height:844,scale:2},{width:568,height:320,scale:2}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},reducedMotion:'reduce'});const measured={};
  for(const key of Object.keys(variants)){
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(scale=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize=16*scale+'px'),config.scale);
   await page.goto(base+key+'/',{waitUntil:'networkidle'});await page.locator('.match-player-list').waitFor();await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>{
    const list=document.querySelector('.match-player-list'),rows=[...document.querySelectorAll('.match-player-frame')],mvp=document.querySelector('.is-mvp');
    const size=el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height});
    return{list:size(list),rows:rows.map(el=>({...size(el),mvp:el.classList.contains('is-mvp')})),mvpLabelHeight:mvp.querySelector('.mvp-label').getBoundingClientRect().height,mvpLabelLine:parseFloat(getComputedStyle(mvp.querySelector('.mvp-label')).lineHeight),mvpName:parseFloat(getComputedStyle(mvp.querySelector('strong')).fontSize),mvpRole:parseFloat(getComputedStyle(mvp.querySelector('.match-player-role')).fontSize),portrait:size(mvp.querySelector('.outcome-portrait')),overflow:document.documentElement.scrollWidth>innerWidth+1,regularName:parseFloat(getComputedStyle(document.querySelector('.match-player-frame:not(.is-mvp) strong')).fontSize),regularRole:parseFloat(getComputedStyle(document.querySelector('.match-player-frame:not(.is-mvp) .match-player-role')).fontSize)};
   });measured[key]=layout;
   if(key==='after'){
    assert.equal(await page.getByRole('heading',{name:props.title,exact:true}).count(),1);assert.equal(layout.overflow,false,JSON.stringify(config));assert.equal(layout.rows.length,7);assert.equal(await page.locator('.is-mvp').count(),1);assert.equal(await page.locator('.is-mvp strong').textContent(),'Raya');assert.ok(layout.mvpLabelHeight<=layout.mvpLabelLine+1,'MVP label stays on one line at enlarged text');assert.ok(layout.mvpName>layout.regularName);assert.ok(layout.mvpRole>layout.regularRole);assert.ok(layout.portrait.width>=56);
    for(const row of layout.rows)assert.ok(Math.abs(row.width-layout.list.width)<1,'rows keep full list width');
    for(const p of players){const card=page.getByRole('article',{name:new RegExp('^'+p.name+':')});assert.equal(await card.count(),1);for(const selector of ['strong','.match-player-role','.match-player-state','.performance-reason','.match-player-score']){
     assert.ok((await card.locator(selector).textContent()).trim());
     assert.ok(await card.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),parent=el.closest('.match-player-card').getBoundingClientRect();return r.left>=parent.left-1&&r.right<=parent.right+1&&r.top>=parent.top-1&&r.bottom<=parent.bottom+1;}),'unclipped '+selector+' '+p.name);
    }}
    assert.equal(await page.locator('.outcome-avatar img').count(),players.length);assert.ok(await page.locator('.outcome-avatar img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);
    await page.screenshot({path:output+`/rankings-${config.width}-${config.scale}x.png`,fullPage:true});
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  if(measured.before){assert.ok(measured.after.mvpName>measured.before.mvpName);assert.ok(measured.after.mvpRole>measured.before.mvpRole);assert.ok(Math.abs(measured.before.list.width-measured.after.list.width)<1,'list width unchanged');
   if(config.scale===1){const height=data=>data.rows.filter(r=>!r.mvp).reduce((sum,r)=>sum+r.height,0);assert.ok(height(measured.after)<height(measured.before),'normal rows shorter '+JSON.stringify(config));}
  }
  results.push({config,...measured});await context.close();
 }
 await writeFile(output+'/layout-results.json',JSON.stringify(results,null,2)+'\n');console.log('PASS: 7 normal/enlarged phone/tablet/landscape layouts; full-width shorter rows, larger MVP identity, every detail/portrait, no clipping/overflow, accessibility; optional before/after measurements.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
