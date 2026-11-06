import {useRef,useState} from 'react';
import {X} from 'lucide-react';
import clawMark from './assets/imposter-claw.png';
import {RoleTargetMarker} from './TargetPortrait';
import type {Role} from './werewolf-engine';
import {useModalDialog} from './use-modal-dialog';
import './pack-targeting.css';

type TeammateChoice={actor:{id:number;name:string};action:string};
type Choice={actor:string;number:number;target:string;action:string;own?:boolean};
const actionName=(action:string)=>action==='hypnotize'?'Hypnotize':action==='infect'?'Infect':'Attack';

/** Visual state lives inside the portrait; it never contributes to the card height. */
export function PackChoiceOverlay({target,markers,ownNumber,ownRole='werewolf'}:{target:string;markers:TeammateChoice[];ownNumber?:number;ownRole?:Role}){
  return <>
    {markers.length>0 && <span className="wolf-target-count" aria-label={`${markers.length} teammate ${markers.length===1?'choice':'choices'}. Open TEAM CHOICES for names and actions.`}><img className="pack-claw-icon" src={clawMark} alt="" aria-hidden="true"/>{markers.length}</span>}
    <span className="wolf-choice-markers">
      {markers.map(({actor,action})=><span key={actor.id} className="wolf-choice visually-hidden" aria-label={`${actor.name} chose ${target} to ${action}`}>{actor.name}: {actionName(action)}</span>)}
      {ownNumber!==undefined && <span className="wolf-choice wolf-own-choice" aria-label={`Your choice: ${target}`}>
        <RoleTargetMarker role={ownRole}/>
        <span className="wolf-own-label">#{String(ownNumber).padStart(2,'0')} YOU</span>
      </span>}
    </span>
  </>;
}

/** A bounded overlay cannot show an unlimited pack legibly. The full list is
 * available on touch/keyboard, not just through hover titles or colour keys. */
export function PackChoices({choices}:{choices:Choice[]}){
  const [open,setOpen]=useState(false);
  return <>
    <button type="button" className="pack-choices-button" onClick={()=>setOpen(true)}><img className="pack-claw-icon" src={clawMark} alt="" aria-hidden="true"/>TEAM CHOICES</button>
    {open && <PackChoicesDialog choices={choices} onClose={()=>setOpen(false)}/>}
  </>;
}
function PackChoicesDialog({choices,onClose}:{choices:Choice[];onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);useModalDialog(dialog);
  return <dialog ref={dialog} className="pack-choices-dialog" aria-labelledby="pack-choices-title" onClose={onClose}>
    <header><div><h2 id="pack-choices-title">TEAM CHOICES</h2><p>Private · This night only</p></div><button type="button" aria-label="Close team choices" onClick={()=>dialog.current?.close()}><X size={22} aria-hidden="true"/></button></header>
    <div className="pack-choices-content">
      <p className="pack-choice-note">The small role symbol and YOU tag show your current choice. The small claw count shows teammates’ choices. These are intentions, not confirmed kills.</p>
      {choices.length ? <ul>{choices.map((choice,i)=><li key={`${choice.number}:${choice.target}:${i}`} className={choice.own?'pack-choice-own':''}>
        <span className="pack-choice-actor">#{String(choice.number).padStart(2,'0')} {choice.actor}{choice.own?' (you)':''}</span>
        <span className="pack-choice-action">{actionName(choice.action)} <span aria-hidden="true">→ </span><span className="visually-hidden">target: </span><b>{choice.target}</b></span>
      </li>)}</ul> : <p>No choices yet.</p>}
      <p className="pack-choice-note">Only choices already made by known teammates are shown. Protection, blocking and other night effects still apply.</p>
    </div>
  </dialog>;
}
