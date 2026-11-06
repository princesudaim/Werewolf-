import { Check, Eye, EyeOff, Minus, Settings as SettingsIcon, Shield, Shuffle, SkipForward, Timer } from 'lucide-react';
import {discussionTimeLabel,normalizeDiscussionMinutes} from './discussion-settings';
import type { Settings } from './werewolf-engine';
import type { DistributionMode } from './distribution';
import './setup-settings.css';

type Props = {
  settings: Settings;
  onSetting: <K extends keyof Settings>(key:K,value:Settings[K])=>void;
  distributionOpen: boolean;
  onToggleDistribution: ()=>void;
  onDistribute: (mode:DistributionMode)=>void;
};
const toggles = {
  revealDead: {label:'Show dead player’s role',description:'Show roles in death and vote-out reports. Final match results still reveal roles.',Icon:Eye},
  hideVotedOutRoles: {label:'Hide voted-out player roles',description:'Keep voted-out roles hidden, even when dead-player roles are shown. Final match results still reveal all roles.',Icon:EyeOff},
  secretVotes: {label:'Secret voting',description:'Hide earlier vote choices during voting. The verdict can still show the vote total.',Icon:EyeOff},
  allowSkip: {label:'Allow skip vote',description:'Players can pass without voting for anyone.',Icon:SkipForward},
  firstNightSafe: {label:'No first night kill',description:'Attacks and dangerous visits cannot kill on the first night. Some other abilities still work.',Icon:Shield},
  passiveWait: {label:'Wait time for passive roles',description:'Players with no night action must wait before skipping.',Icon:Timer},
  manualDiscussionControls: {label:'Manual discussion controls',description:'Off: hide End Discussion and +1 Minute. Voting starts when the timer ends.',Icon:Timer},
  allRolesWait: {label:'Wait time for every role',description:'All players must wait before completing their turn.',Icon:Timer},
} as const;

/** Public preference controls only: no local setting state, storage, RNG or dealt-player access. */
export default function SetupSettings({settings,onSetting,distributionOpen,onToggleDistribution,onDistribute}:Props) {
  const toggle=(key:keyof typeof toggles)=>{
    const {label,description,Icon}=toggles[key];
    return <label className="setting-row" key={key}>
      <span className="setting-icon"><Icon size={20} aria-hidden="true"/></span>
      <span className="setting-copy"><strong>{label}</strong><small id={`setup-${key}-help`}>{description}</small></span>
      <span className="setting-check"><input type="checkbox" aria-label={label} aria-describedby={`setup-${key}-help`} checked={settings[key] === true} onChange={e=>onSetting(key,e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span>
    </label>;
  };
  return <details className="role-settings-panel" open><summary><SettingsIcon size={20} aria-hidden="true"/> GAME SETTINGS</summary>
    <div className="role-settings-list">
      <section className="setup-settings-group" aria-labelledby="setup-lineup-title"><h3 id="setup-lineup-title">LINEUP TOOLS</h3>
        <button type="button" className="distribution-button" aria-expanded={distributionOpen} aria-controls="distribution-options" onClick={onToggleDistribution}><Shuffle size={18} aria-hidden="true"/> RANDOM DISTRIBUTION <span aria-hidden="true">{distributionOpen?'⌃':'⌄'}</span></button>
        {distributionOpen && <div id="distribution-options" className="distribution-options">
          <p>Choosing a mode replaces your selected lineup. You can edit it afterward. Easy favors stronger Villagers; Hard favors stronger Werewolves. Neutral roles are included for 5 or more players. Estimates are not guaranteed win rates.</p>
          <div className="distribution-modes">{([['easy','EASY','Favors Villagers'],['balanced','BALANCED','Even matchup'],['hard','HARD','Favors Werewolves']] as const).map(([mode,title,description])=><button key={mode} type="button" className={`distribution-mode distribution-mode-${mode}`} onClick={()=>onDistribute(mode)}><strong>{title}</strong><small>{description}</small></button>)}</div>
          <label className="setting-row distribution-chance-setting"><span className="setting-copy"><strong>Distribution follows role chances</strong><small>Use the sliders in role settings. A 0% role is excluded; other values are chances compared with each other.</small></span><span className="setting-check"><input type="checkbox" aria-label="Distribution follows role chances" checked={settings.distributionFollowChances} onChange={e=>onSetting('distributionFollowChances',e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span></label>
          <label className="setting-row distribution-chance-setting"><span className="setting-copy"><strong>One player per role</strong><small>Automatic distribution assigns each role at most once.</small></span><span className="setting-check"><input type="checkbox" aria-label="One player per distribution role" checked={settings.distributionUniqueRoles} onChange={e=>onSetting('distributionUniqueRoles',e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span></label>
        </div>}
        </section>
      <section className="setup-settings-group" aria-labelledby="setup-voting-title"><h3 id="setup-voting-title">VOTING & REVEALS</h3>
        {toggle('revealDead')}{toggle('hideVotedOutRoles')}{toggle('secretVotes')}{toggle('allowSkip')}
      </section>
      <section className="setup-settings-group" aria-labelledby="setup-safety-title"><h3 id="setup-safety-title">NIGHT SAFETY</h3>
        {toggle('firstNightSafe')}
      </section>
      <section className="setup-settings-group" aria-labelledby="setup-timing-title"><h3 id="setup-timing-title">TURN TIMING</h3>
          {toggle('passiveWait')}
        {settings.passiveWait && <label className="wait-duration setup-wait-duration"><span>Passive role wait: {settings.passiveWaitSeconds || 5} seconds</span><input type="range" aria-label="Passive role wait seconds" min="1" max="15" step="1" value={settings.passiveWaitSeconds || 5} onChange={e=>onSetting('passiveWaitSeconds',Number(e.target.value))}/></label>}
        {toggle('allRolesWait')}
        {settings.allRolesWait && <label className="wait-duration setup-wait-duration"><span>Every role wait: {settings.allRolesWaitSeconds || 5} seconds</span><input type="range" aria-label="Every role wait seconds" min="1" max="15" step="1" value={settings.allRolesWaitSeconds || 5} onChange={e=>onSetting('allRolesWaitSeconds',Number(e.target.value))}/></label>}
        {toggle('manualDiscussionControls')}
        <label className="wait-duration setup-wait-duration discussion-duration"><span>Discussion time: {discussionTimeLabel(settings.discussionMinutes*60)}</span><input type="range" aria-label="Discussion time" aria-valuetext={discussionTimeLabel(settings.discussionMinutes*60)} min="30" max="180" step="30" value={settings.discussionMinutes*60} onChange={e=>onSetting('discussionMinutes',normalizeDiscussionMinutes(Number(e.target.value)/60))}/></label>
      </section>
    </div>
  </details>;
}
