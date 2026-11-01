import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { readRankings } from './rankings';
import SettingCheckbox from './SettingCheckbox';
import { ArrowLeft, BarChart3, Camera, ChevronRight, Image as ImageIcon, Pencil, Plus, Shuffle, Share2, Trash2, User, UserPlus, Users, X } from 'lucide-react';
import { assignAvatar, normalizeAvatars, avatarFiles, resolveAvatar, playerKey as key, type AvatarMap } from './avatar-assignment';

export type { AvatarMap } from './avatar-assignment';
type Profile = { name: string; avatar: string };
export function readLibrary(): Profile[] {
  try {
    const stored = localStorage.getItem('werewolf.library.v1');
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter((p): p is Profile => !!p && typeof p.name === 'string' && typeof p.avatar === 'string').map(p => ({...p,avatar:resolveAvatar(p.avatar)}));
    }
    // Migrate names saved by the earlier version into the new player library.
    const names: unknown = JSON.parse(localStorage.getItem('werewolf.names') || '[]');
    return Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string').map(name => ({name, avatar:''})) : [];
  } catch { return []; }
}
export function readAvatars(): AvatarMap {
  try { const data: unknown = JSON.parse(localStorage.getItem('werewolf.avatars.v1') || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? Object.fromEntries(Object.entries(data).map(([name,src])=>[name,typeof src === 'string' ? resolveAvatar(src) : src])) as AvatarMap : {}; } catch { return {}; }
}
export function Avatar({ name, avatars, className = 'avatar' }: {name:string; avatars:AvatarMap; className?:string}) {
  const src = avatars[key(name)];
  return <span className={className}>{src ? <img src={src} alt="" /> : name.slice(0,1).toUpperCase()}</span>;
}

async function imageData(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await new Promise<void>((resolve,reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not read that image.')); });
    const side = Math.min(image.naturalWidth,image.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width=160; canvas.height=160;
    const context = canvas.getContext('2d'); if (!context || !side) throw new Error('Could not process that image.');
    context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,160,160);
    return canvas.toDataURL('image/jpeg',0.72);
  } finally { URL.revokeObjectURL(url); }
}

export default function PlayerSetup({ names, setNames, avatars, setAvatars, onContinue, onBack }: {
  names:string[]; setNames:(names:string[])=>void; avatars:AvatarMap; setAvatars:(avatars:AvatarMap)=>void; onContinue:()=>void; onBack:()=>void;
}) {
  const [library,setLibrary] = useState<Profile[]>(readLibrary);
  const [view,setView] = useState<'roster'|'form'|'library'|'rankings'>('roster');
  const [name,setName] = useState('');
  const [avatar,setAvatar] = useState('');
  const [remember,setRemember] = useState(true);
  const [editing,setEditing] = useState<string|null>(null);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [deleteMode,setDeleteMode] = useState(false);
  const [shareStatus,setShareStatus] = useState('');
  const [sheet,setSheet] = useState<'source'|'avatars'|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(() => { if (sheet && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [sheet]);
  const normalized = useRef(false);
  useLayoutEffect(() => { window.scrollTo({top:0,behavior:'instant'}); }, [view]);
  function persistBoth(nextLibrary: Profile[], nextAvatars: AvatarMap) {
    try {
      const oldLibrary = localStorage.getItem('werewolf.library.v1');
      const oldAvatars = localStorage.getItem('werewolf.avatars.v1');
      try {
        localStorage.setItem('werewolf.library.v1',JSON.stringify(nextLibrary));
        localStorage.setItem('werewolf.avatars.v1',JSON.stringify(nextAvatars));
      } catch (e) {
        if (oldLibrary === null) localStorage.removeItem('werewolf.library.v1'); else localStorage.setItem('werewolf.library.v1',oldLibrary);
        if (oldAvatars === null) localStorage.removeItem('werewolf.avatars.v1'); else localStorage.setItem('werewolf.avatars.v1',oldAvatars);
        throw e;
      }
    } catch { setError('Could not save the player. Storage may be full or disabled.'); return false; }
    setLibrary(nextLibrary); setAvatars(nextAvatars); return true;
  }
  function syncLibrary(next: AvatarMap, affected: string[], profiles = library): Profile[] {
    const keys = new Set(affected.map(key));
    return profiles.map(p => keys.has(key(p.name)) ? {...p, avatar:next[key(p.name)] || ''} : p);
  }
  function describeChanges(affected: string[], unassigned: string[]) {
    if (!affected.length) return '';
    const assigned = affected.filter(n=>!unassigned.includes(n));
    return [assigned.length ? `${assigned.join(', ')} received a random unused avatar.` : '',
      unassigned.length ? `${unassigned.join(', ')} now use initials because all ${avatarFiles.length} built-in avatars are taken.` : ''].filter(Boolean).join(' ');
  }
  useEffect(() => {
    if (normalized.current) return;
    normalized.current = true;
    const fixed = normalizeAvatars(names,avatars);
    if (fixed.changed.length && persistBoth(syncLibrary(fixed.avatars,fixed.changed),fixed.avatars)) {
      setNotice(describeChanges(fixed.changed,fixed.unassigned));
    }
  // Run once when opening setup to repair duplicate assignments from old versions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function openAdd() { setName('');setAvatar('');setEditing(null);setRemember(true);setError('');setView('form'); }
  function edit(n:string) { setName(n);setAvatar(avatars[key(n)] || '');setEditing(n);setRemember(library.some(p=>key(p.name)===key(n)));setError('');setView('form'); }
  function submit() {
    const n=name.trim();
    if (!n) {setError('Enter a player name.');return;}
    if (names.some(existing=>key(existing)===key(n) && existing!==editing)) {setError('That player is already in this game.');return;}
    if (!editing && names.length >= 24) {setError('A game can have up to 24 players.');return;}
    if (library.some(p=>key(p.name)===key(n) && (!editing || key(p.name)!==key(editing)))) {setError('That name is already in the library.');return;}
    const nextNames = editing ? names.map(old=>old===editing?n:old) : [...names,n];
    const base={...avatars}; if (editing && key(editing)!==key(n)) delete base[key(editing)];
    const assigned=assignAvatar(nextNames,base,n,avatar);
    const previousLibrary = library.filter(p=>key(p.name)!==key(editing || n) && key(p.name)!==key(n));
    const nextLibrary = syncLibrary(assigned.avatars,assigned.displaced,remember ? [...previousLibrary,{name:n,avatar}] : previousLibrary);
    if (!persistBoth(nextLibrary,assigned.avatars)) return;
    setNames(nextNames); setNotice(describeChanges(assigned.displaced,assigned.unassigned));
    setError('');setView('roster');
  }
  function addRandomPlayer() {
    if (names.length >= 24) { setError('A game can have up to 24 players.'); return; }
    const pool=['Alex','Ayla','Ayaan','Bella','Bilal','Cleo','Dani','Eli','Elena','Finn','Hana','Haris','Iris','Jade','Kai','Layla','Leo','Luna','Maya','Milo','Nadia','Noah','Omar','Raya','Rumi','Sam','Sara','Tariq','Zara','Zayn','Aria','Nora','Amir','Amina','Dylan','Eden','Remy','Ari','Juno','Nico'];
    const taken=new Set([...names,...library.map(p=>p.name)].map(key));
    const availableNames=pool.filter(n=>!taken.has(key(n)));
    const pick=(length:number)=>Math.min(length-1,Math.floor(Math.random()*length));
    let n=availableNames.length ? availableNames[pick(availableNames.length)] : pool[pick(pool.length)];
    if (taken.has(key(n))) { const base=n; let suffix=2; while(taken.has(key(`${base} ${suffix}`))) suffix++; n=`${base} ${suffix}`; }
    const used=new Set(names.map(existing=>avatars[key(existing)]).filter(Boolean));
    const availableAvatars=avatarFiles.filter(src=>!used.has(src));
    // When all built-in portraits are occupied, make a distinct lightweight avatar
    // instead of taking another player's portrait or leaving this player blank.
    const hue=Math.floor(Math.random()*360), accent=(hue+48)%360;
    const generated=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><title>${n}</title><rect width="160" height="160" rx="25" fill="hsl(${hue},55%,24%)"/><circle cx="80" cy="76" r="53" fill="hsl(${accent},70%,72%)"/><circle cx="62" cy="70" r="5" fill="#19202b"/><circle cx="98" cy="70" r="5" fill="#19202b"/><path d="M60 92 Q80 110 100 92" fill="none" stroke="#19202b" stroke-width="5" stroke-linecap="round"/><circle cx="49" cy="88" r="7" fill="#ef8c9e" opacity=".75"/><circle cx="111" cy="88" r="7" fill="#ef8c9e" opacity=".75"/></svg>`;
    const avatar=availableAvatars.length ? availableAvatars[pick(availableAvatars.length)] : `data:image/svg+xml,${encodeURIComponent(generated)}`;
    const nextNames=[...names,n];
    const assigned=assignAvatar(nextNames,avatars,n,avatar);
    if (!persistBoth(library,assigned.avatars)) return;
    setNames(nextNames);setError('');
    setNotice(`${n} was added to this game.`);
  }
  function toggleLibrary(p:Profile) {
    if (names.some(n=>key(n)===key(p.name))) {setNames(names.filter(n=>key(n)!==key(p.name)));return;}
    if (names.length>=24) {setError('A game can have up to 24 players.');return;}
    const nextNames=[...names,p.name];
    const assigned=assignAvatar(nextNames,avatars,p.name,p.avatar);
    if (!persistBoth(syncLibrary(assigned.avatars,assigned.displaced),assigned.avatars)) return;
    setNames(nextNames);setNotice(describeChanges(assigned.displaced,assigned.unassigned));setError('');
  }
  async function selectPhoto(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; e.target.value=''; if (!file) return;
    try {setAvatar(await imageData(file));setError('');} catch(err) {setError((err as Error).message);}
  }
  async function shareRankings() {
    const records=readRankings();
    const text=['WEREWOLF — ALL-TIME RANKINGS', ...(records.length ? records.map((r,i)=>`${i+1}. ${r.name} — ${r.wins} wins / ${r.played} games`) : ['No completed games yet.'])].join('\n');
    try {
      if (navigator.share) { await navigator.share({title:'Werewolf rankings',text}); setShareStatus(''); }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); setShareStatus('Rankings copied to clipboard.'); }
      else setShareStatus('Sharing is not available in this browser.');
    } catch (e) { if ((e as Error).name !== 'AbortError') setShareStatus('Could not share rankings on this device.'); }
  }
  const closeSheet = () => { dialog.current?.close(); setSheet(null); };
  const back = () => { if (view==='roster') onBack(); else if (view==='form' || view==='library') setView('roster'); else setView('library'); };
  const title = view==='roster'?'ADD PLAYER':view==='form'?(editing?'EDIT PLAYER':'ADD PLAYER'):view==='library'?'PLAYER LIBRARY':'ALL-TIME RANKINGS';
  return <div className="setup-wrap"><header className="setup-header"><button className="setup-icon-button" aria-label="Go back" onClick={back}><ArrowLeft size={22}/></button><div className="setup-heading"><h2>{title}</h2>{view==='roster' && <small>{names.length} PLAYERS · MIN. 4</small>}</div>{view==='roster' && <><button className="setup-icon-button" aria-label="PLAYER LIBRARY" onClick={()=>{setError('');setView('library');}}><Users size={21}/></button><button className={`setup-icon-button ${deleteMode?'danger':''}`} aria-label={deleteMode?'Exit delete mode':'Delete players'} aria-pressed={deleteMode} onClick={()=>setDeleteMode(!deleteMode)}><Trash2 size={21}/></button></>}</header><div className="page setup">
    {view==='roster' && <>
      {deleteMode && <div className="delete-banner"><Trash2 size={18}/> <strong>DELETE MODE</strong><button onClick={()=>setDeleteMode(false)}>OK</button></div>}
      {notice && <p className="avatar-notice" role="status">{notice}</p>}{error && <p className="warning" role="alert">{error}</p>}
      <div className={`roster-grid ${deleteMode?'deleting':''}`}>
        {names.map((n,i)=><div key={n} className="roster-card">
          <button className="roster-edit" aria-label={`Edit ${n}`} onClick={()=>!deleteMode && edit(n)} disabled={deleteMode}>
            <div className="roster-top"><small>#{String(i+1).padStart(2,'0')}</small>{!deleteMode && <Pencil size={14}/>}</div>
            <Avatar name={n} avatars={avatars} className="roster-avatar"/><strong>{n}</strong>
          </button>
          {deleteMode && <button className="remove-roster" aria-label={`Remove ${n} from this game`} onClick={()=>setNames(names.filter(x=>x!==n))}><X size={17}/></button>}
        </div>)}
        {!deleteMode && <div className="roster-add-slot"><button className="roster-add" aria-label="Add player" onClick={openAdd}><span className="add-top"><Plus size={12}/></span><UserPlus size={29}/><strong>ADD PLAYER</strong></button><button type="button" className="random-player-button" onClick={addRandomPlayer}><Shuffle size={15} aria-hidden="true"/> RANDOM</button></div>}
      </div>
      <div className="setup-bottom"><button className="setup-primary" disabled={names.length<4} onClick={onContinue}>▶ &nbsp; CHOOSE ROLES</button></div>
    </>}
    {view==='form' && <div className="player-form">
      <button type="button" className="avatar-preview" aria-label="Choose or change game avatar" onClick={()=>setSheet('source')}>
        {avatar ? <img src={avatar} alt="Selected avatar"/> : <User size={44} fill="currentColor" strokeWidth={1}/>}
        <span className="camera-badge"><Camera size={18}/></span>
      </button><p className="avatar-caption">CHOOSE PHOTO OR AVATAR</p>
      <label className="name-field"><User size={21}/><span className="visually-hidden">PLAYER NAME</span><input maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Name" autoComplete="off"/></label>
      <label className="remember"><span>Add to player library<small>Save for future games</small></span><SettingCheckbox checked={remember} onChange={e=>setRemember(e.target.checked)}/></label>
      {error && <p className="warning" role="alert">{error}</p>}
      <button className="setup-primary form-submit" onClick={submit}><UserPlus size={20}/>{editing?'SAVE PLAYER':'ADD PLAYER'}</button>
      {avatar && <button className="remove-image" onClick={()=>setAvatar('')}>REMOVE IMAGE</button>}
    </div>}
    {(view==='library'||view==='rankings') && <>
      <div className="library-tabs"><button className={view==='library'?'active':''} onClick={()=>setView('library')}><Users size={18}/> PLAYERS</button><button className={view==='rankings'?'active':''} onClick={()=>setView('rankings')}><BarChart3 size={18}/> ALL-TIME RANKINGS</button></div>
      {notice && <p className="avatar-notice" role="status">{notice}</p>}{error && <p className="warning" role="alert">{error}</p>}
      {view==='library' && <><p className="muted">Tap a saved player to add or remove them from this game.</p>{library.length===0 && <div className="setup-empty"><Users size={34}/><h3>PLAYER LIBRARY EMPTY</h3><p>Save players to use them in future games.</p></div>}<div className="library-list">{library.map(p=><div className="library-row" key={key(p.name)}><button className="library-select" aria-pressed={names.some(n=>key(n)===key(p.name))} onClick={()=>toggleLibrary(p)}><Avatar name={p.name} avatars={{[key(p.name)]:p.avatar}}/><strong>{p.name}</strong><span>{names.some(n=>key(n)===key(p.name))?'✓':'+'}</span></button><button className="remove" aria-label={`Delete ${p.name} from library`} onClick={()=>{if(window.confirm(`Remove ${p.name} from the saved library?`)) persistBoth(library.filter(x=>key(x.name)!==key(p.name)),avatars);}}>✕</button></div>)}</div></>}
      {view==='rankings' && <>{readRankings().length===0 ? <div className="setup-empty"><div className="empty-icon"><BarChart3 size={36}/></div><h3>ALL-TIME RANKINGS EMPTY</h3><p>Completed game results will accumulate here as an all-time leaderboard.</p></div> : <><p className="muted">Completed games on this device, grouped by player name.</p><div className="ranking-list">{readRankings().map((r,i)=><div className="ranking-row" key={key(r.name)}><span className="number">#{i+1}</span><strong>{r.name}</strong><span>{r.wins} wins · {r.played} played</span></div>)}</div></>}</>}
      {shareStatus && <p className="avatar-notice" role="status">{shareStatus}</p>}<div className="setup-bottom">{view==='rankings' ? <button className="setup-primary" onClick={()=>{void shareRankings();}}><Share2 size={19}/> SHARE</button> : <button className="setup-primary" onClick={()=>setView('roster')}>DONE</button>}</div>
    </>}
    {sheet && <dialog className={`avatar-sheet ${sheet==='avatars'?'avatar-picker':''}`} ref={dialog} aria-label={sheet==='source'?'Choose photo or avatar':'Game avatars'} onCancel={e=>{e.preventDefault();closeSheet();}} onClick={e=>{if(e.target===e.currentTarget)closeSheet();}}>
      {sheet==='source' ? <div className="sheet-inner" key="source"><div className="sheet-handle"/><button className="sheet-option" onClick={()=>setSheet('avatars')}><User size={22}/> Game avatars <ChevronRight size={18}/></button><label className="sheet-option" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.querySelector('input')?.click();}}}><ImageIcon size={22}/> Gallery <ChevronRight size={18}/><input type="file" accept="image/*" onChange={e=>{void selectPhoto(e);closeSheet();}}/></label><label className="sheet-option" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.querySelector('input')?.click();}}}><Camera size={22}/> Camera <ChevronRight size={18}/><input type="file" accept="image/*" capture="user" onChange={e=>{void selectPhoto(e);closeSheet();}}/></label><button className="sheet-cancel" onClick={closeSheet}>CANCEL</button></div> : <div className="sheet-inner picker-inner" key="avatars"><div className="sheet-handle"/><div className="picker-heading"><button className="setup-icon-button" aria-label="Back to photo options" onClick={()=>setSheet('source')}><ArrowLeft size={21}/></button><h2>GAME AVATARS</h2><button className="sheet-close" aria-label="Close avatar selection" onClick={closeSheet}><X size={22}/></button></div><p className="muted">An avatar already in use transfers to you; the previous player receives a random unused avatar.</p><div className="avatar-grid">{avatarFiles.map((src,i)=><button key={src} aria-label={`Choose avatar ${i+1}`} aria-pressed={avatar===src} className={avatar===src?'chosen':''} onClick={()=>{setAvatar(src);closeSheet();}}><img src={src} alt=""/><span className="avatar-number" aria-hidden="true">{i+1}</span>{names.find(n=>key(n)!==key(editing || name) && avatars[key(n)]===src) && <span className="avatar-owner">IN USE</span>}</button>)}</div></div>}
    </dialog>}
  </div></div>;
}
