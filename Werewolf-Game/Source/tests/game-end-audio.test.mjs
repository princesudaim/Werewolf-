import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {gameEndAudioCatalog,chooseGameEndCue,transitionCues} from '../src/game-audio.ts';import {GameCueController} from '../src/game-cue-controller.ts';
const scene=(screen,extra={})=>({key:screen,screen,side:null,hasMvp:true,hasVictim:false,hasDeaths:false,seconds:60,...extra});
test('5 current Drive end sounds: hash-verified, balanced, peak protected, <=7s without padding, offline',()=>{
 const sources=JSON.parse(readFileSync('tests/fixtures/game-end-source-hashes.json')).files,sw=readFileSync('public/sw.js','utf8');assert.equal(Object.keys(gameEndAudioCatalog.cues).length,5);
 for(const c of Object.values(gameEndAudioCatalog.cues)){
  const original=sources.find(s=>s.name===c.source),bytes=readFileSync('public/'+c.file.slice(2));assert.equal(c.source_sha256,original.sha256);assert.equal(c.source_md5,original.md5);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert.equal(bytes.length,c.bytes);assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);assert.equal((bytes.length-44)/4,c.frames);assert.equal(c.frames,Math.min(c.source_frames-c.source_start_frame,336000));assert.equal(c.seconds,c.frames/48000);assert.ok(c.seconds>0&&c.seconds<=7);assert.equal(c.loop,false);assert.ok(Math.abs(c.output_stats.active_p90+12)<.08);assert.ok(c.true_peak_db<=-1);assert.ok(sw.includes(JSON.stringify(c.file.slice(2))));
 }
 assert.ok(Object.values(gameEndAudioCatalog.cues).some(c=>c.seconds===7));assert.ok(Object.values(gameEndAudioCatalog.cues).some(c=>c.seconds<7));
});
for(const side of ['village','wolf','jester','serialkiller','raven','whitewolf','mindflayer','friends','wolf-friends','draw'])test(`${side}: final result gets one custom end cue, independent of MVP`,()=>{
 for(const hasMvp of [true,false])for(const previous of ['morning','voteResult'])assert.deepEqual(transitionCues(scene(previous),scene('end',{side,hasMvp})),['game-end']);
 const end=scene('end',{side});assert.deepEqual(transitionCues(end,{...end}),[]);assert.deepEqual(transitionCues(scene('recovery'),end),[]);assert.deepEqual(transitionCues(null,end),[]);assert.deepEqual(transitionCues(scene('home'),end),[]);
});
test('end picker reaches all five and excludes previous match selection',()=>{
 const all=Object.keys(gameEndAudioCatalog.cues);assert.deepEqual(new Set(Array.from({length:5},(_,i)=>chooseGameEndCue(null,i/5))),new Set(all));for(const previous of all)for(const r of [0,.2,.8,1,-1,Infinity,NaN])assert.notEqual(chooseGameEndCue(previous,r),previous);
});
test('legacy-browser fallback plays exactly one non-looping end file with no timer delay',async()=>{
 const timers=new Map(),players=[];let id=0;const c=new GameCueController({random:()=>0,createAudio(){const p={plays:[],volume:0,paused:true,ended:false,play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();},pause(){this.paused=true;}};players.push(p);return p;},timer(fn,ms){timers.set(++id,{fn,ms});return id;},clear:i=>timers.delete(i),duck:()=>{}});c.configure(true,35);c.play(['game-end']);assert.equal(players[0].plays.length,1);assert.equal(players[0].loop,false);assert.equal(timers.size,0);await Promise.resolve();players[0].ended=true;players[0].onended();assert.equal(players[0].plays.length,1);assert.equal(timers.size,0);c.play(['game-end']);assert.notEqual(players[0].plays[0],players[0].plays[1]);c.dispose();
});
