import buttonCatalog from './button-audio-catalog.json' with {type:'json'};
import type { FeedbackPreferences } from './feedback-preferences';

export type FeedbackCue = 'tap' | 'confirm' | 'invalid' | 'select' | 'add' | 'remove' | 'randomize' | 'navigate';
export type FeedbackOptions = FeedbackPreferences & {effects: boolean; haptics: boolean};
export type FeedbackPlatform = {
  createContext: () => AudioContext | null;
  createAudio: () => HTMLAudioElement;
  vibrate: (duration: number) => unknown;
  now: () => number;
};
/** A bounded, optional effect player. It never receives role, vote or outcome data. */
export class FeedbackController {
  private context: AudioContext | null = null;
  private fallback: HTMLAudioElement | null = null;
  private voices = new Set<OscillatorNode>();
  private generation = 0;
  private disposed = false;
  private visible = true;
  private platform: FeedbackPlatform;
  private options: FeedbackOptions;
  constructor(platform: FeedbackPlatform, options: FeedbackOptions) {this.platform=platform;this.options=options;}

  configure(options: FeedbackOptions) {
    const previous=this.options;
    this.options=options;
    this.generation++; // An old resume promise must not replay after a settings change.
    if(!options.effects || options.effectsVolume===0)this.stopEffects();
    else if(previous.effectsVolume!==options.effectsVolume)this.stopEffects();
    if(previous.haptics && !options.haptics)this.cancelVibration();
  }
  setVisible(visible: boolean) {
    this.visible=visible;
    if(!visible){this.cancel();try{void this.context?.suspend?.()?.catch(()=>{});}catch{/* Optional power saving. */}}
  }
  cancelPending() { this.generation++; }
  cancelVibration() { try { this.platform.vibrate(0); } catch { /* Optional API. */ } }
  private stopEffects() {
    for(const voice of this.voices){try { voice.stop();voice.disconnect(); } catch { /* Already ended. */ }}
    this.voices.clear();
    try { this.fallback?.pause(); } catch { /* Optional media. */ }
  }
  cancel() { this.generation++;this.stopEffects();this.cancelVibration(); }

  play(requested: FeedbackCue='tap', privateInteraction=false, preview?: 'effects'|'haptics') {
    if(this.disposed || !this.visible)return;
    // Even explicitly tagged confirmations/errors have the SAME private signature.
    const cue: FeedbackCue=privateInteraction?'tap':requested;
    const duration=this.options.hapticIntensity==='standard'?14:8;
    if(this.options.haptics && preview!=='effects'){
      try { this.platform.vibrate(cue==='invalid'?duration+4:duration); } catch { /* Unsupported/blocked. */ }
    }
    if(preview==='haptics' || !this.options.effects || this.options.effectsVolume===0)return;
    const generation=++this.generation;
    const requestedAt=this.platform.now();
    const permitted=()=>!this.disposed && this.visible && generation===this.generation && this.options.effects && this.options.effectsVolume>0 && this.platform.now()-requestedAt<180;
    const fallback=()=>{
      if(!permitted())return;
      try {
        const player=this.fallback || (this.fallback=this.platform.createAudio());
        player.src=buttonCatalog.cues[cue].file;player.volume=this.options.effectsVolume/100;
        player.currentTime=0; // Reuse one player; never stack fallback clips.
        void player.play()?.catch(()=>{});
      } catch { /* Media failure must never stop the game. */ }
    };
    try {
      const context=this.context || (this.context=this.platform.createContext());
      if(!context){fallback();return;}
      const play=()=>{
        if(!permitted())return;
        let oscillator: OscillatorNode | undefined, gain: GainNode | undefined;
        try {
          // At most one short voice, even during rapid input.
          if(this.voices.size>=1){const oldest=this.voices.values().next().value as OscillatorNode;try{oldest.stop();oldest.disconnect();}catch{}this.voices.delete(oldest);}
          oscillator=context.createOscillator();gain=context.createGain();
          const now=context.currentTime;
          const signatures:Record<FeedbackCue,[number,number,number]>={tap:[220,190,.055],confirm:[330,392,.09],invalid:[196,185,.08],select:[262,294,.055],add:[294,349,.07],remove:[294,247,.07],randomize:[262,392,.10],navigate:[247,294,.065]};
          const [from,to,length]=signatures[cue];
          oscillator.type='sine';oscillator.frequency.setValueAtTime(from,now);
          oscillator.frequency.exponentialRampToValueAtTime(to,now+length*0.6);
          gain.gain.setValueAtTime(0.0001,now);
          gain.gain.exponentialRampToValueAtTime(0.135*this.options.effectsVolume/50,now+0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001,now+length);
          oscillator.connect(gain);gain.connect(context.destination);
          const voice=oscillator,node=gain;
          voice.onended=()=>{this.voices.delete(voice);voice.disconnect();node.disconnect();};
          this.voices.add(voice);voice.start(now);voice.stop(now+length+0.005);
        } catch {
          if(oscillator){this.voices.delete(oscillator);try{oscillator.stop();oscillator.disconnect();}catch{}}
          try{gain?.disconnect();}catch{}
          fallback();
        }
      };
      if(context.state==='running')play();
      else void context.resume().then(play).catch(fallback);
    } catch { fallback(); }
  }
  dispose() {
    this.cancel();this.disposed=true;
    const context=this.context;this.context=null;
    try { void context?.close()?.catch(()=>{}); } catch { /* Already closed. */ }
  }
}
