// Real release bytes, GitHub Pages-like project subpath and offline reopen.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const site=resolve(process.env.LAUNCH_SITE||'dist'),output=resolve(process.env.RESULT_SCREENSHOT_DIR||'.cache/launch-browser'),prefix='/Werewolf-/';
await mkdir(output,{recursive:true});
const expected={};async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name!=='Werewolf-Game.zip')expected[p.slice(site.length+1)]=await readFile(p);}}await walk(site);
const worker=await readFile(resolve(site,'sw.js'),'utf8'),digests=JSON.parse(worker.match(/const DIGESTS = (\{.*\});/)[1]);
const types={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://fixture.test').pathname);if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}const name=pathname.slice(prefix.length)||'index.html',path=resolve(site,name);if(!path.startsWith(site+sep)||!Object.hasOwn(expected,name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(name)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(expected[name]);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[],badResponses=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)badResponses.push([r.status(),r.url()]);});
 for(const [name,data]of Object.entries(expected)){const response=await context.request.get(base+name);assert.equal(response.status(),200,name);assert.deepEqual(await response.body(),data,name+' exact bytes');}
 await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:'START GAME',exact:true}).waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const scope=await page.evaluate(async()=>({scope:(await navigator.serviceWorker.ready).scope,script:navigator.serviceWorker.controller.scriptURL,caches:await caches.keys()}));assert.equal(scope.scope,base);assert.equal(scope.script,base+'sw.js');
 const cached=await page.evaluate(async()=>{const n=(await caches.keys()).find(n=>n.startsWith('nightfall-shell-')&&n.includes(encodeURIComponent('/Werewolf-/'))&&!n.includes('staging'));if(!n)throw Error('No project-scoped cache');const cache=await caches.open(n);return(await cache.keys()).map(r=>r.url);});
 for(const name of Object.keys(digests))assert.ok(cached.includes(base+(name==='./'?'':name)),name+' cached under project subpath');
 await page.screenshot({path:output+'/project-subpath-home.png',fullPage:true});await context.setOffline(true);await page.reload({waitUntil:'load'});await page.getByRole('button',{name:'START GAME',exact:true}).waitFor();assert.equal(await page.locator('.home-content h1').textContent(),'WEREWOLF');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 // Reach the actual new setup setting entirely offline.
 await page.evaluate(()=>localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo'])));await page.reload({waitUntil:'load'});await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:/CHOOSE ROLES/}).click();const toggle=page.getByRole('checkbox',{name:'Hide voted-out player roles',exact:true});assert.equal(await toggle.isChecked(),false);await toggle.check();assert.equal(await page.getByRole('checkbox',{name:'Show dead player’s role',exact:true}).isChecked(),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.settings')).hideVotedOutRoles),true);
 await toggle.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/offline-new-setting.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 const report={status:'PASS',site_files:Object.keys(expected).length,offline_entries:Object.keys(digests).length,project_subpath:prefix,worker_scope_correct:true,all_http_bytes_exact:true,offline_reopen:true,new_setting_offline:true,index_sha256:createHash('sha256').update(expected['index.html']).digest('hex'),errors,badResponses};await writeFile(output+'/launch-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS: exact release files at /Werewolf-/; relative assets, project-scoped worker, all offline entries, offline reopen and new setup toggle; no page/asset errors.');await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
