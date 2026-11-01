import { useEffect, useRef, useState } from 'react';
import { Eye, Star, TriangleAlert, Users } from 'lucide-react';
import { Avatar, type AvatarMap } from './PlayerSetup';
import type { Role } from './werewolf-engine';

export type PrivateInfoData = {
  title: string;
  text: string;
  people?: {id:number;name:string}[];
  shownRole?: Role;
  tone?: 'default'|'gold'|'red'|'green';
  replyTo?: number;
  replyName?: string;
};

export default function PrivateInfo({info,avatars,picture,onClose,onReply,buttonLabel='OK · HIDE RESULT'}:{info:PrivateInfoData; avatars:AvatarMap; picture:(role:Role)=>string; onClose:()=>void; onReply?:(text:string)=>void; buttonLabel?:string}) {
  const button=useRef<HTMLButtonElement>(null);
  const [reply,setReply]=useState('');
  const [replySent,setReplySent]=useState(false);
  const sent=useRef(false);
  useEffect(()=>{setReply('');setReplySent(false);sent.current=false;button.current?.focus();},[info]);
  function sendReply() {
    const text=reply.trim();
    if (!onReply || sent.current || !text) return;
    sent.current=true;setReplySent(true);setReply('');
    onReply(text);
    button.current?.focus();
  }
  const Icon=info.tone==='gold'?Star:info.tone==='red'?TriangleAlert:info.people && info.people.length>1?Users:Eye;
  return <div className={`private-info-backdrop info-${info.tone || 'default'}`}>
    <section className="private-info" role="dialog" aria-modal="true" aria-labelledby="private-info-title" aria-describedby="private-info-text" onKeyDown={event=>{if(event.key==='Tab'){const items=[...event.currentTarget.querySelectorAll<HTMLElement>('textarea,button:not(:disabled)')];const first=items[0],last=items[items.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}}}}>
      <header><Icon size={23} aria-hidden="true"/><h2 id="private-info-title">{info.title}</h2></header>
      <div className="private-info-body">
        {(!!info.people?.length || info.shownRole) && <div className="private-info-portraits">
          {info.people?.map(person=><div className="private-info-person" key={person.id}><Avatar name={person.name} avatars={avatars} className="private-info-avatar"/><strong>{person.name}</strong></div>)}
          {info.shownRole && <div className="private-info-person"><span className="private-info-role-art"><img src={picture(info.shownRole)} alt=""/></span></div>}
        </div>}
        <p id="private-info-text" className="private-info-message">{info.text}</p>
        {onReply && !replySent && <label className="friend-reply"><span>Reply to {info.replyName}</span><textarea aria-label="Your reply" value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a private reply" rows={3}/><small>Your reply arrives next night if you are not blocked</small></label>}
        {replySent && <p className="friend-reply-status" role="status">Reply sent. It will arrive next night if you are not blocked.</p>}
      </div>
      <footer>{onReply && !replySent && <button type="button" className="friend-reply-send" disabled={!reply.trim()} onClick={sendReply}>SEND REPLY</button>}<button ref={button} className="private-info-ok" onClick={onClose} aria-label={buttonLabel}>OK</button></footer>
    </section>
  </div>;
}
