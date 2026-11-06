import { useModalDialog } from './use-modal-dialog';
import { useRef } from 'react';
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
      : <p>One meeting per game · Your vote after: {doubleVote ? '2' : '1'}</p>}
    {!safe && !used && <button type="button" className="mayor-declare" aria-label="DECLARE EMERGENCY ASSEMBLY" onClick={onDeclare}><Megaphone size={19} aria-hidden="true"/> START ASSEMBLY TONIGHT</button>}
    <button type="button" className="mayor-pass" aria-label="SKIP" onClick={onPass}>PASS TONIGHT</button>
  </section>;
}

/** Native modal shown only after every night action and block has resolved. */
export function AssemblyAnnouncement({names, avatars, onClose}: {names: string[]; avatars: AvatarMap; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useModalDialog(dialog);
  return <dialog ref={dialog} className="assembly-announcement" aria-labelledby="assembly-announcement-title" aria-describedby="assembly-announcement-text" onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="assembly-announcement-heading"><Megaphone size={22} aria-hidden="true"/><h2 id="assembly-announcement-title">EMERGENCY VILLAGE ASSEMBLY!</h2></div>
    <div className="assembly-announcement-body">
      <div className="assembly-mayors">{names.map(name=><div key={name}><Avatar name={name} avatars={avatars} className="assembly-mayor-avatar"/><strong>{name}</strong></div>)}</div>
      <p id="assembly-announcement-text">Tonight {names.join(', ')} declared their Mayoralty!</p>
    </div>
    <div className="assembly-announcement-footer"><button ref={button} type="button" onClick={onClose}>GOT IT!</button></div>
  </dialog>;
}
