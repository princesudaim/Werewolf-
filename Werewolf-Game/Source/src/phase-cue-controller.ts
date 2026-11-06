import {phaseAudioCatalog,audioRandom} from './game-audio.ts';
import ballotCatalog from './ballot-audio-catalog.json' with {type:'json'};
export type PhaseCue=keyof typeof phaseAudioCatalog.cues;
export type BallotCue=keyof typeof ballotCatalog.cues;
type PreparedCue=PhaseCue|BallotCue;
const preparedCues={...phaseAudioCatalog.cues,...ballotCatalog.cues};
export const PHASE_MAX_START_LAG_MS=150;
type Platform={
  random?:()=>number;
  createContext:()=>AudioContext|null;
  createAudio:()=>HTMLAudioElement;
  load:(url:string,signal:AbortSignal)=>Promise<ArrayBuffer>;
  now:()=>number;
  timer:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;
  clear:(id:ReturnType<typeof setTimeout>)=>void;
};
/** Phase cues and private vote confirmations share one prepared context/voice. Never queue a
 * cold load or replay a suspended/blocked request after its phase has passed. */
export class PhaseCueController {
  private lastBallot:BallotCue|null=null;
  private context:AudioContext|null=null;
  private attempted=false;
  private buffers=new Map<PreparedCue,AudioBuffer>();
  private pending=new Map<PreparedCue,Promise<void>>();
  private media=new Map<PreparedCue,HTMLAudioElement>();
  private abort=new AbortController();
  private enabled=false;
  private volume=0;
  private visible=true;
  private disposed=false;
  private epoch=0;
  private voice:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private platform:Platform;
  constructor(platform:Platform){this.platform=platform;}
  private permitted(){return this.enabled&&this.volume>0&&this.visible&&!this.disposed;}
  private getContext(){
    if(!this.attempted){this.attempted=true;try{this.context=this.platform.createContext();}catch{/* Preloaded media fallback. */}}
    return this.context;
  }
  configure(enabled:boolean,volume:number){
    this.enabled=enabled;this.volume=Number.isFinite(volume)?Math.max(0,Math.min(100,volume)):0;
    if(!this.permitted())this.cancel();
    else if(this.voice)this.voice.gain.gain.value=this.volume/100;
    for(const p of this.media.values())if(!p.paused)p.volume=this.volume/100;
  }
  async prepare(){
    if(!this.permitted())return;
    const context=this.getContext();
    await Promise.all((Object.keys(preparedCues) as PreparedCue[]).map(cue=>{
      const file=preparedCues[cue].file;
      if(!context){
        if(!this.media.has(cue))try{const p=this.platform.createAudio();p.preload='auto';p.loop=false;p.src=file;p.volume=0;this.media.set(cue,p);p.load();}catch{/* Optional audio. */}
        return Promise.resolve();
      }
      if(this.buffers.has(cue))return Promise.resolve();
      const pending=this.pending.get(cue);if(pending)return pending;
      const request=Promise.resolve().then(()=>this.platform.load(file,this.abort.signal)).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{if(!this.disposed)this.buffers.set(cue,buffer);}).catch(()=>{/* Retry preparation later, never play from a load callback. */}).finally(()=>this.pending.delete(cue));
      this.pending.set(cue,request);return request;
    }));
  }
  /** Pointer/key capture happens before the night click or two-second hold ends. */
  unlockFromGesture(){
    if(!this.permitted())return;
    const context=this.getContext();
    try{if(context&&context.state!=='running')void context.resume().catch(()=>{});}catch{/* Do not defer a cue until another gesture. */}
  }
  /** Called only by a committed vote/skip, never by selection or a scene effect. */
  playBallot(){
    if(!this.permitted())return false;
    const context=this.getContext();
    const choices=(Object.keys(ballotCatalog.cues) as BallotCue[]).filter(cue=>cue!==this.lastBallot&&(context?this.buffers.has(cue):(this.media.get(cue)?.readyState??0)>=3));
    if(!choices.length){void this.prepare();return false;}
    const random=(this.platform.random??audioRandom)(),unit=Number.isFinite(random)?Math.max(0,Math.min(1-Number.EPSILON,random)):0;
    const cue=choices[Math.floor(unit*choices.length)];
    return this.play(cue,()=>{this.lastBallot=cue;});
  }
  play(cue:PreparedCue,onStart?:()=>void){
    this.cancel();if(!this.permitted())return false;
    const requestedAt=this.platform.now(),token=this.epoch,context=this.getContext();
    const valid=()=>token===this.epoch&&this.permitted()&&this.platform.now()-requestedAt<=PHASE_MAX_START_LAG_MS;
    const offset=preparedCues[cue].playback_offset_seconds;
    if(!context){
      const p=this.media.get(cue);
      // Don't ask an unbuffered HTML player to play later whenever data arrives.
      if(!p||p.readyState<3)return false;
      try{
        p.loop=false;p.currentTime=offset;p.volume=this.volume/100;
        p.onended=()=>{if(token===this.epoch)this.cancel();};
        p.onplaying=()=>{if(token===this.epoch&&!valid())this.cancel();};
        this.timer=this.platform.timer(()=>{this.timer=null;if(token===this.epoch)this.cancel();},PHASE_MAX_START_LAG_MS);
        void Promise.resolve(p.play()).then(()=>{
          if(token!==this.epoch)return;
          if(!valid()){this.cancel();return;}
          if(this.timer!==null)this.platform.clear(this.timer);this.timer=null;onStart?.();
        }).catch(()=>{if(token===this.epoch)this.cancel();});
        return true;
      }catch{this.cancel();return false;}
    }
    const buffer=this.buffers.get(cue);
    if(!buffer){void this.prepare();return false;}
    const start=()=>{
      if(!valid()||context.state!=='running')return;
      let source:AudioBufferSourceNode|null=null,gain:GainNode|null=null;
      try{
        source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;source.loop=false;gain.gain.value=this.volume/100;
        source.connect(gain);gain.connect(context.destination);const voice={source,gain};this.voice=voice;
        source.onended=()=>{source?.disconnect();gain?.disconnect();if(this.voice===voice)this.voice=null;};
        source.start(0,offset);onStart?.(); // No timer, queue, reveal delay or wall-clock scheduling.
      }catch{try{source?.disconnect();gain?.disconnect();}catch{}this.voice=null;}
    };
    if(context.state==='running')start();
    else try{void context.resume().then(start).catch(()=>{});}catch{return false;}
    return true;
  }
  cancel(){
    this.epoch++;
    if(this.timer!==null)this.platform.clear(this.timer);this.timer=null;
    const voice=this.voice;this.voice=null;
    if(voice){try{voice.source.stop();}catch{}try{voice.source.disconnect();voice.gain.disconnect();}catch{}}
    for(const p of this.media.values())try{p.onended=null;p.onplaying=null;p.pause();p.volume=0;}catch{}
  }
  setVisible(visible:boolean){this.visible=visible;if(!visible){this.cancel();try{void this.context?.suspend().catch(()=>{});}catch{}}}
  dispose(){
    this.disposed=true;this.cancel();this.abort.abort();this.buffers.clear();this.pending.clear();
    for(const p of this.media.values())try{p.removeAttribute('src');p.load();}catch{}this.media.clear();
    try{void this.context?.close().catch(()=>{});}catch{}this.context=null;
  }
}
