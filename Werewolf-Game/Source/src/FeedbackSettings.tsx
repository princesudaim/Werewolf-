import type {CardRevealPreferences} from './card-reveal-preferences';
import { useModalDialog } from './use-modal-dialog';
import { useRef, useState, type ReactNode } from 'react';
import { Volume2, Vibrate, X, Sparkles } from 'lucide-react';
import type { FeedbackPreferences } from './feedback-preferences';
import type { MotionPreference } from './motion-preferences';

type Props={
  children?:ReactNode;
  morningDeath?:CardRevealPreferences;
  onMorningDeath?:(preferences:CardRevealPreferences)=>void;
  gameEnd?:CardRevealPreferences;
  onGameEnd?:(preferences:CardRevealPreferences)=>void;
  votedOut?:CardRevealPreferences;
  onVotedOut?:(preferences:CardRevealPreferences)=>void;
  reveal?:CardRevealPreferences;
  onReveal?:(preferences:CardRevealPreferences)=>void;
  preferences:FeedbackPreferences;
  enabled:{sounds:boolean;buttonSounds:boolean;haptics:boolean};
  onPreferences:(preferences:FeedbackPreferences)=>void;
  motionPreference:MotionPreference;
  onMotionChange:(preference:MotionPreference)=>void;
  onEnabled:(key:'sounds'|'buttonSounds'|'haptics',enabled:boolean)=>void;
  onMute:()=>void;
  onClose:()=>void;
  onPreview:(category:'effects'|'haptics')=>void;
};
export default function FeedbackSettings({morningDeath,onMorningDeath,gameEnd,onGameEnd,votedOut,onVotedOut,reveal,onReveal,preferences,enabled,onPreferences,onEnabled,onMute,onClose,onPreview,motionPreference,onMotionChange,children}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const [status,setStatus]=useState('');
  const vibrationSupported=typeof window.navigator.vibrate==='function';
  useModalDialog(dialog);
  const preview=(category:'effects'|'haptics')=>{
    onPreview(category);
    setStatus(category==='haptics'?'Vibration preview requested. Your phone and browser control whether it works.':'Tap preview requested. Check your phone volume if you cannot hear it.');
  };
  const toggle=(key:'sounds'|'buttonSounds'|'haptics',label:string)=>
    <label className="feedback-toggle"><span>{label}</span><input type="checkbox" aria-label={label} checked={enabled[key]} onChange={event=>{onEnabled(key,event.target.checked);setStatus('');}}/></label>;
  return <dialog ref={dialog} className="feedback-dialog" aria-labelledby="feedback-title" aria-describedby="feedback-intro" onCancel={event=>{event.preventDefault();onClose();}}>
    <header className="feedback-heading"><Volume2 size={24} aria-hidden="true"/><div><small>MAKE IT YOURS</small><h2 id="feedback-title">SETTINGS</h2></div><button type="button" className="feedback-close" aria-label="Close settings" onClick={onClose}><X size={21} aria-hidden="true"/></button></header>
    <div className="feedback-content">
      <p id="feedback-intro">Sound effects and a light touch. Your choices stay saved on this device.</p>
      <section className="feedback-group" aria-labelledby="effects-label"><h3 id="effects-label">THE LITTLE DETAILS</h3>
        {toggle('buttonSounds','Button sounds')}
        <label className="feedback-volume"><span>Effects volume <span className="feedback-volume-value" aria-hidden="true">{preferences.effectsVolume}%</span></span><input type="range" aria-label="Effects volume" min="0" max="100" step="5" value={preferences.effectsVolume} onChange={e=>onPreferences({...preferences,effectsVolume:Number(e.target.value)})} data-feedback-silent="true"/></label>
        <p>Button sounds controls soft game cues, vote/skip confirmations, and the night-start and meeting sounds. A final elimination uses the voted-out sound instead of a vote confirmation. Game-end audio has its own controls below. Private turns never identify a role by sound.</p>
        <button type="button" className="feedback-preview" data-feedback-preview="effects" disabled={!enabled.buttonSounds || preferences.effectsVolume===0} onClick={()=>preview('effects')}>PREVIEW TAP</button>
      </section>
      {reveal&&onReveal&&<section className="feedback-group" aria-labelledby="reveal-label"><h3 id="reveal-label">CARD REVEAL</h3>
        <label className="feedback-toggle"><span>Card reveal sounds</span><input type="checkbox" aria-label="Card reveal sounds" data-feedback-silent="true" checked={reveal.enabled} onChange={e=>onReveal({...reveal,enabled:e.target.checked})}/></label>
        <label className="feedback-volume"><span>Card reveal volume <span className="feedback-volume-value" aria-hidden="true">{reveal.volume}%</span></span><input type="range" aria-label="Card reveal volume" min="0" max="100" step="5" data-feedback-silent="true" value={reveal.volume} onChange={e=>onReveal({...reveal,volume:Number(e.target.value)})}/></label>
        <p>On Night 1 only, a random sound starts a quarter-second after SHOW YOUR ROLE. It never identifies your role and will not repeat the previous reveal sound.</p>
      </section>}
      {votedOut&&onVotedOut&&<section className="feedback-group" aria-labelledby="voted-out-label"><h3 id="voted-out-label">VOTED OUT</h3>
        <label className="feedback-toggle"><span>Voted-out sounds</span><input type="checkbox" aria-label="Voted-out sounds" data-feedback-silent="true" checked={votedOut.enabled} onChange={e=>onVotedOut({...votedOut,enabled:e.target.checked})}/></label>
        <label className="feedback-volume"><span>Voted-out volume <span className="feedback-volume-value" aria-hidden="true">{votedOut.volume}%</span></span><input type="range" aria-label="Voted-out volume" min="0" max="100" step="5" data-feedback-silent="true" value={votedOut.volume} onChange={e=>onVotedOut({...votedOut,volume:Number(e.target.value)})}/></label>
        <p>A random sound starts immediately when someone is voted out, even with Button sounds off. Ties and skipped votes do not play it.</p>
      </section>}
      {gameEnd&&onGameEnd&&<section className="feedback-group" aria-labelledby="game-end-label"><h3 id="game-end-label">GAME ENDS</h3>
        <label className="feedback-toggle"><span>Game-end sounds</span><input type="checkbox" aria-label="Game-end sounds" data-feedback-silent="true" checked={gameEnd.enabled} onChange={e=>onGameEnd({...gameEnd,enabled:e.target.checked})}/></label>
        <label className="feedback-volume"><span>Game-end volume <span className="feedback-volume-value" aria-hidden="true">{gameEnd.volume}%</span></span><input type="range" aria-label="Game-end volume" min="0" max="100" step="5" data-feedback-silent="true" value={gameEnd.volume} onChange={e=>onGameEnd({...gameEnd,volume:Number(e.target.value)})}/></label>
        <p>One random sound plays once when the final results appear, for up to 7 seconds. No loop. Independent of Button sounds; old victory and MVP chimes do not play over it.</p>
      </section>}
      {morningDeath&&onMorningDeath&&<section className="feedback-group" aria-labelledby="morning-death-label"><h3 id="morning-death-label">MORNING DEATHS</h3>
        <label className="feedback-toggle"><span>Morning death sounds</span><input type="checkbox" aria-label="Morning death sounds" data-feedback-silent="true" checked={morningDeath.enabled} onChange={e=>onMorningDeath({...morningDeath,enabled:e.target.checked})}/></label>
        <label className="feedback-volume"><span>Morning death volume <span className="feedback-volume-value" aria-hidden="true">{morningDeath.volume}%</span></span><input type="range" aria-label="Morning death volume" min="0" max="100" step="5" data-feedback-silent="true" value={morningDeath.volume} onChange={e=>onMorningDeath({...morningDeath,volume:Number(e.target.value)})}/></label>
        <p>One random sound plays once when the morning report shows one or more deaths. No loop and no sound on a no-death report. Independent of Button sounds.</p>
      </section>}
      <section className="feedback-group" aria-labelledby="haptics-label"><h3 id="haptics-label"><Vibrate size={17} aria-hidden="true"/> THE FEEL</h3>
        {toggle('haptics','Button vibration')}
        <label className="feedback-intensity"><span>Vibration feel</span><select aria-label="Vibration feel" value={preferences.hapticIntensity} onChange={e=>onPreferences({...preferences,hapticIntensity:e.target.value==='standard'?'standard':'gentle'})}><option value="gentle">Gentle</option><option value="standard">Standard</option></select></label>
        <p>{vibrationSupported?'Gentle is a shorter tap; Standard is slightly longer. Actual strength depends on your phone and browser.':'This browser does not offer vibration. Your preference is saved, but gameplay works without it.'}</p>
        <button type="button" className="feedback-preview" data-feedback-preview="haptics" disabled={!enabled.haptics || !vibrationSupported} onClick={()=>preview('haptics')}>PREVIEW VIBRATION</button>
      </section>
      <section className="feedback-group" aria-labelledby="motion-label"><h3 id="motion-label"><Sparkles size={17} aria-hidden="true"/> THE MOTION</h3>
        <label className="feedback-toggle"><span>Reduce animations</span><input type="checkbox" aria-label="Reduce animations" checked={motionPreference==='reduced'} onChange={event=>onMotionChange(event.target.checked?'reduced':'system')}/></label>
        <p>Your phone’s reduced-motion setting is always respected. This switch can reduce effects further. Hold-to-continue still takes 2 seconds.</p>
      </section>
      {children}
      <p className="feedback-status" role="status" aria-live="polite">{status}</p>
      <p className="feedback-footnote">Phone settings may limit sound or vibration. These controls do not pause a running discussion timer.</p>
    </div>
    <footer className="feedback-footer"><button type="button" className="feedback-mute" data-feedback-silent="true" onClick={()=>{onMute();setStatus('Sound effects and vibration are off. Animations are reduced.');}}>TURN ALL OFF</button><button type="button" className="feedback-done" onClick={onClose}>DONE</button></footer>
  </dialog>;
}
