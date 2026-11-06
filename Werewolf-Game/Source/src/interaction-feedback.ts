import {CardRevealController,type RevealAudioStatus} from './card-reveal-controller';
import {revealRandomIndex,type CardRevealPreferences} from './card-reveal-preferences';
import {AudioFocus} from './audio-focus';
import {morningDeathAudioCatalog,gameEndAudioCatalog,votedOutAudioCatalog,transitionCues,publicInteractionCue,type AudioScene} from './game-audio';
import {GameCueController} from './game-cue-controller';
import {PhaseCueController} from './phase-cue-controller';
import { useLayoutEffect, useRef, useState } from 'react';
import { FeedbackController, type FeedbackOptions, type FeedbackCue } from './feedback-controller';
import type { FeedbackPreferences } from './feedback-preferences';

type Options=FeedbackPreferences & {sounds:boolean;buttonSounds:boolean;haptics:boolean;scene:AudioScene;privateInteraction:boolean;sceneKey:string;reveal:CardRevealPreferences;morningDeath?:CardRevealPreferences;gameEnd?:CardRevealPreferences;votedOut?:CardRevealPreferences;revealTurnKey:string};
/** One audio owner. Only explicitly public scene facts enter the sound router. */
export function useGameFeedback(input:Options) {
  const options={...input,morningDeath:input.morningDeath??{enabled:false,volume:50},gameEnd:input.gameEnd??{enabled:false,volume:50},votedOut:input.votedOut??{enabled:false,volume:50}};
  const [revealStatus,setRevealStatus]=useState<RevealAudioStatus>({phase:'off',ready:0,total:14,problem:null});
  const [votedOutNeedsRetry,setVotedOutNeedsRetry]=useState(false);
  const [votedOutStatus,setVotedOutStatus]=useState<RevealAudioStatus>({phase:'off',ready:0,total:8,problem:null});
  const votedOut=useRef<CardRevealController|null>(null);
  const [gameEndNeedsRetry,setGameEndNeedsRetry]=useState(false);
  const [gameEndStatus,setGameEndStatus]=useState<RevealAudioStatus>({phase:'off',ready:0,total:5,problem:null});
  const gameEnd=useRef<CardRevealController|null>(null);
  const [morningDeathNeedsRetry,setMorningDeathNeedsRetry]=useState(false);
  const [morningDeathStatus,setMorningDeathStatus]=useState<RevealAudioStatus>({phase:'off',ready:0,total:3,problem:null});
  const morningDeath=useRef<CardRevealController|null>(null);
  const latest=useRef(options);latest.current=options;
  const effects=useRef<FeedbackController|null>(null);
  const clips=useRef<GameCueController|null>(null);
  const phase=useRef<PhaseCueController|null>(null);
  const reveal=useRef<CardRevealController|null>(null);
  const previousTurn=useRef(options.revealTurnKey);
  const previousScene=useRef<AudioScene|null>(null);
  const timerState=useRef<{key:string;seconds:number;warned:boolean}|null>(null);
  const effectOptions=(o:Options):FeedbackOptions=>({...o,effects:o.buttonSounds});
  useLayoutEffect(()=>{
    const effectPlayer=new FeedbackController({
      createContext:()=>{const AudioClass=window.AudioContext || (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return AudioClass?new AudioClass():null;},
      createAudio:()=>new window.Audio(),vibrate:duration=>window.navigator.vibrate?.(duration),now:()=>performance.now(),
    },effectOptions(latest.current));
    const clipPlayer=new GameCueController({createAudio:()=>new Audio(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),duck:()=>{}});
    const phasePlayer=new PhaseCueController({
      // Local files cannot fetch/decode via WebAudio reliably; preserve native media playback there.
      createContext:()=>{if(window.location.protocol==='file:')return null;const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return C?new C({latencyHint:'interactive'}):null;},
      createAudio:()=>new window.Audio(),
      load:async(url,signal)=>{
        const timeout=new AbortController(),abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(abort,15000);
        try{const response=await fetch(url,{signal:timeout.signal});if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      },
      now:()=>performance.now(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),
    });
    phasePlayer.configure(latest.current.buttonSounds,latest.current.effectsVolume);phase.current=phasePlayer;void phasePlayer.prepare();
    const revealPlayer=new CardRevealController({
      createContext:()=>{const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return C?new C():null;},
      load:async(url,signal)=>{
        const timeout=new AbortController(),abort=()=>timeout.abort();
        signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(abort,15000);
        try{const response=await fetch(url,{signal:timeout.signal});if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      },
      onStatus:setRevealStatus,
      randomIndex:revealRandomIndex,now:()=>performance.now(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),
    });
    const votedPlayer=new CardRevealController({
      createContext:()=>{const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return C?new C():null;},
      load:async(url,signal)=>{
        const timeout=new AbortController(),abort=()=>timeout.abort();
        signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(abort,15000);
        try{const response=await fetch(url,{signal:timeout.signal});if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      },
      onStatus:setVotedOutStatus,
      randomIndex:revealRandomIndex,now:()=>performance.now(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),
    },{files:Object.values(votedOutAudioCatalog.cues).map(c=>c.file),delayMs:0});
    const endPlayer=new CardRevealController({
      createContext:()=>{const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return C?new C():null;},
      load:async(url,signal)=>{
        const timeout=new AbortController(),abort=()=>timeout.abort();
        signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(abort,15000);
        try{const response=await fetch(url,{signal:timeout.signal});if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      },
      onStatus:setGameEndStatus,
      randomIndex:revealRandomIndex,now:()=>performance.now(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),
    },{files:Object.values(gameEndAudioCatalog.cues).map(c=>c.file),delayMs:0});
    const deathPlayer=new CardRevealController({
      createContext:()=>{const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return C?new C():null;},
      load:async(url,signal)=>{
        const timeout=new AbortController(),abort=()=>timeout.abort();
        signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(abort,15000);
        try{const response=await fetch(url,{signal:timeout.signal});if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      },
      onStatus:setMorningDeathStatus,
      randomIndex:revealRandomIndex,now:()=>performance.now(),timer:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),
    },{files:Object.values(morningDeathAudioCatalog.cues).map(c=>c.file),delayMs:0});
    revealPlayer.configure(latest.current.reveal);reveal.current=revealPlayer;votedPlayer.configure(latest.current.votedOut);votedOut.current=votedPlayer;void votedPlayer.prepare();endPlayer.configure(latest.current.gameEnd);gameEnd.current=endPlayer;void endPlayer.prepare();deathPlayer.configure(latest.current.morningDeath);morningDeath.current=deathPlayer;void deathPlayer.prepare();
    clipPlayer.configure(latest.current.buttonSounds,latest.current.effectsVolume);
    previousScene.current=latest.current.scene;
    effects.current=effectPlayer;clips.current=clipPlayer;
    const applyVisibility=()=>{const visible=document.visibilityState!=='hidden'&&focus.ownsAudio;effectPlayer.setVisible(visible);clipPlayer.setVisible(visible);phasePlayer.setVisible(visible);if(visible)void phasePlayer.prepare();revealPlayer.setVisible(visible);votedPlayer.setVisible(visible);endPlayer.setVisible(visible);deathPlayer.setVisible(visible);if(visible)void deathPlayer.prepare();if(visible)void endPlayer.prepare();if(visible)void votedPlayer.prepare();if(visible&&['home','players','roles','nightIntro','pass'].includes(latest.current.scene.screen))void revealPlayer.prepare();};
    const focus=new AudioFocus(()=>new window.BroadcastChannel('werewolf.audio-focus.v1:'+encodeURIComponent(new URL('.',window.location.href).pathname)),window.crypto?.randomUUID?.()??`${Date.now()}:${performance.now()}`,applyVisibility);
    const syncVisibility=()=>{if(document.visibilityState!=='hidden')focus.claim();applyVisibility();};
    const hide=()=>{effectPlayer.setVisible(false);clipPlayer.setVisible(false);phasePlayer.setVisible(false);revealPlayer.setVisible(false);votedPlayer.setVisible(false);endPlayer.setVisible(false);deathPlayer.setVisible(false);};
    const show=()=>syncVisibility();
    syncVisibility();
    function valid(target:EventTarget|null):Element|null{
      if(!(target instanceof window.Element) || !target.closest('main.app'))return null;
      const control=target.closest('button,input,select,summary,[role="button"]');
      if(!control || control.matches(':disabled') || control.closest('fieldset:disabled') || control.getAttribute('aria-disabled')==='true')return null;
      return control;
    }
    function feedback(target:Element){
      if(!['action','privateResult'].includes(latest.current.scene.screen))revealPlayer.cancel();
      if(target.closest('[data-feedback-silent], [data-feedback-preview]'))return;
      const o=latest.current;
      let next={...o};
      if(target instanceof window.HTMLInputElement && target.type==='checkbox'){
        if(target.getAttribute('aria-label')==='Button sounds')next.buttonSounds=target.checked;
        if(target.getAttribute('aria-label')==='Button vibration')next.haptics=target.checked;
      }
      if(target.closest('[aria-label="Enable game sounds"]'))next={...next,buttonSounds:true};
      if(target.closest('[aria-label="Mute game sounds"]')){
        next={...next,buttonSounds:false};
      }
      effectPlayer.configure(effectOptions(next));clipPlayer.configure(next.buttonSounds,next.effectsVolume);phasePlayer.configure(next.buttonSounds,next.effectsVolume);
      const tagged=target.getAttribute('data-feedback');
      const cue:FeedbackCue=tagged==='confirm'||tagged==='invalid'?tagged:o.privateInteraction?'tap':publicInteractionCue(target.getAttribute('aria-label')??target.textContent??'') as FeedbackCue;
      effectPlayer.play(cue,o.privateInteraction);
    }
    function click(event:MouseEvent){
      // Browser autoplay recovery remains in the user-gesture call stack.
      if(document.visibilityState!=='hidden')focus.claim();
      phasePlayer.unlockFromGesture();clipPlayer.primeFromGesture();
      const control=valid(event.target);
      if(!control || control.classList.contains('hold-button'))return;
      if(control instanceof window.HTMLInputElement && !['checkbox','radio','file','button','submit'].includes(control.type))return;
      if(control.tagName==='SELECT')return;
      revealPlayer.unlockFromGesture();votedPlayer.unlockFromGesture();endPlayer.unlockFromGesture();deathPlayer.unlockFromGesture();
      if(control.hasAttribute('data-ballot-submit')&&latest.current.scene.screen==='vote'){
        // The actual commit handler requests audio. Do not layer the generic tap.
        effectPlayer.cancel();clipPlayer.cancel();effectPlayer.play('tap',true,'haptics');return;
      }
      if((control.hasAttribute('data-card-reveal')||control.hasAttribute('data-card-reveal-silent'))&&latest.current.scene.screen==='pass'){
        effectPlayer.cancel();clipPlayer.cancel();
        effectPlayer.play('tap',true,'haptics');
        if(control.hasAttribute('data-card-reveal'))revealPlayer.request();else revealPlayer.cancel();return;
      }
      feedback(control);
    }
    let lastSlider=-Infinity;
    function change(event:Event){
      const control=valid(event.target);
      if(control instanceof window.HTMLSelectElement || (control instanceof window.HTMLInputElement && ['range','number'].includes(control.type))){
        if(control instanceof window.HTMLInputElement && control.type==='range'){
          const now=performance.now();if(now-lastSlider<65)return;lastSlider=now;
        }
        feedback(control);
      }
    }
    function pointerdown(event:PointerEvent){const control=valid(event.target);if(control&&document.visibilityState!=='hidden'){focus.claim();phasePlayer.unlockFromGesture();revealPlayer.unlockFromGesture();votedPlayer.unlockFromGesture();endPlayer.unlockFromGesture();deathPlayer.unlockFromGesture();}if(control?.classList.contains('hold-button') && event.button===0)feedback(control);}
    function keydown(event:KeyboardEvent){const control=valid(event.target);if(control&&document.visibilityState!=='hidden'){focus.claim();phasePlayer.unlockFromGesture();revealPlayer.unlockFromGesture();votedPlayer.unlockFromGesture();endPlayer.unlockFromGesture();deathPlayer.unlockFromGesture();}if(control?.classList.contains('hold-button') && (event.key==='Enter'||event.key===' ') && !event.repeat)feedback(control);}
    document.addEventListener('click',click,true);document.addEventListener('change',change,true);
    document.addEventListener('pointerdown',pointerdown,true);document.addEventListener('keydown',keydown,true);
    document.addEventListener('visibilitychange',syncVisibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
    return ()=>{
      document.removeEventListener('click',click,true);document.removeEventListener('change',change,true);
      document.removeEventListener('pointerdown',pointerdown,true);document.removeEventListener('keydown',keydown,true);
      document.removeEventListener('visibilitychange',syncVisibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);
      focus.dispose();effectPlayer.dispose();clipPlayer.dispose();phasePlayer.dispose();revealPlayer.dispose();votedPlayer.dispose();endPlayer.dispose();deathPlayer.dispose();morningDeath.current=null;votedOut.current=null;gameEnd.current=null;effects.current=null;clips.current=null;phase.current=null;reveal.current=null;
    };
  },[]);
  useLayoutEffect(()=>{
    effects.current?.configure(effectOptions(options));clips.current?.configure(options.buttonSounds,options.effectsVolume);
    phase.current?.configure(options.buttonSounds,options.effectsVolume);void phase.current?.prepare();
  },[options.buttonSounds,options.haptics,options.effectsVolume,options.hapticIntensity]);
  useLayoutEffect(()=>{
    reveal.current?.configure(options.reveal);
    if(['home','players','roles','nightIntro','pass'].includes(options.scene.screen))void reveal.current?.prepare();
    if(['home','players','roles','nightIntro','morning'].includes(options.scene.screen))void phase.current?.prepare();
  },[options.reveal.enabled,options.reveal.volume,options.sceneKey]);
  useLayoutEffect(()=>{
    votedOut.current?.configure(options.votedOut);
    void votedOut.current?.prepare();
  },[options.votedOut.enabled,options.votedOut.volume]);
  useLayoutEffect(()=>{
    gameEnd.current?.configure(options.gameEnd);void gameEnd.current?.prepare();
  },[options.gameEnd.enabled,options.gameEnd.volume]);
  useLayoutEffect(()=>{
    morningDeath.current?.configure(options.morningDeath);void morningDeath.current?.prepare();
  },[options.morningDeath.enabled,options.morningDeath.volume]);
  useLayoutEffect(()=>{
    const before=previousScene.current;previousScene.current=options.scene;
    const sameTurn=previousTurn.current===options.revealTurnKey;previousTurn.current=options.revealTurnKey;
    if(!(sameTurn&&before&&['pass','action','privateResult'].includes(before.screen)&&['action','privateResult'].includes(options.scene.screen)))reveal.current?.cancel();
    const sequence=transitionCues(before,options.scene);
    const keepBallot=before?.screen==='vote'&&['vote','voteResult'].includes(options.scene.screen)&&!sequence.includes('voted-out');
    effects.current?.cancelPending();clips.current?.cancel(false);if(!keepBallot)phase.current?.cancel();votedOut.current?.cancel();setVotedOutNeedsRetry(false);gameEnd.current?.cancel();setGameEndNeedsRetry(false);morningDeath.current?.cancel();setMorningDeathNeedsRetry(false);
    
    if(sequence.includes('night-start')||sequence.includes('meeting-start')){
      phase.current?.play(sequence.includes('night-start')?'night-start':'meeting-start');
    }else if(sequence.includes('morning-death')){
      const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(C)setMorningDeathNeedsRetry(!morningDeath.current?.request());
      else {clips.current?.configure(options.morningDeath.enabled,options.morningDeath.volume);clips.current?.play(sequence);}
    }else if(sequence.includes('game-end')){
      const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(C)setGameEndNeedsRetry(!gameEnd.current?.request());
      else {clips.current?.configure(options.gameEnd.enabled,options.gameEnd.volume);clips.current?.play(sequence);}
    }else if(sequence.includes('voted-out')){
      const C=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(C)setVotedOutNeedsRetry(!votedOut.current?.request());
      else {clips.current?.configure(options.votedOut.enabled,options.votedOut.volume);clips.current?.play(sequence);}
    }else if(sequence.includes('divided')&&before?.screen==='vote'){
      // Final no-elimination ballot already owns its confirmation, not a second chime.
    }else if(sequence.length){clips.current?.configure(options.buttonSounds,options.effectsVolume);clips.current?.play(sequence);}
  },[options.sceneKey,options.scene.side]);
  useLayoutEffect(()=>{
    const scene=options.scene,previous=timerState.current;
    if(scene.screen!=='discussion'){
      if(previous && scene.screen==='vote' && previous.seconds<=1)clips.current?.play(['time-up','vote-open']);
      timerState.current=null;return;
    }
    const same=previous?.key===scene.key;
    const warned=same?previous.warned:false;
    // Crossing a threshold only; a recovered/hidden overdue timer never queues warnings.
    if(same&&!warned&&previous.seconds>10&&scene.seconds<=10&&scene.seconds>0)clips.current?.play(['warning']);
    timerState.current={key:scene.key,seconds:scene.seconds,warned:warned||(same&&previous.seconds>10&&scene.seconds<=10)};
  },[options.scene.screen,options.scene.seconds,options.scene.key]);
  return {
    playBallot:()=>{if(latest.current.scene.screen==='vote'){effects.current?.cancel();clips.current?.cancel();phase.current?.playBallot();}},
    revealStatus,votedOutStatus,votedOutNeedsRetry,gameEndStatus,gameEndNeedsRetry,morningDeathStatus,morningDeathNeedsRetry,
    retryMorningDeathAudio:()=>{
      if(latest.current.scene.screen!=='morning'||!latest.current.scene.hasDeaths)return;
      morningDeath.current?.unlockFromGesture();void morningDeath.current?.prepare();setMorningDeathNeedsRetry(!morningDeath.current?.request());
    },
    retryGameEndAudio:()=>{
      if(latest.current.scene.screen!=='end')return;
      gameEnd.current?.unlockFromGesture();void gameEnd.current?.prepare();setGameEndNeedsRetry(!gameEnd.current?.request());
    },
    retryVotedOutAudio:()=>{
      if(latest.current.scene.screen!=='voteResult'||!latest.current.scene.hasVictim)return;
      votedOut.current?.unlockFromGesture();void votedOut.current?.prepare();setVotedOutNeedsRetry(!votedOut.current?.request());
    },
    retryRevealAudio:()=>{reveal.current?.unlockFromGesture();void reveal.current?.prepare();},
    previewEffects:()=>{reveal.current?.cancel();clips.current?.cancel();effects.current?.play('tap',latest.current.privateInteraction,'effects');},
    previewHaptics:()=>{reveal.current?.cancel();effects.current?.play('tap',latest.current.privateInteraction,'haptics');},
    stopPreview:()=>{phase.current?.cancel();morningDeath.current?.cancel();gameEnd.current?.cancel();votedOut.current?.cancel();reveal.current?.cancel();clips.current?.cancel();effects.current?.cancel();},
  };
}
