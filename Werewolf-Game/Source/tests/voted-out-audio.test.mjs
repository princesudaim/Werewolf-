import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {votedOutAudioCatalog,gameCueCatalog,chooseVotedOutCue,audioRandom,transitionCues} from '../src/game-audio.ts';
import {GameCueController} from '../src/game-cue-controller.ts';
const sources=JSON.parse(readFileSync('tests/fixtures/voted-out-source-hashes.json')).files;
const scene=(screen,key=screen,victim=false)=>({screen,key,side:null,hasDeaths:false,hasVictim:victim,hasMvp:false,seconds:60});
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function harness(){
 const players=[],timers=new Map();let id=0,picks=0;
 const player=new GameCueController({random:()=>{picks++;return 0;},createAudio(){const p={paused:true,ended:false,volume:0,loop:true,plays:[],play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();},pause(){this.paused=true;}};players.push(p);return p;},timer(fn,ms){timers.set(++id,{fn,ms});return id;},clear:id=>timers.delete(id),duck:()=>{}});player.configure(true,50);
 return {player,players,timers,picks:()=>picks};
}
test('all eight current Drive sources produce onset-trimmed balanced <=4s PCM files, without padding, available offline',()=>{
 assert.equal(Object.keys(votedOutAudioCatalog.cues).length,8);const sw=readFileSync('public/sw.js','utf8');
 for(const c of Object.values(votedOutAudioCatalog.cues)){
  const input=sources.find(s=>s.name===c.source);assert.ok(input);assert.equal(c.source_sha256,input.sha256);assert.equal(c.source_md5,input.md5);
  const bytes=readFileSync('public/'+c.file.slice(2));assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);assert.equal((bytes.length-44)/4,c.frames);assert.equal(c.frames,Math.min(c.source_frames-c.source_start_frame,192000));assert.equal(c.seconds,c.frames/48000);assert.ok(c.seconds>0&&c.seconds<=4);assert.equal(c.loop,false);assert.ok(c.source_start_frame>=0);let onset=0;while(onset<c.frames&&Math.max(Math.abs(bytes.readInt16LE(44+onset*4)),Math.abs(bytes.readInt16LE(46+onset*4)))<328)onset++;assert.ok(onset/48000<.06,'no long leading dead air');assert.ok(Math.abs(c.output_stats.active_p90+12)<.08);assert.ok(c.true_peak_db<=-1);assert.ok(sw.includes(JSON.stringify(c.file.slice(2))));
 }
});
test('only a real voted-out victim requests a random cue; skips/ties retain their ordinary non-elimination effect',()=>{
 assert.deepEqual(transitionCues(scene('vote'),scene('voteResult','verdict:1',true)),['voted-out']);
 for(const key of ['tie','skip','no-valid-votes'])assert.deepEqual(transitionCues(scene('vote'),scene('voteResult',key,false)),['divided']);
 for(const screen of ['morning','announcement','discussion','pass','end'])assert.ok(!transitionCues(scene('vote'),scene(screen,screen,true)).includes('voted-out'));
});
test('verdict rerender, settings, recovery and initial loads never replay voted-out sound',()=>{
 const verdict=scene('voteResult','verdict:1',true);assert.deepEqual(transitionCues(verdict,{...verdict}),[]);assert.deepEqual(transitionCues(null,verdict),[]);assert.deepEqual(transitionCues(scene('recovery'),verdict),[]);assert.deepEqual(transitionCues(verdict,scene('recovery')),[]);
});
test('cosmetic picker covers all 8 with no immediate repeats, including clamped entropy boundaries',()=>{
 const keys=Object.keys(votedOutAudioCatalog.cues);assert.deepEqual(new Set(Array.from({length:8},(_,i)=>chooseVotedOutCue(null,i/8))),new Set(keys));
 for(const prev of keys)for(const random of [-1,0,.2,.6,.999999,1,Infinity,NaN]){const next=chooseVotedOutCue(prev,random);assert.ok(keys.includes(next));assert.notEqual(next,prev);}
});
test('voted-out play starts synchronously, with no 250ms timer or other programmed delay, once only',async()=>{
 const h=harness();h.player.play(['voted-out']);assert.equal(h.picks(),1);assert.equal(h.players[0].plays.length,1);assert.equal(h.timers.size,0);assert.equal(h.players[0].loop,false);assert.equal(h.players[0].volume,.5);
 await flush();assert.equal(h.timers.size,1);h.players[0].ended=true;h.players[0].onended();await flush();assert.equal(h.players[0].plays.length,1);assert.equal(h.players[0].paused,true);assert.equal(h.timers.size,0);h.player.dispose();
});
test('single reusable voice picks a different sound for each consecutive voted-out result',async()=>{
 const h=harness();for(let i=0;i<20;i++){h.player.play(['voted-out']);await flush();}assert.equal(h.players.length,1);const plays=h.players[0].plays;assert.equal(plays.length,20);for(let i=1;i<plays.length;i++)assert.notEqual(plays[i],plays[i-1]);h.player.dispose();assert.equal(h.timers.size,0);
});
test('a tie/skip does not choose or play from the voted-out pool',()=>{
 const h=harness();h.player.play(['divided']);assert.equal(h.picks(),0);assert.deepEqual(h.players[0].plays,[gameCueCatalog.divided.file]);h.player.dispose();
});
for(const reason of ['mute','zero','hidden','navigation','dispose'])test(`voted-out sound cancels on ${reason}; returning never replays`,async()=>{
 const h=harness();h.player.play(['voted-out']);await flush();if(reason==='mute')h.player.configure(false,50);if(reason==='zero')h.player.configure(true,0);if(reason==='hidden')h.player.setVisible(false);if(reason==='navigation')h.player.cancel();if(reason==='dispose')h.player.dispose();assert.ok(h.players[0].paused);assert.equal(h.players[0].volume,0);assert.equal(h.timers.size,0);h.player.configure(true,50);h.player.setVisible(true);await flush();assert.equal(h.players[0].plays.length,1);h.player.dispose();
});
test('disabled playback never selects a random sound or queues one for unmute',async()=>{
 const h=harness();h.player.configure(false,50);h.player.play(['voted-out']);assert.equal(h.picks(),0);assert.equal(h.players.length,0);h.player.configure(true,50);await flush();assert.equal(h.players.length,0);h.player.dispose();
});

test('cosmetic RNG fallback never consumes gameplay Math.random',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),random=Math.random;
 try{Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});Math.random=()=>{throw Error('gameplay RNG consumed');};const a=audioRandom(),b=audioRandom();assert.ok(a>=0&&a<1&&b>=0&&b<1);assert.notEqual(a,b);}
 finally{Math.random=random;if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});
