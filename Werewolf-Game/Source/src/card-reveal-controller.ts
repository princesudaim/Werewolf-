import catalog from './card-reveal-catalog.json' with {type:'json'};
import type {CardRevealPreferences} from './card-reveal-preferences';
export const REVEAL_DELAY_MS=250;
export const REVEAL_FILES=catalog.clips.map(clip=>clip.file);
export type RevealAudioStatus={
  phase:'off'|'loading'|'ready'|'unavailable'|'blocked';
  ready:number;
  total:number;
  problem:'unsupported'|'load'|'blocked'|'late'|null;
};
type Platform={
  createContext:()=>AudioContext|null;
  load:(url:string,signal:AbortSignal)=>Promise<ArrayBuffer>;
  randomIndex:(count:number)=>number;
  now:()=>number;
  timer:(callback:()=>void,ms:number)=>ReturnType<typeof setTimeout>;
  clear:(id:ReturnType<typeof setTimeout>)=>void;
  onStatus?:(status:RevealAudioStatus)=>void;
};
/** Only public asset URLs and device preferences enter here. No roles, players or match RNG. */
export class CardRevealController {
  private platform:Platform;
  private context:AudioContext|null=null;
  private contextAttempted=false;
  private buffers=new Map<number,AudioBuffer>();
  private loading=new Map<number,Promise<void>>();
  private abort=new AbortController();
  private preferences:CardRevealPreferences={enabled:false,volume:50};
  private visible=true;
  private disposed=false;
  private generation=0;
  private lastAudible=-1;
  private problem:RevealAudioStatus['problem']=null;
  private lastStatus='';
  private timerId:ReturnType<typeof setTimeout>|null=null;
  private voice:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
  private files:readonly string[];
  private delayMs:number;
  constructor(platform:Platform,options:{files?:readonly string[];delayMs?:number}={}){this.platform=platform;this.files=options.files??REVEAL_FILES;this.delayMs=options.delayMs??REVEAL_DELAY_MS;}
  private choices(){return [...this.buffers.keys()].sort((a,b)=>a-b).filter(index=>index!==this.lastAudible);}
  get status():RevealAudioStatus {
    let phase:RevealAudioStatus['phase'];
    let problem=this.problem;
    if(!this.preferences.enabled||this.preferences.volume<=0)phase='off';
    else if(this.problem==='blocked'||this.problem==='late')phase='blocked';
    else if(this.choices().length)phase='ready';
    else if(!this.contextAttempted||this.loading.size)phase='loading';
    else {phase='unavailable';problem=this.context?'load':'unsupported';}
    return {phase,ready:this.buffers.size,total:this.files.length,problem};
  }
  private report(){
    if(this.disposed)return;
    const status=this.status,key=JSON.stringify(status);
    if(key!==this.lastStatus){this.lastStatus=key;this.platform.onStatus?.(status);}
  }
  private fail(problem:'blocked'|'late'){this.cancel();this.problem=problem;this.report();}
  configure(preferences:CardRevealPreferences){
    this.preferences=preferences;
    if(!preferences.enabled||preferences.volume<=0)this.cancel();
    else if(this.voice)this.voice.gain.gain.value=preferences.volume/100;
    this.report();
  }
  private enabled(){return !this.disposed&&this.visible&&this.preferences.enabled&&this.preferences.volume>0;}
  private getContext(){
    if(!this.context){this.contextAttempted=true;try{this.context=this.platform.createContext();}catch{/* Status exposes unsupported audio. */}}
    return this.context;
  }
  /** Call in an ordinary control's gesture stack, well BEFORE the private reveal.
   * Unlock only: no source is played and no old reveal is ever retried here. */
  unlockFromGesture(){
    if(!this.enabled())return;
    const context=this.getContext();if(!context){this.report();return;}
    this.problem=null;const token=this.generation;
    try{
      if(context.state!=='running')void context.resume().then(()=>{
        if(!this.disposed&&token===this.generation)this.report();
      }).catch(()=>{
        if(!this.disposed&&token===this.generation&&this.enabled()){this.fail('blocked');}
      });
    }catch{this.fail('blocked');}
    this.report();
  }
  /** Start during home/setup, not just at the handoff. Ready subsets are usable. */
  async prepare(){
    if(!this.enabled())return;
    const context=this.getContext();if(!context){this.report();return;}
    const pending=this.files.map((file,index)=>{
      if(this.buffers.has(index))return Promise.resolve();
      const existing=this.loading.get(index);if(existing)return existing;
      const request=Promise.resolve().then(()=>this.platform.load(file,this.abort.signal)).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{
        if(!this.disposed)this.buffers.set(index,buffer);
      }).catch(()=>{/* Missing assets stay retryable; readiness/status never pretend they loaded. */}).finally(()=>{
        this.loading.delete(index);this.report();
      });
      this.loading.set(index,request);return request;
    });
    this.report();await Promise.all(pending);this.report();
  }
  /** Direct SHOW YOUR ROLE click capture. Only decoded choices enter selection. */
  request(){
    this.cancel();if(!this.enabled())return false;
    const context=this.getContext();if(!context){this.report();return false;}
    const choices=this.choices();
    if(!choices.length){this.report();return false;}
    this.unlockFromGesture();if(this.problem==='blocked')return false;
    const slot=this.platform.randomIndex(choices.length);
    const index=choices[Number.isInteger(slot)&&slot>=0&&slot<choices.length?slot:0];
    const token=this.generation,deadline=this.platform.now()+this.delayMs;
    const start=()=>{
      this.timerId=null;
      if(token!==this.generation||!this.enabled())return;
      if(context.state!=='running'){this.fail('blocked');return;}
      if(this.platform.now()>deadline+100){this.fail('late');return;}
      const buffer=this.buffers.get(index);if(!buffer){this.report();return;}
      let source:AudioBufferSourceNode|null=null,gain:GainNode|null=null;
      try{
        source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;source.loop=false;
        gain.gain.value=this.preferences.volume/100;source.connect(gain);gain.connect(context.destination);
        const voice={source,gain};this.voice=voice;
        source.onended=()=>{source?.disconnect();gain?.disconnect();if(this.voice===voice)this.voice=null;};
        source.start();this.lastAudible=index;this.report();
      }catch{source?.disconnect();gain?.disconnect();this.voice=null;this.fail('blocked');}
    };
    if(this.delayMs===0){
      if(context.state==='running')start();
      else void context.resume().then(start).catch(()=>{if(token===this.generation)this.fail('blocked');});
    }else this.timerId=this.platform.timer(start,this.delayMs);
    return true;
  }
  cancel(){
    this.generation++;this.problem=null;
    if(this.timerId!==null){this.platform.clear(this.timerId);this.timerId=null;}
    const voice=this.voice;this.voice=null;
    if(voice){try{voice.source.stop();}catch{/* Already ended. */}voice.source.disconnect();voice.gain.disconnect();}
    this.report();
  }
  setVisible(visible:boolean){
    this.visible=visible;
    if(!visible){this.cancel();try{void this.context?.suspend()?.catch(()=>{});}catch{/* Optional power saving. */}}
  }
  dispose(){
    this.disposed=true;this.cancel();this.abort.abort();this.buffers.clear();this.loading.clear();
    try{void this.context?.close()?.catch(()=>{});}catch{/* Optional API. */}this.context=null;
  }
}
