import { useEffect, useRef } from 'react';
import { Landmark, Megaphone } from 'lucide-react';
import { Avatar, type AvatarMap } from './PlayerSetup';

export function MayorAbility({safe, used, doubleVote, onDeclare, onPass}: {
  safe: boolean; used: boolean; doubleVote: boolean; onDeclare: () => void; onPass: () => void;
}) {
  return <section className="mayor-ability" aria-labelledby="mayor-ability-title">
    <Landmark className="mayor-assembly-icon" size={44} aria-hidden="true"/>
    <h3 id="mayor-ability-title">EMERGENCY VILLAGE ASSEMBLY</h3>
    {safe ? <p>Your emergency assembly is saved for later nights while first-night safety is on.</p>
      : used ? <p>Your emergency assembly has already been used.</p>
      : <p>Use this power once per game to protect village players from Werewolf attacks tonight.{doubleVote ? ' Your vote will count as 2 from tomorrow.' : ' Your vote will still count as 1.'} Everyone still takes their private turn. Your Mayoralty is announced only when the night ends.</p>}
    {!safe && !used && <button type="button" className="mayor-declare" aria-label="DECLARE EMERGENCY ASSEMBLY" onClick={onDeclare}><Megaphone size={19} aria-hidden="true"/> START ASSEMBLY TONIGHT</button>}
    <button type="button" className="mayor-pass" aria-label="SKIP" onClick={onPass}>PASS TONIGHT</button>
  </section>;
}

/** Native modal shown only after every night action and block has resolved. */
export function AssemblyAnnouncement({names, avatars, onClose}: {names: string[]; avatars: AvatarMap; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    button.current?.focus();
    return ()=>previous?.focus();
  },[]);
  return <dialog ref={dialog} className="assembly-announcement" aria-labelledby="assembly-announcement-title" aria-describedby="assembly-announcement-text" onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="assembly-announcement-heading"><Megaphone size={22} aria-hidden="true"/><h2 id="assembly-announcement-title">EMERGENCY VILLAGE ASSEMBLY!</h2></div>
    <div className="assembly-announcement-body">
      <div className="assembly-mayors">{names.map(name=><div key={name}><Avatar name={name} avatars={avatars} className="assembly-mayor-avatar"/><strong>{name}</strong></div>)}</div>
      <p id="assembly-announcement-text">Tonight {names.join(', ')} declared their Mayoralty!</p>
    </div>
    <div className="assembly-announcement-footer"><button ref={button} type="button" onClick={onClose}>GOT IT!</button></div>
  </dialog>;
}
