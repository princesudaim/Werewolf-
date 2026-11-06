import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CardRevealController,REVEAL_FILES,REVEAL_DELAY_MS} from '../src/card-reveal-controller.ts';
import {normalizeCardRevealPreferences,revealRandomIndex} from '../src/card-reveal-preferences.ts';
import catalog from '../src/card-reveal-catalog.json' with {type:'json'};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function harness({state='running',slowLoad=false,slowResume=false,broken=false,options={}}={}){
 let time=0,id=0,random=0,loaded=0;const timers=new Map(),sources=[],gains=[],resume=deferred(),load=deferred();
 const context={state,destination:{},resumes:0,decodeAudioData:async bytes=>({id:new Uint8Array(bytes)[0]}),resume(){this.resumes++;if(!slowResume)this.state='running';return slowResume?resume.promise:Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},createGain(){const g={gain:{value:0},connect(){},disconnect(){}};gains.push(g);return g;},createBufferSource(){const s={connect(){},disconnect(){this.disconnected=true;},start(){this.started=time;},stop(){this.stopped=true;}};sources.push(s);return s;}};
 const platform={createContext(){return broken?null:context;},async load(url){loaded++;if(slowLoad)await load.promise;return new Uint8Array([REVEAL_FILES.indexOf(url)]).buffer;},randomIndex:n=>random++%n,now:()=>time,timer(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},clear:key=>timers.delete(key)};
 const controller=new CardRevealController(platform,options);controller.configure({enabled:true,volume:50});
 return {controller,context,sources,gains,timers,resume,load,platform,loaded:()=>loaded,setTime:t=>time=t,fire(t=250){time=t;const pending=[...timers];timers.clear();for(const [,v]of pending)v.fn();}};
}
test('14 reveal WAVs are trimmed, stereo 48k, loudness matched, peak protected, hash-verified and offline',()=>{
 const sw=readFileSync('public/sw.js','utf8');assert.equal(catalog.clips.length,14);assert.equal(REVEAL_DELAY_MS,250);
 for(const clip of catalog.clips){const bytes=readFileSync('public/'+clip.file.slice(2));assert.equal(bytes.length,clip.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);assert.equal((bytes.length-44)/192000,clip.seconds);assert.ok(clip.seconds>0&&clip.seconds<=4);assert.ok(Math.abs(clip.output_stats.active_p90-catalog.target_active_p90)<.08);assert.ok(clip.output_stats.max_100ms<=-9.5);assert.equal(clip.frames,Math.min(clip.source_frames,48000*4));assert.equal(clip.seconds,clip.frames/48000);assert.ok(clip.true_peak_db<=-1);assert.ok(sw.includes(JSON.stringify(clip.file.slice(2))));}
 const expectedSources=JSON.parse(readFileSync('tests/fixtures/card-reveal-source-hashes.json','utf8'));
 assert.deepEqual(Object.fromEntries(catalog.clips.map(clip=>[clip.source,clip.source_sha256])),expectedSources);
 assert.ok(catalog.clips.some(x=>x.seconds<1));assert.ok(catalog.clips.some(x=>x.seconds===4));assert.equal(catalog.maximum_seconds,4);assert.equal(catalog.compression.ratio,2);assert.equal(catalog.target_active_p90,-12);
 assert.equal(catalog.edition,'card-reveal-drive-20261106-v3');assert.equal(existsSync('public/werewolf/audio/card-reveal/v2/reveal-01.wav'),false);assert.ok(!sw.includes('werewolf/audio/card-reveal/v2/'));
 assert.ok(catalog.clips.every(x=>x.file.includes('/card-reveal/v3/')));assert.ok(!sw.includes('\"werewolf/audio/card-reveal/reveal-'));
 const active=catalog.clips.map(x=>x.output_stats.active_p90),maximum=catalog.clips.map(x=>x.output_stats.max_100ms);assert.ok(Math.max(...active)-Math.min(...active)<.08);assert.ok(Math.max(...maximum)-Math.min(...maximum)<2);
});
test('preferences retain deliberate mute, clamp volume and store no match secrets',()=>{
 for(const input of [null,{},4,[],{volume:NaN},{volume:Infinity}])assert.deepEqual(normalizeCardRevealPreferences(input,false),{enabled:false,volume:50});
 assert.deepEqual(normalizeCardRevealPreferences({enabled:true,volume:103,role:'wolf',players:['private']}),{enabled:true,volume:100});
 assert.deepEqual(normalizeCardRevealPreferences({enabled:false,volume:-5}),{enabled:false,volume:0});assert.equal(normalizeCardRevealPreferences({volume:44.7}).volume,45);
});
test('independent randomizer never invokes Math.random even without crypto',()=>{
 const original=Math.random,descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Math.random=()=>{throw Error('gameplay RNG consumed');};
 try{for(let i=0;i<100;i++)assert.ok(revealRandomIndex(14)<14);Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});for(let i=0;i<100;i++)assert.ok(revealRandomIndex(13)<13);}finally{Math.random=original;Object.defineProperty(globalThis,'crypto',descriptor);}
});
test('prepare fetches each public clip once, resume is in gesture stack, start is exactly 250ms',async()=>{
 const h=harness({state:'suspended'});await h.controller.prepare();await h.controller.prepare();assert.equal(h.loaded(),14);
 h.controller.request();assert.equal(h.context.resumes,1);assert.equal(h.sources.length,0);assert.equal([...h.timers.values()][0].ms,250);h.fire();assert.equal(h.sources[0].started,250);assert.equal(h.gains[0].gain.value,.5);h.controller.dispose();
});
test('100 selections exclude last audible clip and never overlap; gain is independent',async()=>{
 const h=harness();await h.controller.prepare();let last=-1;
 for(let i=0;i<100;i++){h.controller.request();h.fire((i+1)*250);const s=h.sources.at(-1);assert.notEqual(s.buffer.id,last);last=s.buffer.id;assert.equal(h.sources.filter(x=>!x.stopped).length,1);}
 h.controller.configure({enabled:true,volume:25});assert.equal(h.gains.at(-1).gain.value,.25);h.controller.dispose();
});
for(const reason of ['mute','zero','hidden','focus-loss','navigation','dispose'])for(const stage of ['pending','playing'])test(`${reason} cancels ${stage} reveal without replay`,async()=>{
 const h=harness();await h.controller.prepare();h.controller.request();const stale=[...h.timers.values()][0].fn;if(stage==='playing')h.fire();
 if(reason==='mute')h.controller.configure({enabled:false,volume:50});if(reason==='zero')h.controller.configure({enabled:true,volume:0});if(['hidden','focus-loss'].includes(reason))h.controller.setVisible(false);if(reason==='navigation')h.controller.cancel();if(reason==='dispose')h.controller.dispose();
 h.setTime(250);stale();assert.equal(h.timers.size,0);assert.equal(h.sources.filter(x=>!x.stopped).length,0);h.controller.setVisible(true);await flush();assert.equal(h.sources.length,stage==='playing'?1:0);h.controller.dispose();
});
test('overdue timers, unavailable buffers, late resume and missing WebAudio skip without late replay',async()=>{
 for(const scenario of ['overdue','load','resume','unsupported']){
  const h=harness({slowLoad:scenario==='load',state:scenario==='resume'?'suspended':'running',slowResume:scenario==='resume',broken:scenario==='unsupported'});
  const preparing=h.controller.prepare();if(scenario!=='load')await preparing;h.controller.request();h.fire(scenario==='overdue'?700:250);h.load.resolve();h.context.state='running';h.resume.resolve();await preparing;await flush();assert.equal(h.sources.length,0,scenario);h.controller.dispose();
 }
});
test('cancelled requests do not count as last audible; only latest request is eligible',async()=>{
 const h=harness();h.platform.randomIndex=()=>0;await h.controller.prepare();h.controller.request();h.controller.cancel();h.controller.request();assert.equal(h.timers.size,1);h.fire();assert.equal(h.sources[0].buffer.id,0);h.controller.request();h.fire(500);assert.equal(h.sources[1].buffer.id,1);h.controller.dispose();
});
test('disposed pending loads cannot resurrect playback',async()=>{
 const h=harness({slowLoad:true});const pending=h.controller.prepare();h.controller.request();h.controller.dispose();h.load.resolve();await pending;h.controller.request();h.fire();assert.equal(h.sources.length,0);
});

test('cold audio reports loading; no random unloaded choice or silent accepted request; no late replay',async()=>{
 const h=harness({slowLoad:true});const statuses=[];h.platform.onStatus=s=>statuses.push(s);
 const preparing=h.controller.prepare();assert.equal(h.controller.status.phase,'loading');assert.equal(h.controller.request(),false);assert.equal(h.timers.size,0);
 h.load.resolve();await preparing;assert.equal(h.controller.status.phase,'ready');assert.equal(h.sources.length,0);assert.ok(statuses.some(s=>s.phase==='ready'));h.controller.dispose();
});
test('partially loaded audio chooses only decoded nonrepeating buffers rather than all 14 URLs',async()=>{
 const h=harness();const pending=deferred();
 h.platform.load=async file=>{const index=REVEAL_FILES.indexOf(file);if(index!==7&&index!==11)await pending.promise;return new Uint8Array([index]).buffer;};
 const preparing=h.controller.prepare();await flush();assert.equal(h.controller.status.ready,2);assert.equal(h.controller.status.phase,'ready');
 const sizes=[];h.platform.randomIndex=count=>{sizes.push(count);return count-1;};
 h.controller.request();h.fire();assert.equal(h.sources[0].buffer.id,11);
 h.controller.request();h.fire(500);assert.equal(h.sources[1].buffer.id,7);assert.deepEqual(sizes,[2,1]);
 pending.resolve();await preparing;h.controller.dispose();
});
test('one available clip can play once, then waits for a different ready clip, never repeats',async()=>{
 const h=harness();const pending=deferred();h.platform.load=async file=>{const index=REVEAL_FILES.indexOf(file);if(index!==3)await pending.promise;return new Uint8Array([index]).buffer;};
 const preparing=h.controller.prepare();await flush();assert.equal(h.controller.request(),true);h.fire();assert.equal(h.sources[0].buffer.id,3);assert.equal(h.controller.status.phase,'loading');assert.equal(h.controller.request(),false);
 pending.resolve();await preparing;assert.equal(h.controller.status.phase,'ready');h.controller.request();h.fire(500);assert.notEqual(h.sources[1].buffer.id,3);h.controller.dispose();
});
test('failed assets report unavailable and retry can recover without autoplay',async()=>{
 const h=harness();h.platform.load=async()=>{throw Error('offline');};await h.controller.prepare();assert.equal(h.controller.status.phase,'unavailable');assert.equal(h.controller.status.problem,'load');assert.equal(h.controller.request(),false);
 h.platform.load=async file=>new Uint8Array([REVEAL_FILES.indexOf(file)]).buffer;await h.controller.prepare();assert.equal(h.controller.status.phase,'ready');assert.equal(h.sources.length,0);h.controller.dispose();
});
test('gesture unlock before a private turn resumes audio but never plays or replays a reveal',async()=>{
 const h=harness({state:'suspended'});h.controller.unlockFromGesture();assert.equal(h.context.resumes,1);assert.equal(h.sources.length,0);await h.controller.prepare();h.controller.request();h.controller.cancel();h.controller.unlockFromGesture();h.fire();assert.equal(h.sources.length,0);h.controller.dispose();
});
test('blocked context and missed deadline report the issue instead of being silently skipped',async()=>{
 for(const reason of ['blocked','late']){
  const h=harness({state:reason==='blocked'?'suspended':'running',slowResume:reason==='blocked'});await h.controller.prepare();h.controller.request();h.fire(reason==='late'?700:250);assert.equal(h.controller.status.phase,'blocked');assert.equal(h.controller.status.problem,reason);assert.equal(h.sources.length,0);h.resume.resolve();await flush();assert.equal(h.sources.length,0);h.controller.dispose();
 }
});
test('unsupported audio is explicit and visibility/dispose never revive pending unlock failures',async()=>{
 const unsupported=harness({broken:true});await unsupported.controller.prepare();assert.equal(unsupported.controller.status.phase,'unavailable');assert.equal(unsupported.controller.status.problem,'unsupported');unsupported.controller.dispose();
 const h=harness({state:'suspended'});let reject;h.context.resume=()=>new Promise((_,no)=>reject=no);await h.controller.prepare();h.controller.unlockFromGesture();h.controller.setVisible(false);h.controller.setVisible(true);reject(Error('blocked'));await flush();assert.equal(h.controller.status.phase,'ready');assert.equal(h.sources.length,0);h.controller.dispose();
});

test('resume rejection cancels the deadline: an early retry can never revive that failed reveal',async()=>{
 const h=harness({state:'suspended'});h.context.resume=()=>Promise.reject(Error('autoplay blocked'));await h.controller.prepare();h.controller.request();await flush();
 assert.equal(h.controller.status.phase,'blocked');assert.equal(h.timers.size,0);
 h.setTime(50);h.context.state='running';h.controller.unlockFromGesture();h.fire(250);assert.equal(h.sources.length,0);
 h.controller.request();h.fire(500);assert.equal(h.sources.length,1);h.controller.dispose();
});

test('immediate decoded pool uses eight files and starts synchronously without the role-reveal timer',async()=>{
 const h=harness({options:{files:REVEAL_FILES.slice(0,8),delayMs:0}});await h.controller.prepare();assert.equal(h.loaded(),8);assert.equal(h.controller.status.total,8);assert.ok(h.controller.request());assert.equal(h.sources.length,1);assert.equal(h.sources[0].started,0);assert.equal(h.timers.size,0);h.controller.request();assert.equal(h.sources.length,2);assert.notEqual(h.sources[0].buffer.id,h.sources[1].buffer.id);assert.ok(h.sources[0].stopped);h.controller.dispose();
});
for(const cancel of [false,true])test(`immediate pool handles gesture resume, cancelled=${cancel}, without a delayed replay`,async()=>{
 const h=harness({state:'suspended',slowResume:true,options:{files:REVEAL_FILES.slice(0,8),delayMs:0}});await h.controller.prepare();h.controller.request();assert.equal(h.sources.length,0);if(cancel)h.controller.cancel();h.context.state='running';h.resume.resolve();await flush();assert.equal(h.sources.length,cancel?0:1);assert.equal(h.timers.size,0);h.controller.dispose();
});
test('overdue immediate context resume does not play stale voted-out sound',async()=>{
 const h=harness({state:'suspended',slowResume:true,options:{files:REVEAL_FILES.slice(0,8),delayMs:0}});await h.controller.prepare();h.controller.request();h.setTime(500);h.context.state='running';h.resume.resolve();await flush();assert.equal(h.sources.length,0);assert.equal(h.controller.status.problem,'late');h.controller.dispose();
});
