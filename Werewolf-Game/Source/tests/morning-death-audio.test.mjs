import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {morningDeathAudioCatalog,chooseMorningDeathCue,transitionCues} from '../src/game-audio.ts';import {GameCueController} from '../src/game-cue-controller.ts';
const scene=(screen,extra={})=>({key:screen,screen,side:null,hasDeaths:false,hasVictim:false,hasMvp:false,seconds:60,...extra});
test('all three Drive death sounds are full remaining recordings, balanced, peak protected, hashed and offline',()=>{
 const sources=JSON.parse(readFileSync('tests/fixtures/morning-death-source-hashes.json')).files,sw=readFileSync('public/sw.js','utf8');assert.equal(Object.keys(morningDeathAudioCatalog.cues).length,3);
 for(const c of Object.values(morningDeathAudioCatalog.cues)){const original=sources.find(s=>s.name===c.source),bytes=readFileSync('public/'+c.file.slice(2));assert.equal(c.source_sha256,original.sha256);assert.equal(c.source_md5,original.md5);assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);assert.equal((bytes.length-44)/4,c.frames);assert.equal(c.frames,c.source_frames-c.source_start_frame);assert.equal(c.seconds,c.frames/48000);assert.equal(c.loop,false);assert.ok(Math.abs(c.output_stats.active_p90+12)<.08);assert.ok(c.true_peak_db<=-1);assert.ok(sw.includes(JSON.stringify(c.file.slice(2))));}
});
test('death sound starts on the visible morning report, including after a Mayor announcement',()=>{
 for(const previous of ['action','privateResult','pass','announcement'])assert.deepEqual(transitionCues(scene(previous),scene('morning',{hasDeaths:true})),['morning-death']);assert.deepEqual(transitionCues(scene('action'),scene('announcement',{hasDeaths:true})),['confirm']);
});
test('multiple victims still select exactly one sound for the report, not per player',()=>{
 for(const deathCount of [1,2,5,10])assert.deepEqual(transitionCues(scene('action'),scene('morning',{hasDeaths:true,deathCount})),['morning-death']);
});
test('no-death mornings, votes, night handoffs and final results do not request death sounds',()=>{
 for(const previous of ['action','privateResult','announcement','recovery'])assert.deepEqual(transitionCues(scene(previous),scene('morning')),[]);
 for(const screen of ['nightIntro','pass','action','voteResult','end'])assert.ok(!transitionCues(scene('vote'),scene(screen,{hasVictim:true})).includes('morning-death'));
});
test('initial loads, recovered reports, rerenders and same-report fact updates never replay',()=>{
 const morning=scene('morning',{hasDeaths:true});assert.deepEqual(transitionCues(null,morning),[]);assert.deepEqual(transitionCues(scene('recovery'),morning),[]);assert.deepEqual(transitionCues(morning,{...morning}),[]);assert.deepEqual(transitionCues(morning,{...morning,key:'same-report-new-render'}),[]);
});
test('three-way independent picker reaches all choices and never repeats previous death sound',()=>{
 const all=Object.keys(morningDeathAudioCatalog.cues);assert.deepEqual(new Set([0,1/3,2/3].map(r=>chooseMorningDeathCue(null,r))),new Set(all));for(const previous of all)for(const r of [-1,0,.5,1,NaN,Infinity])assert.notEqual(chooseMorningDeathCue(previous,r),previous);
});
test('unsupported-WebAudio fallback requests one immediate non-looping random sound',async()=>{
 const timers=new Map(),players=[];let id=0;const c=new GameCueController({random:()=>0,createAudio(){const p={plays:[],paused:true,ended:false,play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();},pause(){this.paused=true;}};players.push(p);return p;},timer(fn,ms){timers.set(++id,{fn,ms});return id;},clear:i=>timers.delete(i),duck:()=>{}});c.configure(true,35);c.play(['morning-death']);assert.equal(players[0].plays.length,1);assert.equal(players[0].loop,false);assert.equal(timers.size,0);await Promise.resolve();players[0].ended=true;players[0].onended();assert.equal(players[0].plays.length,1);assert.equal(timers.size,0);c.play(['morning-death']);assert.notEqual(players[0].plays[0],players[0].plays[1]);c.dispose();
});
