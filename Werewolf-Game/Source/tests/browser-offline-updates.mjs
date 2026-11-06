// Isolated real-build fixture; never edits the running game or its cache.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),dist=resolve('dist');
const versions={alpha:'one',beta:'one'},reports=[],errors=[];
const html=await readFile(resolve(dist,'index.html'),'utf8'),worker=await readFile(resolve(dist,'sw.js'),'utf8');
const manifest=JSON.parse(await readFile(resolve(dist,'manifest.webmanifest'),'utf8'));
const originalDigests=JSON.parse(worker.match(/const DIGESTS = (\{.*\});/)[1]);
const fixtureHTML=revision=>html.replace('</head>',`<script>window.__fixtureRevision=${JSON.stringify(revision)}</script></head>`);
const fixtureManifest=revision=>JSON.stringify({...manifest,fixtureRevision:revision});
const digest=bytes=>({sha256:createHash('sha256').update(bytes).digest('hex'),size:Buffer.byteLength(bytes)});
const types={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://fixture.test'),match=url.pathname.match(/^\/(alpha|beta)\/(.*)$/);
 if(!match){res.writeHead(404).end();return;}
 const [,scope,path]=match,revision=versions[scope];res.setHeader('Cache-Control','no-store');
 if(revision==='broken'&&path==='werewolf/doctor.webp'){res.writeHead(503).end('intentional failed update');return;}
 if(path==='sw.js'){res.setHeader('Content-Type','text/javascript');const digests={...originalDigests,'./':digest(fixtureHTML(revision)),'index.html':digest(fixtureHTML(revision)),'manifest.webmanifest':digest(fixtureManifest(revision))};res.end(worker.replace(/const CACHE = PREFIX \+ "[^"]+";/,`const CACHE = PREFIX + "${revision}";`).replace(/const DIGESTS = \{.*\};/,`const DIGESTS = ${JSON.stringify(digests)};`));return;}
 if(path===''||path==='index.html'){res.setHeader('Content-Type','text/html');res.end(fixtureHTML(revision));return;}
 const file=resolve(dist,path);if(!file.startsWith(dist+sep)||path.endsWith('.zip')){res.writeHead(404).end();return;}
 const data=await readFile(file);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
 res.end(path==='manifest.webmanifest'?JSON.stringify({...JSON.parse(data),fixtureRevision:revision}):data);
 }catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
const base=`http://127.0.0.1:${server.address().port}/`,cache=(scope,revision)=>`nightfall-shell-${encodeURIComponent('/'+scope+'/')}:${revision}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 let alpha=await context.newPage();const beta=await context.newPage();for(const page of [alpha,beta])page.on('pageerror',e=>errors.push(e.message));
 await alpha.goto(base,{waitUntil:'load'});
 await alpha.evaluate(async base=>{const c=await caches.open('unrelated-shadow');await c.put(base+'alpha/index.html',new Response('<h1>WRONG SHELL</h1>',{headers:{'Content-Type':'text/html'}}));await c.put(base+'alpha/manifest.webmanifest',new Response('{"fixtureRevision":"wrong"}',{headers:{'Content-Type':'application/json'}}));},base);
 await context.addInitScript(()=>{if(sessionStorage.getItem('fixture-seeded'))return;sessionStorage.setItem('fixture-seeded','1');localStorage.setItem('werewolf.names',JSON.stringify(['Ava','Noah','Mila','Leo']));localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:true,sounds:false,buttonSounds:false,haptics:false}));});
 async function settings(page){await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('dialog',{name:'SETTINGS',exact:true}).waitFor();}
 async function open(page,scope,first=false){
  await page.goto(base+scope+'/',{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);
  const controlled=await page.evaluate(()=>!!navigator.serviceWorker.controller);
  if(first){assert.equal(controlled,false);await settings(page);await page.getByText(/Files downloaded. Close and reopen/).waitFor();}
  // Explicit fixture preparation at HOME, never automatic application behavior.
  if(!controlled)await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  if(!await page.getByRole('dialog',{name:'SETTINGS',exact:true}).count())await settings(page);
  await page.getByText('Offline files are present on this device.',{exact:true}).waitFor();
  await page.evaluate(async()=>{window.__fixtureRegistration=await navigator.serviceWorker.getRegistration();});
 }
 await open(alpha,'alpha',true);await open(beta,'beta',true);
 await beta.evaluate(async base=>{window.__alphaRegistration=await navigator.serviceWorker.getRegistration(base+'alpha/');},base);
 let keys=await alpha.evaluate(()=>caches.keys());for(const scope of ['alpha','beta'])assert.ok(keys.includes(cache(scope,'one')));assert.ok(keys.includes('unrelated-shadow'));
 reports.push('first visit explains reopen without claiming or reloading; controlled reopen checks own offline files in two scopes');
 // Home Settings-only notice: normal, narrow, enlarged portrait/landscape, expanded detail.
 for(const [width,height,font]of [[390,844,16],[320,700,16],[320,700,32],[844,390,32]]){
  await alpha.setViewportSize({width,height});await alpha.evaluate(font=>document.documentElement.style.fontSize=font+'px',font);
  await alpha.locator('.offline-notice summary').click();
  await alpha.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await alpha.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[]);assert.ok(await alpha.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const bounds=await alpha.getByRole('button',{name:'CHECK OFFLINE FILES',exact:true}).boundingBox();assert.ok(bounds.height>=44);
  await alpha.locator('.offline-notice summary').click();
 }
 await alpha.setViewportSize({width:390,height:844});await alpha.evaluate(()=>document.documentElement.style.fontSize='16px');
 reports.push('four normal/enlarged mobile home Settings audits with expanded offline explanations and 44px checks');
 await alpha.getByRole('button',{name:'DONE',exact:true}).click();await alpha.getByRole('button',{name:'START GAME',exact:true}).click();assert.equal(await alpha.locator('.offline-notice').count(),0);
 await alpha.getByRole('button',{name:/CHOOSE ROLES/}).click();await alpha.getByRole('button',{name:'Add Werewolf',exact:true}).click();for(let i=0;i<3;i++)await alpha.getByRole('button',{name:'Add Villager',exact:true}).click();
 await alpha.getByRole('button',{name:/START GAME/}).click();await alpha.getByRole('button',{name:'CONTINUE →',exact:true}).click();const holder=await alpha.locator('.player-pass h2').innerText();await alpha.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
 const old=await alpha.locator('.action').elementHandle(),role=await alpha.locator('.action h2').innerText();let navigations=0;alpha.on('framenavigated',frame=>{if(frame===alpha.mainFrame())navigations++;});await alpha.evaluate(()=>window.__activeMatchSentinel='unchanged');
 const second=await context.newPage();second.on('pageerror',e=>errors.push(e.message));await open(second,'alpha');assert.equal(await second.evaluate(()=>window.__fixtureRevision),'one');
 versions.alpha='two';await alpha.evaluate(()=>window.__fixtureRegistration.update());
 // Synchronous predicates: returned Promises are not polled by this Playwright version.
 await alpha.waitForFunction(()=>window.__fixtureRegistration.waiting?.state==='installed');
 await second.getByText('Update downloaded.',{exact:true}).waitFor();
 assert.equal(navigations,0);assert.ok(await old.evaluate(el=>el.isConnected));assert.equal(await alpha.locator('.action h2').innerText(),role);assert.equal(await alpha.evaluate(()=>window.__activeMatchSentinel),'unchanged');assert.equal(await alpha.locator('.offline-notice').count(),0);
 assert.equal(await alpha.evaluate(()=>window.__fixtureRevision),'one');assert.equal(await alpha.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).fixtureRevision),'one');
 keys=await alpha.evaluate(()=>caches.keys());for(const key of [cache('alpha','one'),cache('alpha','two'),cache('beta','one'),'unrelated-shadow'])assert.ok(keys.includes(key));
 reports.push('waiting update appears only at the menu while private card and old matching assets stay intact');
 await second.reload({waitUntil:'load'});await settings(second);await second.getByText('Update downloaded.',{exact:true}).waitFor();assert.equal(await second.evaluate(()=>window.__fixtureRevision),'one');assert.equal(await second.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).fixtureRevision),'one');
 reports.push('online reload retains old shell/assets and still explains waiting update');
 await alpha.getByRole('button',{name:'SKIP',exact:true}).click();assert.notEqual(await alpha.locator('.player-pass h2').innerText(),holder);assert.equal(await old.evaluate(el=>el.isConnected),false);assert.equal(await alpha.locator('.action').count(),0);assert.equal(navigations,0);assert.equal(await alpha.locator('.offline-notice').count(),0);
 reports.push('existing match advances one private turn without reload or notice leakage');
 await second.close();await beta.waitForFunction(()=>window.__alphaRegistration.waiting?.state==='installed');assert.ok(await beta.evaluate(()=>!!window.__alphaRegistration.waiting));
 reports.push('closing only one old tab does not activate');
 await beta.evaluate(()=>{const w=window.__alphaRegistration.waiting;if(!w)throw Error('waiting revision missing');window.__alphaActivated=new Promise(resolve=>{if(w.state==='activated')resolve();else w.addEventListener('statechange',()=>{if(w.state==='activated')resolve();});});});
 await alpha.close();await beta.evaluate(()=>window.__alphaActivated);keys=await beta.evaluate(()=>caches.keys());assert.equal(keys.includes(cache('alpha','one')),false);for(const key of [cache('alpha','two'),cache('beta','one'),'unrelated-shadow'])assert.ok(keys.includes(key));
 reports.push('last old tab closing activates and cleans only its own cache');
 alpha=await context.newPage();alpha.on('pageerror',e=>errors.push(e.message));await open(alpha,'alpha');assert.equal(await alpha.evaluate(()=>window.__fixtureRevision),'two');assert.equal(await alpha.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).fixtureRevision),'two');assert.equal(await alpha.getByText('Update downloaded.',{exact:true}).count(),0);
 reports.push('reopening uses new shell/assets and clears waiting notice');
 const storage=await alpha.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 versions.alpha='host-future';const rejected=await alpha.evaluate(async key=>{const c=await caches.open(key),url=new URL('./manifest.webmanifest',location.href).href;window.__manifestBackup=await c.match(url);await c.delete(url);try{await fetch(url,{cache:'no-store'});return false;}catch{return true;}},cache('alpha','two'));assert.equal(rejected,true);
 const checkControl=await alpha.getByRole('button',{name:'CHECK OFFLINE FILES',exact:true}).elementHandle();await checkControl.click();await alpha.getByText(/Some offline files are missing/).waitFor();assert.ok(await checkControl.evaluate(e=>e===document.activeElement));
 await alpha.evaluate(async key=>{const c=await caches.open(key);await c.put(new URL('./manifest.webmanifest',location.href).href,window.__manifestBackup);},cache('alpha','two'));versions.alpha='two';
 await alpha.getByRole('button',{name:'CHECK OFFLINE FILES',exact:true}).click();await alpha.getByText('Offline files are present on this device.',{exact:true}).waitFor();assert.deepEqual(await alpha.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),storage);
 reports.push('explicit checks detect missing entries without repair, reject future-host content and preserve local game data');
 await context.setOffline(true);
 for(const [page,revision]of [[alpha,'two'],[beta,'one']]){await page.reload({waitUntil:'load'});await settings(page);await page.getByText('Offline files are present on this device.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__fixtureRevision),revision);assert.equal(await page.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).fixtureRevision),revision);}
 reports.push('offline reload and status checks use the own revision, not foreign shadow caches');
 await context.setOffline(false);versions.alpha='broken';
 const failed=await alpha.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const failed=new Promise(resolve=>r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant')resolve(true);});},{once:true}));await r.update();return failed;});assert.equal(failed,true);
 await alpha.getByText(/An update could not finish downloading/).waitFor();await alpha.getByText('Offline files are present on this device.',{exact:true}).waitFor();keys=await alpha.evaluate(()=>caches.keys());assert.ok(keys.includes(cache('alpha','two')));assert.ok(keys.includes(cache('beta','one')));
 reports.push('failed precache leaves current offline version intact and shows a nonblocking explanation');
 await context.setOffline(true);await alpha.reload({waitUntil:'load'});await settings(alpha);await alpha.getByText('Offline files are present on this device.',{exact:true}).waitFor();assert.equal(await alpha.evaluate(()=>window.__fixtureRevision),'two');assert.deepEqual(errors,[]);
 reports.push('previous build still opens offline after failed update with no page errors');
 await context.close();
 // A missing status-channel API must not disable the older offline installation feature.
 versions.alpha='two';const limited=await browser.newContext();await limited.addInitScript(()=>{window.MessageChannel=undefined;});const limitedPage=await limited.newPage();limitedPage.on('pageerror',e=>errors.push(e.message));await limitedPage.goto(base+'alpha/',{waitUntil:'networkidle'});await settings(limitedPage);await limitedPage.getByText(/Offline files could not be checked/).waitFor();await limitedPage.evaluate(()=>navigator.serviceWorker.ready);assert.ok((await limitedPage.evaluate(()=>caches.keys())).includes(cache('alpha','two')));await limitedPage.getByRole('button',{name:'DONE',exact:true}).click();await limitedPage.getByRole('button',{name:'START GAME',exact:true}).click();assert.equal(await limitedPage.locator('.offline-notice').count(),0);assert.deepEqual(errors,[]);await limited.close();reports.push('missing MessageChannel leaves worker installation and online gameplay functional without false readiness');
 console.log('Offline notice/update browser passed: '+reports.join('; ')+'. No physical-device certification.');
}finally{
 await mkdir('.cache/results',{recursive:true});await writeFile('.cache/results/offline-updates.json',JSON.stringify({reports,errors},null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
