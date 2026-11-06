import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioCatalog,phaseAudioCatalog,gameCueCatalog,transitionCues,musicForScene} from '../src/game-audio.ts';
import {GameCueController} from '../src/game-cue-controller.ts';
const expected={
 'night-start':{name:'night starts.mp3',frames:168299,md5:'6d5a77e471d4d44ed761fb41666ee022',sha256:'90f73ab5dc921ec65f3d818d11aca52386083c3a9dde37ff51a89d06b16e2d8c'},
 'meeting-start':{name:'meeting.mp3',frames:149909,md5:'36a2fc74dd6b7e130706eed17ce8c0ea',sha256:'37eb9fee799a6841f105b3f6ee17df4a14d41907114d5281882b9411c4504019'},
};
const scene=(screen,key=screen)=>({screen,key,side:null,hasDeaths:false,hasVictim:false,hasMvp:false,seconds:60});
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function harness(){
 const players=[],timers=new Map();let id=0;
 const player=new GameCueController({createAudio(){const p={paused:true,ended:false,volume:0,loop:true,plays:[],play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();},pause(){this.paused=true;}};players.push(p);return p;},timer(fn,ms){timers.set(++id,{fn,ms});return id;},clear:id=>timers.delete(id),duck:()=>{}});player.configure(true,50);
 return {player,players,timers};
}
test('two current Drive phase recordings are complete, safe, hash verified and cached separately from unchanged legacy effects',()=>{
 assert.equal(Object.keys(audioCatalog.cues).length,28);assert.equal(Object.keys(gameCueCatalog).length,46);assert.deepEqual(Object.keys(phaseAudioCatalog.cues).sort(),Object.keys(expected).sort());
 const sw=readFileSync('public/sw.js','utf8');
 for(const [key,clip] of Object.entries(phaseAudioCatalog.cues)){
  const source=expected[key],bytes=readFileSync('public/'+clip.file.slice(2));assert.equal(clip.source,source.name);assert.equal(clip.source_md5,source.md5);assert.equal(clip.source_sha256,source.sha256);assert.equal(clip.frames,source.frames);assert.equal(clip.source_frames,source.frames);assert.equal(clip.seconds,source.frames/48000);assert.equal(clip.loop,false);
  assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);assert.equal((bytes.length-44)/4,source.frames);assert.equal(bytes.length,clip.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);assert.ok(clip.true_peak_db<=-1);assert.ok(Math.abs(clip.output_stats.active_p90+14)<.08);assert.ok(sw.includes(JSON.stringify(clip.file.slice(2))));
 }
});
test('every new night, including replay, selects only the supplied night-start cue once',()=>{
 for(let round=1;round<=6;round++){
  const prior=scene(round===1?'roles':'voteResult','previous:'+round),next=scene('nightIntro','nightIntro:'+round);
  assert.deepEqual(transitionCues(prior,next),[]);assert.deepEqual(transitionCues(next,scene('pass','pass:'+round)),['night-start']);assert.deepEqual(transitionCues(next,{...next}),[]);assert.deepEqual(transitionCues(next,{...next,seconds:59}),[]);
 }
 assert.deepEqual(transitionCues(scene('end'),scene('nightIntro','replay:1')),[]);assert.deepEqual(transitionCues(scene('nightIntro','replay:1'),scene('pass','replay:pass')),['night-start']);
});
test('meeting sound belongs to discussion start, never morning reports, Mayor popup or role reveals',()=>{
 for(let round=1;round<=4;round++){
  const meeting=scene('discussion','discussion:'+round);assert.deepEqual(transitionCues(scene('morning','morning:'+round),meeting),['meeting-start']);assert.deepEqual(transitionCues(meeting,{...meeting,seconds:30}),[]);
 }
 assert.deepEqual(transitionCues(scene('morning'),scene('announcement')),['confirm']);assert.deepEqual(transitionCues(scene('announcement'),scene('morning')),[]);
 for(const screen of ['action','privateResult'])assert.deepEqual(transitionCues(scene('nightIntro'),scene(screen)),[]);
});
test('recovery/initial loads never replay a night-start or meeting sound',()=>{
 for(const screen of ['nightIntro','discussion']){assert.deepEqual(transitionCues(null,scene(screen)),[]);assert.deepEqual(transitionCues(scene('recovery'),scene(screen)),[]);assert.deepEqual(transitionCues(scene(screen),scene('recovery')),[]);assert.equal(musicForScene(screen,null),null);}
});
for(const cue of Object.keys(expected))test(`${cue} plays one complete non-looping shot and ends without repeating`,async()=>{
 const h=harness();h.player.play([cue]);await flush();const p=h.players[0];assert.equal(p.plays.length,1);assert.equal(p.src,phaseAudioCatalog.cues[cue].file);assert.equal(p.loop,false);assert.equal(p.volume,.5);assert.equal(h.timers.size,1);assert.ok([...h.timers.values()][0].ms>=phaseAudioCatalog.cues[cue].seconds*1000);
 p.ended=true;p.onended();await flush();assert.equal(p.plays.length,1);assert.equal(p.paused,true);assert.equal(p.volume,0);assert.equal(h.timers.size,0);h.player.dispose();
});
for(const reason of ['mute','zero','hidden','navigation','dispose'])test(`${reason} cancels these one-shots; restoring controls never replays them`,async()=>{
 const h=harness();h.player.play(['night-start']);await flush();if(reason==='mute')h.player.configure(false,50);if(reason==='zero')h.player.configure(true,0);if(reason==='hidden')h.player.setVisible(false);if(reason==='navigation')h.player.cancel();if(reason==='dispose')h.player.dispose();
 assert.equal(h.players[0].paused,true);assert.equal(h.players[0].volume,0);assert.equal(h.timers.size,0);h.player.configure(true,50);h.player.setVisible(true);await flush();assert.equal(h.players[0].plays.length,1);h.player.dispose();
});
