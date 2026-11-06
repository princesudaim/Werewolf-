import { useEffect, useId, useRef, useState } from 'react';

type Gesture = {kind:'pointer';id:number} | {kind:'keyboard';key:string};
/** Public-report safeguard: one uninterrupted, visible two-second gesture. */
export default function HoldButton({onComplete,disabled=false,className='',describedBy}: {onComplete:()=>void;disabled?:boolean;className?:string;describedBy?:string}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unavailable=useRef(disabled);unavailable.current=disabled;
  const complete=useRef(onComplete);complete.current=onComplete;
  const gesture = useRef<Gesture|null>(null);
  const completed = useRef(false);
  const [holding,setHolding] = useState(false);
  const instructions=useId();
  const cancel = () => {
    if(timer.current!==null)clearTimeout(timer.current);
    timer.current=null;gesture.current=null;completed.current=false;setHolding(false);
  };
  useEffect(()=>{
    const visibility=()=>{if(document.visibilityState==='hidden')cancel();};
    window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      if(timer.current!==null)clearTimeout(timer.current);
      timer.current=null;gesture.current=null;
      window.removeEventListener('blur',cancel);window.removeEventListener('pagehide',cancel);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[]);
  useEffect(()=>{if(disabled)cancel();},[disabled]);
  const begin = (input:Gesture) => {
    if(unavailable.current || gesture.current || document.visibilityState==='hidden')return false;
    gesture.current=input;completed.current=false;setHolding(true);
    timer.current=setTimeout(()=>{
      timer.current=null;
      if(unavailable.current || !gesture.current || completed.current || document.visibilityState==='hidden'){cancel();return;}
      completed.current=true;setHolding(false);complete.current();
    },2000);
    return true;
  };
  const matchingPointer=(id:number)=>gesture.current?.kind==='pointer' && gesture.current.id===id;
  return <button type="button" className={`primary hold-button ${holding?'holding':''} ${className}`} disabled={disabled} aria-label="CONTINUE →" aria-describedby={[instructions,describedBy].filter(Boolean).join(' ')}
    onPointerDown={event=>{
      if(event.button!==0 || event.isPrimary===false)return;
      if(begin({kind:'pointer',id:event.pointerId})){
        try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{/* Older browsers can reject capture. The release still cancels. */}
      }
    }}
    onPointerMove={event=>{
      if(!matchingPointer(event.pointerId))return;
      const rect=event.currentTarget.getBoundingClientRect(),slop=8;
      if(event.clientX<rect.left-slop || event.clientX>rect.right+slop || event.clientY<rect.top-slop || event.clientY>rect.bottom+slop)cancel();
    }}
    onPointerUp={event=>{if(matchingPointer(event.pointerId))cancel();}}
    onPointerCancel={event=>{if(matchingPointer(event.pointerId))cancel();}}
    onPointerLeave={event=>{if(matchingPointer(event.pointerId))cancel();}}
    onLostPointerCapture={event=>{if(matchingPointer(event.pointerId))cancel();}}
    onContextMenu={event=>event.preventDefault()}
    onKeyDown={event=>{if((event.key===' ' || event.key==='Enter') && !event.repeat){event.preventDefault();begin({kind:'keyboard',key:event.key});}}}
    onKeyUp={event=>{if(event.key===' ' || event.key==='Enter'){event.preventDefault();if(gesture.current?.kind==='keyboard' && gesture.current.key===event.key)cancel();}}}
    onBlur={cancel}>
    <span className="hold-label">CONTINUE →</span>
    <small id={instructions}>{holding?'Keep holding · release to cancel':'Press and hold for 2 seconds'}</small>
  </button>;
}
