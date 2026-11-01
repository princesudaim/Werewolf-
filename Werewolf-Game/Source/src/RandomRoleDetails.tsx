import { useEffect, useRef } from 'react';
import { ArrowLeft, Check, Minus, Shuffle } from 'lucide-react';
import type { Settings } from './werewolf-engine';

type Team = 'village'|'wolf'|'neutral';
const names: Record<Team,string> = {village:'VILLAGERS',wolf:'WEREWOLVES',neutral:'NEUTRALS'};
export default function RandomRoleDetails({team,settings,onSetting,onClose}:{team:Team;settings:Settings;onSetting:<K extends keyof Settings>(key:K,value:Settings[K])=>void;onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(dialog.current && !dialog.current.open)dialog.current.showModal();},[]);
 return <dialog ref={dialog} className={`role-details role-detail-${team}`} aria-labelledby="random-detail-title" aria-describedby="random-detail-description" onClose={onClose}>
  <div className="role-detail-top"><button type="button" className="role-details-close" aria-label="Close random role details" onClick={()=>dialog.current?.close()}><ArrowLeft size={22}/></button><strong>RANDOM ROLE</strong></div>
  <div className="role-detail-body"><div className="role-detail-frame">
   <span className="role-detail-team">{names[team]}</span><div className="random-detail-art" aria-hidden="true"><Shuffle size={32}/><span>?</span></div>
   <h2 id="random-detail-title">RANDOM {names[team]}</h2><div className="role-detail-divider"/>
   <section className="role-details-description"><h3>DESCRIPTION</h3><p id="random-detail-description">Each Random card picks a role from this team when the game starts. Power points favor roles that bring the team closer to a balanced score. Role chances also affect the pick when enabled.</p></section>
   <div className="random-options"><h3>RANDOM ROLE SETTINGS</h3>
    <label className="random-unique-row"><span><strong>One player per role</strong><small>Random cards will not pick the same role twice or pick a role you added yourself. This works for all three teams. Roles you add yourself do not change.</small></span>
     <span className="setting-check"><input type="checkbox" aria-label="One player per random role" checked={settings.randomUniqueRoles} onChange={event=>onSetting('randomUniqueRoles',event.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span>
    </label>
    <label className="random-unique-row"><span><strong>Random cards follow role chances</strong><small>When on, roles set to 0% cannot be picked. Higher numbers make a role more likely to be picked, together with the power balance. This works for all three teams.</small></span>
     <span className="setting-check"><input type="checkbox" aria-label="Random cards follow role chances" checked={settings.randomFollowChances} onChange={event=>onSetting('randomFollowChances',event.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span>
    </label><p>If there are not enough roles to pick from, change the chances, remove some Random cards, or turn these settings off.</p>
   </div>
  </div></div>
 </dialog>;
}
