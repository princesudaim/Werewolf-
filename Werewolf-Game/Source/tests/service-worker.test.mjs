import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const base='https://example.test/Mafia-offlline/';
  const handlers={}; const stores=new Map(); let network=true,claimed=false,skipped=false;
  const absolute=value=>new URL(typeof value==='string'?value:value.url,base).href;
  const caches={
    async open(name) {
      if(!stores.has(name)) stores.set(name,new Map());
      const store=stores.get(name);
      return {async addAll(paths) {
        for(const path of paths) {
          const local=path==='./' || path==='index.html' ? 'index.html' : `public/${path}`;
          assert.ok(existsSync(local),`missing cached file: ${path}`);
          store.set(absolute(path),`cached:${path}`);
        }
      }};
    },
    async keys(){return [...stores.keys()];},
    async delete(key){return stores.delete(key);},
    async match(request) {for(const store of stores.values()) if(store.has(absolute(request))) return store.get(absolute(request));}
  };
  const self={location:new URL(base),async skipWaiting(){skipped=true;},clients:{async claim(){claimed=true;}},addEventListener(name,fn){handlers[name]=fn;}};
  const fetch=async request=>{if(!network) throw new Error('offline');return `network:${request.url}`;};
  vm.runInNewContext(readFileSync('public/sw.js','utf8').replace('__BUILD_REVISION__','test'),{self,caches,fetch,URL,Response});
  const runEvent=async(name,request)=>{
    let pending;
    handlers[name]({request,waitUntil(promise){pending=promise;},respondWith(promise){pending=promise;}});
    return pending ? await pending : undefined;
  };
  return {stores,runEvent,setOffline(){network=false;},get claimed(){return claimed;},get skipped(){return skipped;},base};
}

test('offline worker installs complete shell, cleans old revisions and keeps unrelated caches',async()=>{
  const w=worker();
  w.stores.set('nightfall-shell-old',new Map());w.stores.set('nightfall-v2',new Map());w.stores.set('other-app',new Map());
  await w.runEvent('install');await w.runEvent('activate');
  assert.deepEqual([...w.stores.keys()].sort(),['nightfall-shell-test','other-app']);
  assert.equal(w.claimed,true);assert.equal(w.skipped,true);
  w.setOffline();
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'navigate',url:w.base}), 'cached:index.html');
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'no-cors',url:w.base+'werewolf/doctor.webp'}), 'cached:werewolf/doctor.webp');
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'no-cors',url:w.base+'werewolf/audio/tap.wav'}),'cached:werewolf/audio/tap.wav');
  for(const id of [20,21,23,24]) assert.equal(await w.runEvent('fetch',{method:'GET',mode:'no-cors',url:w.base+`werewolf/avatars/player${id}.webp`}),`cached:werewolf/avatars/player${id}.webp`);
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'no-cors',url:w.base+'werewolf/charmer-sunrise.webp'}),'cached:werewolf/charmer-sunrise.webp');
  assert.equal(await w.runEvent('fetch',{method:'POST',mode:'cors',url:w.base}),undefined);
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'cors',url:'https://other.test/image'}),undefined);
});

test('navigation prefers the network and cached assets work under a Pages subdirectory',async()=>{
  const w=worker();await w.runEvent('install');
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'navigate',url:w.base}),`network:${w.base}`);
  assert.equal(await w.runEvent('fetch',{method:'GET',mode:'cors',url:w.base+'manifest.webmanifest'}),'cached:manifest.webmanifest');
});
