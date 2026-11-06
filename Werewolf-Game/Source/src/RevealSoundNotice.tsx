import type {RevealAudioStatus} from './card-reveal-controller';
/** Public audio availability only. No match/private data enters this notice. */
export default function RevealSoundNotice({status,onRetry,onWithoutSound}:{status:RevealAudioStatus;onRetry:()=>void;onWithoutSound?:()=>void}){
  if(status.phase==='off'||status.phase==='ready')return null;
  const message=status.phase==='loading'
    ? 'Reveal sounds are loading. You can wait or reveal without sound.'
    : status.problem==='unsupported'
    ? 'This browser cannot play reveal audio. You can still reveal without sound.'
    : status.problem==='blocked'
    ? 'Your browser did not enable reveal audio. Tap RETRY REVEAL SOUND, or continue without sound.'
    : status.problem==='late'
    ? 'The page paused, so this reveal sound was skipped rather than played late.'
    : 'Reveal audio could not load. Check your connection and retry, or reveal without sound.';
  return <div className="reveal-sound-notice">
    <p role="status" aria-live="polite">{message}</p>
    {onWithoutSound&&<button type="button" className="secondary" data-card-reveal-silent="true" onClick={onWithoutSound}>SHOW ROLE WITHOUT SOUND</button>}
    {status.phase!=='loading'&&status.problem!=='unsupported'&&<button type="button" className="secondary" data-feedback-silent="true" onClick={onRetry}>RETRY REVEAL SOUND</button>}
  </div>;
}
