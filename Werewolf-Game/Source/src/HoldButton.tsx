import { useEffect, useRef, useState } from 'react';

/** A deliberate press for public reports; releasing early cancels it. */
export default function HoldButton({onComplete}: {onComplete:()=>void}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding,setHolding] = useState(false);
  const cancel = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current=null; setHolding(false); };
  useEffect(()=>()=>{ if (timer.current !== null) clearTimeout(timer.current); },[]);
  const begin = () => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current=setTimeout(()=>{timer.current=null;setHolding(false);onComplete();},2000);
  };
  return <button type="button" className={`primary hold-button ${holding?'holding':''}`} aria-label="CONTINUE →" aria-describedby="hold-instructions"
    onPointerDown={event=>{if(event.button===0){event.currentTarget.setPointerCapture?.(event.pointerId);begin();}}}
    onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onContextMenu={event=>event.preventDefault()}
    onKeyDown={event=>{if ((event.key===' ' || event.key==='Enter') && !event.repeat) {event.preventDefault();begin();}}}
    onKeyUp={event=>{if(event.key===' ' || event.key==='Enter'){event.preventDefault();cancel();}}} onBlur={cancel}>
    <span>CONTINUE →</span><small id="hold-instructions">Press and hold for 2 seconds</small>
  </button>;
}
