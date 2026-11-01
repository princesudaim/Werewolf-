import { useEffect, useRef, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { roleDescription, roles, type Role, type Settings } from './werewolf-engine';

const teams = [
  {id:'village',label:'VILLAGERS'},
  {id:'wolf',label:'WEREWOLVES'},
  {id:'neutral',label:'NEUTRALS'},
] as const;

/** A public reference, not the current player's secret role or choices. */
export default function RoleRulebook({settings,order,onClose}:{settings:Settings;order:Role[];onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const close=useRef<HTMLButtonElement>(null);
  const [search,setSearch]=useState('');
  useEffect(()=>{dialog.current?.showModal();close.current?.focus();},[]);
  const query=search.trim().toLocaleLowerCase();
  const matches=order.filter(role=>!query || roles[role].name.toLocaleLowerCase().includes(query));
  return <dialog ref={dialog} className="role-rulebook" aria-labelledby="role-rulebook-title" onClose={onClose}>
    <div className="role-rulebook-inner">
      <header className="role-rulebook-header"><BookOpen size={22} aria-hidden="true"/><div><h2 id="role-rulebook-title">ROLE RULEBOOK</h2><p>All roles · Your current settings</p></div><button ref={close} type="button" className="role-rulebook-close" aria-label="Close role rulebook" onClick={()=>dialog.current?.close()}><X size={22}/></button></header>
      <div className="role-rulebook-content">
        <p className="role-rulebook-note">The game keeps running while you read. This book shows every role, not who has them.</p>
        {settings.firstNightSafe && <p className="role-rulebook-note role-rulebook-safe">First night is safe: killing abilities and dangerous visits cannot kill. Other abilities can still work.</p>}
        <label className="role-rulebook-search"><Search size={18} aria-hidden="true"/><span className="visually-hidden">Find a role</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a role"/></label>
        {teams.map(({id,label})=>{
          const teamRoles=matches.filter(role=>roles[role].team===id);
          return teamRoles.length ? <section key={id} className={`role-rulebook-team role-rulebook-${id}`} aria-label={label}>
            <h3>{label} <span>{teamRoles.length}</span></h3>
            <div className="role-rulebook-list">{teamRoles.map(role=><article key={role} className="role-rulebook-entry" data-role={role}><h4>{roles[role].name}</h4><span aria-hidden="true"> — </span><p>{roleDescription(role,settings)}</p></article>)}</div>
          </section> : null;
        })}
        {matches.length===0 && <p className="role-rulebook-empty">No roles found. Try another name.</p>}
      </div>
    </div>
  </dialog>;
}
