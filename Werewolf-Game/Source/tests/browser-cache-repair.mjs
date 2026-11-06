import {continueReport} from './helpers/report-controls.mjs';
// Real production build: scoped HTTP fixture, no live-preview or user-cache mutation.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {inspectRecovery} from '../src/match-recovery.ts';
const require=createRequire(import.meta.url),dist=resolve('dist'),reports=[],errors=[];
const html=await readFile(resolve(dist,'index.html'),'utf8'),worker=await readFile(resolve(dist,'sw.js'),'utf8');
const manifest=JSON.parse(await readFile(resolve(dist,'manifest.webmanifest'),'utf8'));
const originalDigests=JSON.parse(worker.match(/const DIGESTS = (\{.*\});/)[1]);
const versions={alpha:'one',beta:'one'};let corrupt=null,mixed=false;
const fixtureHTML=revision=>html.replace('</head>',`<script>window.__fixtureRevision=${JSON.stringify(revision)}</script></head>`);
const fixtureManifest=revision=>JSON.stringify({...manifest,fixtureRevision:revision});
const digest=bytes=>({sha256:createHash('sha256').update(bytes).digest('hex'),size:Buffer.byteLength(bytes)});
const types={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{
 const match=new URL(req.url,'http://fixture.test').pathname.match(/^\/(alpha|beta)\/(.*)$/);if(!match){res.writeHead(404).end();return;}
 const [,scope,path]=match,revision=versions[scope];res.setHeader('Cache-Control','no-store');
 if(path==='sw.js'){const digests={...originalDigests,'./':digest(fixtureHTML(revision)),'index.html':digest(fixtureHTML(revision)),'manifest.webmanifest':digest(fixtureManifest(revision))};res.setHeader('Content-Type','text/javascript');res.end(worker.replace(/const CACHE = PREFIX \+ "[^"]+";/,`const CACHE = PREFIX + "${revision}";`).replace(/const DIGESTS = \{.*\};/,`const DIGESTS = ${JSON.stringify(digests)};`));return;}
 if(path===''||path==='index.html'){res.setHeader('Content-Type','text/html');res.end(fixtureHTML(revision)+(mixed&&scope==='alpha'?'<!-- non-atomic host -->':''));return;}
 const file=resolve(dist,path);if(!file.startsWith(dist+sep)||path.endsWith('.zip')){res.writeHead(404).end();return;}
 let bytes=path==='manifest.webmanifest'?Buffer.from(fixtureManifest(revision)):await readFile(file);
 if(scope==='alpha'&&path===corrupt){bytes=Buffer.from(bytes);bytes[0]^=1;}
 res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
const base=`http://127.0.0.1:${server.address().port}/`,cache=(scope,revision)=>`nightfall-shell-${encodeURIComponent('/'+scope+'/')}:${revision}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>{if(localStorage.getItem('werewolf.names'))return;localStorage.setItem('werewolf.names',JSON.stringify(['Alex','Blair','Casey','Drew']));localStorage.setItem('werewolf.rankings.v1',JSON.stringify({version:1,records:[{name:'Alex',played:5,wins:3}],credits:{}}));localStorage.setItem('werewolf.avatars.v1',JSON.stringify({alex:'./werewolf/avatars/player20.webp'}));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:true,sounds:false,buttonSounds:false,haptics:false,passiveWait:false,allRolesWait:false}));});
 async function pageFor(scope){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+scope+'/',{waitUntil:'networkidle'});await p.evaluate(()=>navigator.serviceWorker.ready);if(!await p.evaluate(()=>!!navigator.serviceWorker.controller))await p.reload({waitUntil:'load'});await p.getByRole('button',{name:'SETTINGS',exact:true}).click();await p.getByText('Offline files are present on this device.',{exact:true}).waitFor();await p.getByRole('button',{name:'DONE',exact:true}).click();return p;}
 let primary=await pageFor('alpha');const menu=await pageFor('alpha'),beta=await pageFor('beta');await menu.getByRole('button',{name:'SETTINGS',exact:true}).click();
 const storage=page=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 async function saved(page){const data=await storage(page),key=Object.keys(data).find(k=>k.startsWith('werewolf.match-recovery.v1:')&&!k.endsWith(':commit'));assert.ok(key);const result=inspectRecovery({getItem:k=>data[k]??null},key,'werewolf-match-1',()=>true);assert.equal(result.status,'ready');return {data,key,cp:result.checkpoint};}
 async function signature(page,name){return page.evaluate(async name=>{const c=await caches.open(name),result={};for(const req of await c.keys()){const bytes=await (await c.match(req)).arrayBuffer();result[req.url]=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}return result;},name);}
 const betaSignature=await signature(beta,cache('beta','one'));
 await beta.evaluate(async()=>{const c=await caches.open('unknown-owner-legacy');await c.put(location.origin+'/alpha/manifest.webmanifest',new Response('foreign trap'));});
 await primary.getByRole('button',{name:'SETTINGS',exact:true}).click();await primary.getByRole('checkbox',{name:'Save this match for recovery'}).click();await primary.getByText(/Recovery is on for the next match/).waitFor();await primary.getByRole('button',{name:'DONE',exact:true}).click();await primary.getByRole('button',{name:'START GAME',exact:true}).click();await primary.getByRole('button',{name:/CHOOSE ROLES/}).click();
 for(const role of ['Werewolf','Villager','Doctor','Seer'])await primary.getByRole('button',{name:'Add '+role,exact:true}).click();
 await primary.getByRole('button',{name:/START GAME/}).click();await continueReport(primary);await primary.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
 const before=await saved(primary),role=await primary.locator('.action h2').textContent(),old=await primary.locator('.action').elementHandle();let navigations=0;primary.on('framenavigated',frame=>{if(frame===primary.mainFrame())navigations++;});await primary.evaluate(()=>window.__repairSentinel='unchanged');
 const dataBefore=await storage(primary);assert.equal(await primary.locator('.offline-notice').count(),0);
 reports.push('opted-in private match and separate menu share a version without exposing repair controls privately');
 // Installation must reject a non-atomic host before a candidate can wait/activate.
 versions.alpha='two';mixed=true;
 await primary.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const redundant=new Promise(resolve=>r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant')resolve();});},{once:true}));await r.update();await redundant;});
 assert.equal(await primary.evaluate(async key=>(await (await caches.open(key)).keys()).length,cache('alpha','two')),0);assert.equal(await primary.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).fixtureRevision),'one');versions.alpha='one';mixed=false;
 reports.push('partially published host fails checksum-verified installation and preserves old active assets');
 await menu.evaluate(async key=>{const c=await caches.open(key);await c.delete(new URL('./manifest.webmanifest',location.href));await c.delete(new URL('./werewolf/doctor.webp',location.href));},cache('alpha','one'));
 await menu.getByRole('button',{name:'CHECK OFFLINE FILES',exact:true}).click();await menu.getByText(/Some offline files are missing/).waitFor();await menu.locator('.offline-repair summary').click();
 const repairControl=await menu.getByRole('button',{name:'DOWNLOAD MISSING FILES',exact:true}).elementHandle();const contentsBefore=await signature(menu,cache('alpha','one'));
 corrupt='werewolf/doctor.webp';await repairControl.click();await menu.getByText(/host has different file contents/).waitFor();assert.deepEqual(await signature(menu,cache('alpha','one')),contentsBefore);assert.deepEqual(await storage(menu),dataBefore);
 reports.push('same-length corrupt download is refused before any staged file is written; recovery/profile data unchanged');
 corrupt=null;await context.setOffline(true);await repairControl.click();await menu.getByText(/Repair could not finish/).waitFor();assert.deepEqual(await signature(menu,cache('alpha','one')),contentsBefore);await context.setOffline(false);
 reports.push('offline repair failure keeps valid cached files and saved match data');
 await repairControl.click();await menu.getByText(/Missing files restored/).waitFor();await menu.getByText('Offline files are present on this device.',{exact:true}).waitFor();assert.ok(await repairControl.evaluate(e=>e===document.activeElement));
 assert.ok(await old.evaluate(e=>e.isConnected));assert.equal(await primary.locator('.action h2').textContent(),role);assert.equal(await primary.evaluate(()=>window.__repairSentinel),'unchanged');assert.equal(navigations,0);assert.deepEqual(await storage(menu),dataBefore);assert.deepEqual(await signature(beta,cache('beta','one')),betaSignature);
 reports.push('explicit successful repair retains focused control, active private DOM, deadlines, all local data and sibling cache');
 // Remove both shell copies. Reload must render an embedded neutral page without fetching future HTML.
 await menu.evaluate(async key=>{const c=await caches.open(key);await c.delete(new URL('./',location.href));await c.delete(new URL('./index.html',location.href));},cache('alpha','one'));
 const response=await menu.reload({waitUntil:'load'});assert.equal(response.status(),503);await menu.getByRole('heading',{name:'Offline game files need repair',exact:true}).waitFor();
 const neutralText=await menu.locator('body').textContent();for(const name of ['Alex','Blair','Casey','Drew'])assert.ok(!neutralText.includes(name));assert.equal(await menu.locator('.action,.role-art,.private-info').count(),0);assert.deepEqual(await storage(menu),dataBefore);
 assert.ok(!response.headers()['content-security-policy'].includes('frame-ancestors'));
 await mkdir('.cache/results',{recursive:true});await menu.screenshot({path:'.cache/results/cache-repair-neutral.png',fullPage:true});
 reports.push('missing entry shell renders neutral self-contained repair screen without reading/revealing/erasing secrets or blocking preview embedding');
 for(const [width,height,font]of [[390,844,16],[320,700,32],[844,390,32]]){
  await menu.setViewportSize({width,height});await menu.evaluate(font=>document.documentElement.style.fontSize=font+'px',font);await menu.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await menu.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);assert.ok(await menu.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===320)await menu.screenshot({path:'.cache/results/cache-repair-neutral-large.png',fullPage:true});
 }
 await menu.setViewportSize({width:390,height:844});await menu.evaluate(()=>document.documentElement.style.fontSize='16px');
 reports.push('neutral repair screen passes configured normal/enlarged portrait/landscape accessibility and overflow audits');
 await menu.getByRole('button',{name:'DOWNLOAD MISSING FILES',exact:true}).click();await menu.getByText(/Missing files restored. Open the game/).waitFor();assert.deepEqual(await storage(menu),dataBefore);assert.equal(navigations,0);assert.ok(await old.evaluate(e=>e.isConnected));
 await primary.close();await menu.getByRole('link',{name:'OPEN GAME',exact:true}).click();await menu.getByRole('heading',{name:'SAVED MATCH',exact:true}).waitFor();
 assert.equal(await menu.locator('.action,.role-art,.private-info').count(),0);const restoredGate=await saved(menu);assert.equal(restoredGate.cp.matchId,before.cp.matchId);assert.equal(restoredGate.cp.expiresAt,before.cp.expiresAt);
 await menu.getByRole('button',{name:'RESUME SAVED MATCH',exact:true}).click();await menu.getByRole('heading',{name:'CONTINUE PRIVATELY',exact:true}).waitFor();assert.equal(await menu.locator('.action,.role-art').count(),0);await menu.getByRole('button',{name:'SHOW SAVED TURN',exact:true}).click();assert.equal(await menu.locator('.action h2').textContent(),role);assert.deepEqual((await saved(menu)).cp.payload,before.cp.payload);
 reports.push('repaired shell opens only on explicit link, then restores exact saved payload through neutral/private gates and original expiry');
 // Whole-cache loss while another document has a saved active private turn.
 const privateNode=await menu.locator('.action').elementHandle(),retained=await storage(menu);await menu.evaluate(key=>caches.delete(key),cache('alpha','one'));const fallback=await context.newPage();fallback.on('pageerror',e=>errors.push(e.message));await context.setOffline(true);await fallback.goto(base+'alpha/',{waitUntil:'load'});await fallback.getByRole('heading',{name:'Offline game files need repair',exact:true}).waitFor();await fallback.getByRole('button',{name:'DOWNLOAD MISSING FILES',exact:true}).click();await fallback.getByText(/Repair could not finish/).waitFor();assert.deepEqual(await storage(fallback),retained);assert.ok(await privateNode.evaluate(e=>e.isConnected));
 reports.push('whole-cache eviction still has offline neutral fallback; failed offline refill leaves active match and saved data intact');
 await context.setOffline(false);await fallback.getByRole('button',{name:'DOWNLOAD MISSING FILES',exact:true}).click();await fallback.getByText(/Missing files restored. Open the game/).waitFor();assert.deepEqual(await storage(fallback),retained);assert.deepEqual(await signature(beta,cache('beta','one')),betaSignature);assert.ok(await privateNode.evaluate(e=>e.isConnected));
 reports.push('full verified refill restores all expected entries without touching active match, recovery or unrelated installation');
 // Old-version repair is refused when only a newer shell is hosted; an explicit update can wait safely.
 await fallback.evaluate(async key=>{const c=await caches.open(key);await c.delete(new URL('./',location.href));await c.delete(new URL('./index.html',location.href));},cache('alpha','one'));
 await fallback.reload({waitUntil:'load'});versions.alpha='two';await fallback.getByRole('button',{name:'DOWNLOAD MISSING FILES',exact:true}).click();await fallback.getByText(/host has different file contents/).waitFor();assert.deepEqual(await storage(fallback),retained);await fallback.getByRole('button',{name:'CHECK FOR UPDATE',exact:true}).click();
 await beta.evaluate(async base=>{window.__alpha=await navigator.serviceWorker.getRegistration(base+'alpha/');},base);await beta.waitForFunction(()=>window.__alpha.waiting?.state==='installed');assert.ok(await privateNode.evaluate(e=>e.isConnected));
 reports.push('newer hosted shell is never substituted; explicit update waits for all old private/fallback documents to close');
 await beta.evaluate(()=>{const w=window.__alpha.waiting;window.__activated=new Promise(resolve=>w.addEventListener('statechange',()=>{if(w.state==='activated')resolve();}));});await menu.close();await fallback.close();await beta.evaluate(()=>window.__activated);
 primary=await context.newPage();primary.on('pageerror',e=>errors.push(e.message));await primary.goto(base+'alpha/',{waitUntil:'load'});await primary.getByRole('heading',{name:'SAVED MATCH',exact:true}).waitFor();assert.equal(await primary.evaluate(()=>window.__fixtureRevision),'two');assert.equal((await saved(primary)).cp.matchId,before.cp.matchId);assert.equal(await primary.locator('.role-art,.action').count(),0);assert.deepEqual(await signature(beta,cache('beta','one')),betaSignature);assert.ok((await beta.evaluate(()=>caches.keys())).includes('unknown-owner-legacy'));
 reports.push('closing old documents activates coherent new build and retains resumable match, private gate and foreign caches');
 assert.deepEqual(errors,[]);await context.close();console.log('Cache repair browser passed: '+reports.join('; ')+'.');
}finally{await mkdir('.cache/results',{recursive:true});await writeFile('.cache/results/cache-repair.json',JSON.stringify({reports,errors},null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
