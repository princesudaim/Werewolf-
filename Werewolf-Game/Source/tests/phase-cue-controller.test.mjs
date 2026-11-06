import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PhaseCueController,PHASE_MAX_START_LAG_MS} from '../src/phase-cue-controller.ts';
import {phaseAudioCatalog} from '../src/game-audio.ts';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness({running=true,fallback=false,slowLoad=false}={}){
 let now=0,resume;const randoms=[];const resolveLoads=[];const loads=[],starts=[],voices=[],media=[],timers=new Map();let id=0;
 const context={state:running?'running':'suspended',destination:{},decodeAudioData:async bytes=>({bytes}),resume(){return new Promise(resolve=>{resume=()=>{context.state='running';resolve();};});},suspend:async()=>{context.state='suspended';},close:async()=>{context.state='closed';},
  createGain(){return{gain:{value:0},connect(){},disconnect(){}};},
  createBufferSource(){const s={loop:true,stopped:false,connect(){},disconnect(){},start(when,offset){starts.push({at:now,when,offset,voice:this});},stop(){this.stopped=true;}};voices.push(s);return s;}};
 const player=new PhaseCueController({random:()=>randoms.shift()??0,createContext:()=>fallback?null:context,createAudio:()=>{const p={readyState:0,paused:true,ended:false,plays:0,load(){},removeAttribute(){},pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}};media.push(p);return p;},load:(url,signal)=>{loads.push({url,signal});return slowLoad?new Promise(resolve=>{resolveLoads.push(resolve);}):Promise.resolve(url);},now:()=>now,timer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clear:id=>timers.delete(id)});
 player.configure(true,50);return{player,context,loads,starts,voices,media,timers,randoms,time:n=>now=n,resume:()=>resume(),load:()=>resolveLoads.splice(0).forEach(resolve=>resolve('bytes'))};
}
for(const cue of ['night-start','meeting-start'])test(`${cue}: prepared PCM starts synchronously with no startup timer, repeats deterministically each new request`,async()=>{
 const h=harness();await h.player.prepare();assert.equal(h.loads.length,5);await h.player.prepare();assert.equal(h.loads.length,5);
 assert.equal(h.starts.length,0,'preloading must be silent');h.player.play(cue);assert.equal(h.starts.length,1);assert.equal(h.timers.size,0);
 assert.equal(h.starts[0].when,0);assert.equal(h.starts[0].offset,phaseAudioCatalog.cues[cue].playback_offset_seconds);assert.equal(h.starts[0].voice.loop,false);
 h.player.play(cue);assert.equal(h.starts.length,2);assert.equal(h.voices[0].stopped,true);h.player.dispose();assert.equal(h.voices[1].stopped,true);
});
test('cold/stalled data is never queued to sound on a later screen',async()=>{
 const h=harness({slowLoad:true});const pending=h.player.prepare();await flush();assert.equal(h.loads.length,5);assert.equal(h.player.play('night-start'),false);h.time(10000);h.load();await pending;assert.equal(h.starts.length,0);h.player.play('meeting-start');assert.equal(h.starts.length,1);h.player.dispose();
});
test('late browser resume is dropped instead of playing a phase sound seconds late',async()=>{
 const h=harness({running:false});await h.player.prepare();h.player.play('night-start');h.time(PHASE_MAX_START_LAG_MS+1);h.resume();await flush();assert.equal(h.starts.length,0);h.player.dispose();
});
test('prompt resume starts within budget; old requests cannot play after the next transition',async()=>{
 const h=harness({running:false});await h.player.prepare();h.player.play('night-start');h.time(20);h.resume();await flush();assert.equal(h.starts.length,1);
 h.context.state='suspended';h.player.play('meeting-start');h.player.cancel();h.resume();await flush();assert.equal(h.starts.length,1);h.player.dispose();
});
for(const reason of ['mute','zero','hidden','navigation','dispose'])test(`${reason} cancels active phase audio, without an unmute/return replay`,async()=>{
 const h=harness();await h.player.prepare();h.player.play('meeting-start');
 if(reason==='mute')h.player.configure(false,50);if(reason==='zero')h.player.configure(true,0);if(reason==='hidden')h.player.setVisible(false);if(reason==='navigation')h.player.cancel();if(reason==='dispose')h.player.dispose();
 assert.equal(h.voices[0].stopped,true);h.player.configure(true,50);h.player.setVisible(true);await flush();assert.equal(h.starts.length,1);h.player.dispose();
});
test('volume changes update the active gain without restarting the recording',async()=>{
 const h=harness();await h.player.prepare();h.player.play('meeting-start');h.player.configure(true,75);assert.equal(h.starts.length,1);assert.equal(h.voices[0].stopped,false);h.player.dispose();
});
test('HTML fallback preloads silently and never starts an unbuffered recording',async()=>{
 const h=harness({fallback:true});await h.player.prepare();assert.equal(h.media.length,5);assert.equal(h.media[0].preload,'auto');assert.equal(h.media[0].plays,0);assert.equal(h.player.play('night-start'),false);
 h.media[0].readyState=4;assert.equal(h.player.play('night-start'),true);assert.equal(h.media[0].plays,1);await flush();assert.equal(h.timers.size,0);h.player.setVisible(false);assert.equal(h.media[0].paused,true);h.player.dispose();
});
test('HTML fallback stalls are cancelled within the startup budget, not deferred until ready',async()=>{
 const h=harness({fallback:true});await h.player.prepare();h.media[0].readyState=4;h.media[0].play=()=>new Promise(()=>{});h.player.play('night-start');assert.equal(h.timers.size,1);const watchdog=[...h.timers.values()][0];assert.equal(watchdog.ms,PHASE_MAX_START_LAG_MS);watchdog.fn();assert.equal(h.media[0].paused,true);assert.equal(h.media[0].volume,0);h.player.dispose();
});
test('playback skips only leading near-silence; PCM recordings and full remaining tails stay intact',()=>{
 for(const cue of Object.values(phaseAudioCatalog.cues)){
  const data=readFileSync('public/'+cue.file.slice(2)),samples=Math.floor(cue.playback_offset_seconds*48000)*2;
  for(let i=0;i<samples;i++)assert.ok(Math.abs(data.readInt16LE(44+i*2))<=33,'skipped audio is below -60 dBFS');
  assert.ok(cue.playback_offset_seconds<=.06);assert.equal((data.length-44)/4,cue.source_frames);
 }
});


test('vote confirmations use all three prepared files without immediate repeats or the gameplay RNG',async()=>{
 const h=harness();await h.player.prepare();h.randoms.push(0,0,.99);const original=Math.random;Math.random=()=>{throw Error('gameplay RNG must not be touched');};
 try{for(let i=0;i<3;i++){assert.equal(h.player.playBallot(),true);assert.equal(h.starts.length,i+1);assert.equal(h.timers.size,0);}}finally{Math.random=original;}
 assert.deepEqual(h.starts.map(s=>s.voice.buffer.bytes.split('/').pop()),['ballot-enderman.wav','ballot-notifi.wav','ballot-enemy.wav']);
 assert.equal(h.voices.filter(v=>!v.stopped).length,1,'rapid commits replace the previous clip instead of overlapping');
 for(const s of h.starts){assert.equal(s.offset,0);assert.equal(s.voice.loop,false);}h.player.dispose();
});
test('cold ballot requests are not replayed by a download or another gesture',async()=>{
 const h=harness({slowLoad:true}),loading=h.player.prepare();await flush();assert.equal(h.player.playBallot(),false);h.time(10000);h.load();await loading;h.player.unlockFromGesture();assert.equal(h.starts.length,0);
 h.player.playBallot();assert.equal(h.starts.length,1);h.player.dispose();
});
test('phase starts and ballot clips share a single voice and respect mute/hidden cancellation',async()=>{
 const h=harness();await h.player.prepare();h.player.play('meeting-start');h.player.playBallot();assert.equal(h.voices[0].stopped,true);h.player.play('night-start');assert.equal(h.voices[1].stopped,true);h.player.configure(false,50);assert.equal(h.voices[2].stopped,true);assert.equal(h.player.playBallot(),false);
 h.player.configure(true,50);h.player.setVisible(false);assert.equal(h.player.playBallot(),false);h.player.dispose();
});
test('HTML fallback also chooses buffered vote confirmations and never loops or overlaps',async()=>{
 const h=harness({fallback:true});await h.player.prepare();for(const p of h.media)p.readyState=4;h.player.playBallot();await flush();h.player.playBallot();await flush();assert.equal(h.media.filter(p=>!p.paused).length,1);assert.ok(h.media.every(p=>!p.loop));h.player.dispose();
});
