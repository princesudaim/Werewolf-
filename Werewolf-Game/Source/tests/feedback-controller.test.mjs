import test from 'node:test';
import assert from 'node:assert/strict';
import {FeedbackController} from '../src/feedback-controller.ts';
import {normalizeFeedbackPreferences,DEFAULT_FEEDBACK_PREFERENCES} from '../src/feedback-preferences.ts';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const prefs={...DEFAULT_FEEDBACK_PREFERENCES,effects:true,haptics:true};
function effectsHarness({state='running',fallback=false}={}){
 let time=0;const sounds=[],vibrations=[],players=[],gains=[],resume=deferred();
 const context={state,currentTime:0,destination:{},closed:0,
  resume:()=>resume.promise,close(){this.closed++;return Promise.resolve();},
  createOscillator(){const voice={frequency:{values:[],setValueAtTime(value){this.values.push(value);},exponentialRampToValueAtTime(value){this.values.push(value);}},connect(){},disconnect(){this.disconnected=true;},start(){sounds.push(this);},stop(at){if(at===undefined)this.cancelled=true;}};return voice;},
  createGain(){const gain={gain:{values:[],setValueAtTime(value){this.values.push(value);},exponentialRampToValueAtTime(value){this.values.push(value);}},connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;},
 };
 const platform={createContext:()=>fallback?null:context,now:()=>time,vibrate:value=>vibrations.push(value),createAudio:()=>{const p={src:'',currentTime:0,playCount:0,pauseCount:0,play(){this.playCount++;return Promise.resolve();},pause(){this.pauseCount++;}};players.push(p);return p;}};
 const controller=new FeedbackController(platform,{...prefs});
 return {controller,context,sounds,vibrations,players,gains,resume,platform,setTime:value=>{time=value;}};
}

test('feedback preferences validate corrupt values without changing legacy toggles or storing secrets',()=>{
 for(const value of [null,undefined,4,'bad',[],{ambienceVolume:NaN,effectsVolume:Infinity,hapticIntensity:'extreme'}])assert.deepEqual(normalizeFeedbackPreferences(value),DEFAULT_FEEDBACK_PREFERENCES);
 assert.deepEqual(normalizeFeedbackPreferences({ambienceVolume:-4,effectsVolume:125,hapticIntensity:'standard',role:'madman',message:'private',sounds:false}),{ambienceVolume:0,effectsVolume:100,hapticIntensity:'standard'});
 assert.equal(normalizeFeedbackPreferences({effectsVolume:46.8}).effectsVolume,47);
});

test('private tap, confirmation and invalid cues have identical sound and vibration signatures',()=>{
 const signatures=[];
 for(const cue of ['tap','confirm','invalid']){
  const h=effectsHarness();h.controller.play(cue,true);
  signatures.push({frequencies:h.sounds[0].frequency.values,gains:h.gains[0].gain.values,vibrations:[...h.vibrations]});h.controller.dispose();
 }
 assert.deepEqual(signatures[0],signatures[1]);assert.deepEqual(signatures[0],signatures[2]);assert.deepEqual(signatures[0].vibrations,[8]);
});

test('public cue vocabulary is distinct but short; selected vibration feel follows preference',()=>{
 const h=effectsHarness();h.controller.configure({...prefs,hapticIntensity:'standard'});
 h.controller.play('tap');h.controller.play('confirm');h.controller.play('invalid');
 assert.deepEqual(h.sounds.map(s=>s.frequency.values),[[220,190],[330,392],[196,185]]);
 assert.deepEqual(h.vibrations,[14,14,18]);h.controller.dispose();
});

test('effects volume scales gain, zero never creates a context and disabled sound still allows haptics',()=>{
 const h=effectsHarness();h.controller.configure({...prefs,effectsVolume:25});h.controller.play();assert.equal(h.gains[0].gain.values[1],0.0675);
 h.controller.configure({...prefs,effectsVolume:0});h.controller.play();assert.equal(h.sounds.length,1);
 h.controller.configure({...prefs,effects:false});h.controller.play();assert.equal(h.sounds.length,1);assert.deepEqual(h.vibrations,[8,8,8]);h.controller.dispose();
});

test('category previews do not double-play a tap or mix sound and vibration',()=>{
 const h=effectsHarness();h.controller.play('tap',false,'effects');assert.equal(h.sounds.length,1);assert.deepEqual(h.vibrations,[]);
 h.controller.play('tap',false,'haptics');assert.equal(h.sounds.length,1);assert.deepEqual(h.vibrations,[8]);h.controller.dispose();
});

test('rapid input has at most one soft voice and ended nodes are disconnected',()=>{
 const h=effectsHarness();for(let i=0;i<20;i++)h.controller.play();
 assert.equal(h.sounds.filter(s=>!s.cancelled).length,1);
 const voice=h.sounds.at(-1);voice.onended();assert.equal(voice.disconnected,true);assert.equal(h.gains.at(-1).disconnected,true);h.controller.dispose();
});

test('fallback audio reuses one player and respects level, mute and throwing APIs',()=>{
 const h=effectsHarness({fallback:true});h.controller.configure({...prefs,effectsVolume:20});h.controller.play();h.controller.play();
 assert.equal(h.players.length,1);assert.equal(h.players[0].playCount,2);assert.equal(h.players[0].volume,0.2);
 h.controller.configure({...prefs,effects:false,haptics:false});assert.ok(h.players[0].pauseCount);assert.equal(h.vibrations.at(-1),0);
 h.controller.play();assert.equal(h.players[0].playCount,2);
 const broken=new FeedbackController({...h.platform,createContext(){throw Error('blocked');},createAudio(){throw Error('blocked');},vibrate(){throw Error('blocked');}},prefs);
 assert.doesNotThrow(()=>{broken.play();broken.dispose();});h.controller.dispose();
});

for(const reason of ['mute','navigation','hidden','disposed','expired'])test(`pending AudioContext resume never replays after ${reason}`,async()=>{
 const h=effectsHarness({state:'suspended'});h.controller.play();
 if(reason==='mute')h.controller.configure({...prefs,effects:false});
 if(reason==='navigation')h.controller.cancelPending();
 if(reason==='hidden')h.controller.setVisible(false);
 if(reason==='disposed')h.controller.dispose();
 if(reason==='expired')h.setTime(200);
 h.resume.resolve();await flush();assert.equal(h.sounds.length,0);assert.equal(h.players.length,0);h.controller.dispose();
});

test('only the latest resume request can play; rejected resume uses a bounded fallback',async()=>{
 const h=effectsHarness({state:'suspended'});h.controller.play();h.controller.play();h.resume.resolve();await flush();assert.equal(h.sounds.length,1);h.controller.dispose();
 const failed=effectsHarness({state:'suspended'});failed.controller.play();failed.resume.reject(Error('no audio'));await flush();assert.equal(failed.players.length,1);failed.controller.dispose();
});

test('hidden feedback and disposed feedback remain silent, restoring visibility permits a new gesture',()=>{
 const h=effectsHarness();h.controller.setVisible(false);h.controller.play();assert.equal(h.sounds.length,0);
 h.controller.setVisible(true);h.controller.play();assert.equal(h.sounds.length,1);h.controller.dispose();h.controller.play();assert.equal(h.sounds.length,1);assert.equal(h.context.closed,1);
});


