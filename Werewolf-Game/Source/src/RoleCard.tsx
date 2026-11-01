import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import type { Role } from './werewolf-engine';

type Props = { role: Role; name: string; picture: string; power: number; icon: ReactNode; excluded: boolean; onOpen: () => void; onToggle: () => void };

/** A tap opens details; a stationary 500ms hold changes random eligibility. */
export default function RoleCard({role,name,picture,power,icon,excluded,onOpen,onToggle}: Props) {
  const timer=useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin=useRef<{x:number;y:number;id:number} | null>(null);
  const held=useRef(false);
  const cancel=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;origin.current=null;};
  useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);},[]);
  function down(event:PointerEvent<HTMLButtonElement>) {
    if(event.button!==0 || !event.isPrimary)return;
    cancel();held.current=false;origin.current={x:event.clientX,y:event.clientY,id:event.pointerId};
    timer.current=setTimeout(()=>{timer.current=null;origin.current=null;held.current=true;onToggle();},500);
  }
  return <button type="button" className={`role-info-button${excluded?' role-random-excluded':''}`} aria-label={`View ${name} details`} aria-describedby={`role-power-${role} role-random-${role}`} onPointerDown={down}
    onPointerMove={event=>{const p=origin.current;if(p && (p.id!==event.pointerId || Math.hypot(event.clientX-p.x,event.clientY-p.y)>10))cancel();}}
    onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onContextMenu={event=>event.preventDefault()}
    onKeyDown={event=>{if(event.shiftKey && event.key==='Enter' && !event.repeat){event.preventDefault();held.current=false;onToggle();}}}
    onClick={event=>{if(held.current){event.preventDefault();held.current=false;return;}onOpen();}}>
    <span className="role-card-badge">{icon}</span><span id={`role-power-${role}`} className="role-power-card" aria-label={`Power ${power} out of 10 (current settings)`}>{power}</span>
    <img src={picture} alt=""/><strong>{name}</strong>
    {excluded && <span className="role-excluded-badge" aria-hidden="true">NO RANDOM</span>}
    <span id={`role-random-${role}`} className="visually-hidden">{excluded?'Excluded from random roles.':'Can be picked at random.'} Hold for half a second to change, or press Shift Enter.</span>
  </button>;
}
