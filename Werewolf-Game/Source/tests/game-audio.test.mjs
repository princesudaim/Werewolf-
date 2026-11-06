import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioCatalog,musicForScene,transitionCues,publicInteractionCue} from '../src/game-audio.ts';
import {GameCueController} from '../src/game-cue-controller.ts';
const scene=(screen,extra={})=>({key:screen,screen,side:null,hasDeaths:false,hasVictim:false,hasMvp:true,seconds:60,...extra});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(){
 let id=0;const timers=new Map(),players=[],duck=[];
 const platform={createAudio(){const p={paused:true,volume:0,plays:[],play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();},pause(){this.paused=true;}};players.push(p);return p;},timer(fn,ms){timers.set(++id,{fn,ms});return id;},clear(id){timers.delete(id);},duck:on=>duck.push(on)};
 const player=new GameCueController(platform);player.configure(true,35);
 return {player,players,timers,duck,platform,next(){const [id,t]=timers.entries().next().value;timers.delete(id);t.fn();}};
}

test('effects-only release has no background tracks and retains all 28 gentle cues; all local assets match hashes and safe peaks',()=>{
 assert.equal(Object.keys(audioCatalog.music).length,0);assert.equal(Object.keys(audioCatalog.cues).length,28);
 const entries=[...Object.values(audioCatalog.music),...Object.values(audioCatalog.cues)];assert.equal(new Set(entries.map(x=>x.sha256)).size,28);
 for(const entry of entries){const bytes=readFileSync('public/'+entry.file.slice(2));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.ok(entry.peak<=.721&&entry.peak>.01);assert.ok(entry.rms>.001&&entry.rms<=.106);assert.ok(entry.seconds>0&&entry.seconds<40);}
 assert.equal(readdirSync('public/werewolf/audio/v3').length,28);
 for(const old of ['day.mp3','night.mp3','vote.mp3','tap.wav'])assert.equal(existsSync('public/werewolf/audio/'+old),false);
 const sw=readFileSync('public/sw.js','utf8');for(const entry of entries)assert.ok(sw.includes(JSON.stringify(entry.file.slice(2))));
});

for(const outcome of ['wolf','village','jester','serialkiller','raven','whitewolf','mindflayer','friends','wolf-friends','draw'])test(`actual ${outcome} ending requests one supplied game-end sound, not stacked old victory/MVP audio`,()=>{
 const next=scene('end',{side:outcome});assert.equal(musicForScene('end',outcome),null);assert.ok(audioCatalog.cues['win-'+outcome].seconds<=1.2);assert.ok(audioCatalog.cues.mvp.seconds<=.55);
 assert.deepEqual(transitionCues(scene('voteResult'),next),['game-end']);
 assert.deepEqual(transitionCues(next,next),[]);
 assert.deepEqual(transitionCues(scene('recovery'),next),[]);
 assert.deepEqual(transitionCues(null,next),[]);
 assert.deepEqual(transitionCues(scene('home'),next),[]);
});

test('all private night screens have no background audio; private data does not change routing',()=>{
 for(const screen of ['pass','action','privateResult'])assert.equal(musicForScene(screen,'wolf'),null);
 for(const secret of ['werewolf','doctor','seer','jester','mindflayer'])assert.deepEqual(transitionCues(scene('pass'),scene('action',{secret})),[]);
 assert.deepEqual(transitionCues(scene('action'),scene('privateResult')),[]);
});

test('menu/setup/day/discussion/vote/verdict and start/replay have new cues without changing game rules',()=>{
 for(const [screen,track] of [['home','home'],['players','setup'],['roles','setup'],['rules','setup'],['nightIntro','intro'],['morning','morning'],['discussion','discussion'],['vote','voting'],['voteResult','verdict'],['recovery',null]])assert.equal(musicForScene(screen,null),null);
 assert.deepEqual(transitionCues(scene('roles'),scene('nightIntro')),[]);assert.deepEqual(transitionCues(scene('end'),scene('nightIntro')),[]);
 assert.deepEqual(transitionCues(scene('action'),scene('morning',{hasDeaths:true})),['morning-death']);assert.deepEqual(transitionCues(scene('action'),scene('morning')),[]);
 assert.deepEqual(transitionCues(scene('vote'),scene('voteResult',{hasVictim:true})),['voted-out']);assert.deepEqual(transitionCues(scene('vote'),scene('voteResult')),['divided']);
 assert.deepEqual(transitionCues(scene('announcement'),scene('morning',{hasDeaths:true})),['morning-death']);
 for(const [label,cue] of [['Add Doctor','add'],['Remove Ava','remove'],['RANDOM DISTRIBUTION','randomize'],['Go back','navigate'],['Choose Ava','select']])assert.equal(publicInteractionCue(label),cue);
});

test('one clip player sequences victory then MVP, has no background audio and with no overlap',async()=>{
 const h=harness();h.player.play(['win-village','mvp']);await flush();assert.equal(h.players.length,1);assert.ok(h.players[0].src.endsWith('cues-win-village.wav'));assert.equal(h.players[0].volume,.35);assert.equal(h.timers.size,1);assert.equal(h.duck.at(-1),true);
 h.players[0].onended();await flush();assert.ok(h.players[0].src.endsWith('cues-mvp.wav'));assert.equal(h.timers.size,1);h.players[0].onended();assert.equal(h.timers.size,0);assert.equal(h.duck.at(-1),false);assert.equal(h.players[0].paused,true);assert.equal(h.players[0].volume,0);h.player.dispose();
});

for(const reason of ['mute','zero','hidden','navigation','dispose'])test(`${reason} cancels the pending MVP and silences current audio immediately`,async()=>{
 const h=harness();h.player.play(['win-wolf','mvp']);await flush();
 if(reason==='mute')h.player.configure(false,35);if(reason==='zero')h.player.configure(true,0);if(reason==='hidden')h.player.setVisible(false);if(reason==='navigation')h.player.cancel();if(reason==='dispose')h.player.dispose();
 assert.equal(h.timers.size,0);assert.equal(h.players[0].paused,true);assert.equal(h.players[0].volume,0);assert.equal(h.duck.at(-1),false);assert.equal(h.players[0].plays.length,1);h.player.dispose();
});

test('rapid cues reuse a single player; stale promise does not pause a newer clip or schedule old MVP',async()=>{
 const h=harness();let resolve;h.platform.createAudio=()=>{const p={paused:true,volume:0,play(){this.paused=false;return new Promise(r=>resolve=r);},pause(){this.paused=true;}};h.players.push(p);return p;};
 h.player.play(['win-wolf','mvp']);const old=resolve;h.player.play(['start']);old();await flush();assert.equal(h.timers.size,0);assert.equal(h.players[0].paused,false);resolve();await flush();assert.equal(h.timers.size,1);assert.equal(h.players.length,1);h.player.dispose();
});

test('autoplay denial and thrown APIs do not defer victory or crash gameplay',async()=>{
 const h=harness();h.platform.createAudio=()=>({play(){return Promise.reject(Error('gesture'));},pause(){}});h.player.play(['win-wolf','mvp']);await flush();assert.equal(h.timers.size,0);assert.equal(h.duck.at(-1),false);h.player.dispose();
 const broken=new GameCueController({...h.platform,createAudio(){throw Error('unsupported');}});broken.configure(true,50);assert.doesNotThrow(()=>{broken.primeFromGesture();broken.play(['start']);broken.dispose();});
});

test('zero/disabled/hidden do not create players; visibility restore does not replay old effects',async()=>{
 const h=harness();h.player.configure(false,50);h.player.play(['start']);h.player.primeFromGesture();assert.equal(h.players.length,0);
 h.player.configure(true,0);h.player.play(['start']);assert.equal(h.players.length,0);
 h.player.configure(true,50);h.player.setVisible(false);h.player.play(['start']);assert.equal(h.players.length,0);h.player.setVisible(true);await flush();assert.equal(h.players.length,0);h.player.dispose();
});


test('stalled victory is cancelled, not followed by a delayed MVP; stale ended events cannot skip a new clip',async()=>{
 const h=harness();h.player.play(['win-village','mvp']);await flush();h.players[0].ended=false;h.players[0].onended();assert.equal(h.players[0].plays.length,1);h.next();assert.equal(h.timers.size,0);assert.equal(h.players[0].plays.length,1);assert.equal(h.players[0].paused,true);h.player.dispose();
});


test('no background media remains in assets, catalog or offline cache',()=>{
 assert.deepEqual(audioCatalog.music,{});assert.ok(!readdirSync('public/werewolf/audio/v3').some(n=>n.startsWith('music-')));assert.doesNotMatch(readFileSync('public/sw.js','utf8'),/audio\/v3\/music-/);
});
test('no-death mornings remain silent, including recovery and announcements',()=>{
 for(const screen of ['action','announcement','pass','recovery','morning'])assert.deepEqual(transitionCues(scene(screen),scene('morning')),[]);
 assert.equal(audioCatalog.cues.rooster,undefined);assert.equal(existsSync('public/werewolf/audio/v3/cues-rooster.wav'),false);
});
test('rounded short celebrations and MVP replace long looping victory songs',()=>{
 for(const [key,entry] of Object.entries(audioCatalog.cues)){assert.ok(entry.peak<=.241);assert.ok(entry.rms<=.044);if(key.startsWith('win-'))assert.ok(entry.seconds<=1.2);}
 assert.ok(audioCatalog.cues.mvp.seconds<=.55);
});
