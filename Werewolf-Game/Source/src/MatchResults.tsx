import { useState } from 'react';
import { ArrowLeft, BarChart3, Gavel, Home, PawPrint, ShieldQuestion, Skull, Trophy, Users } from 'lucide-react';
import { Avatar, type AvatarMap } from './PlayerSetup';
import HoldButton from './HoldButton';
import { roles, type Player, type Role, type WinningSide } from './werewolf-engine';

type PortraitProps = { player: Player; avatars: AvatarMap; compact?: boolean };
function ResultPortrait({player, avatars, compact = false}: PortraitProps) {
  const dead = !player.alive && !player.escaped;
  return <div className={`outcome-portrait ${dead ? 'is-dead' : ''} ${compact ? 'is-compact' : ''}`}>
    <Avatar name={player.name} avatars={avatars} className="outcome-avatar"/>
    {dead && <span className="outcome-death-mark" aria-hidden="true"><Skull strokeWidth={1.8}/></span>}
    {!compact && dead && <span className="outcome-dead-label"><Skull size={11} aria-hidden="true"/> DEAD</span>}
  </div>;
}

export function VoteResult({victim, votes, revealRole, avatars, picture, announcement, onContinue}: {
  victim?: Player; votes: number; revealRole: boolean; avatars: AvatarMap;
  picture: (role: Role) => string; announcement: string; onContinue: () => void;
}) {
  return <section className={`vote-verdict ${victim ? 'has-victim' : 'no-victim'}`} aria-labelledby="verdict-title">
    <div className="verdict-frame"><div className="verdict-inner">
      <div className="verdict-icon" aria-hidden="true">{victim ? <Gavel/> : <ShieldQuestion/>}</div>
      <h2 id="verdict-title">{victim ? 'THE VILLAGE HAS DECIDED!' : 'THE VILLAGE IS DIVIDED'}</h2>
      {victim ? <>
        <p className="visually-hidden">{announcement}</p>
        <div className="verdict-player-frame"><div className="verdict-player">
          <div className="verdict-portraits">
            <ResultPortrait player={victim} avatars={avatars}/>
            {revealRole && <div className={`verdict-role team-${roles[victim.role].team}`}><img src={picture(victim.role)} alt={`${roles[victim.role].name} role artwork`}/></div>}
          </div>
          <h3>{victim.name}{revealRole && <><span className="verdict-name-divider"> — </span>{roles[victim.role].name}</>}</h3>
          <span className="outcome-badge badge-lost">WAS VOTED OUT</span>
          <p className="verdict-vote-count">Received <strong>{votes}</strong> {votes === 1 ? 'vote' : 'votes'}</p>
        </div></div>
      </> : <div className="verdict-empty"><Users size={44} aria-hidden="true"/><h3>NO ONE WAS VOTED OUT</h3><p>{announcement}</p><span className="outcome-badge badge-neutral">THE NIGHT CONTINUES</span></div>}
      <HoldButton onComplete={onContinue}/>
    </div></div>
  </section>;
}

export function MatchResults({players, avatars, side, title, winnerIds, madmen, corrupted, round, rankingError, onMenu}: {
  players: Player[]; avatars: AvatarMap; side: WinningSide | null; title: string; winnerIds: number[];
  madmen: number[]; corrupted: number[]; round: number; rankingError: boolean; onMenu: () => void;
}) {
  const [showRankings, setShowRankings] = useState(false);
  const winners = new Set(winnerIds);
  const ordered = showRankings ? [...players].sort((a,b) => Number(winners.has(b.id)) - Number(winners.has(a.id)) || a.id-b.id) : players;
  const Icon = side === 'wolf' || side === 'whitewolf' || side === 'wolf-friends' ? PawPrint : side === 'draw' ? Users : Trophy;
  return <section className={`match-results outcome-${side || 'draw'}`} aria-labelledby="match-result-title">
    <div className="match-winner-frame"><div className="match-winner-banner"><span className="match-winner-icon" aria-hidden="true"><Icon/></span><h2 id="match-result-title">{title}</h2></div></div>
    <p className="match-result-meta">GAME OVER <span>·</span> NIGHT {round} <span>·</span> {players.length} PLAYERS</p>
    {side==='wolf-friends' && <p className="match-result-note">Neither remaining player can attack the other. Both teams win.</p>}
    {players.some(p=>p.alive && p.role==='survivor' && winners.has(p.id)) && <p className="match-result-note">Surviving {players.filter(p=>p.alive && p.role==='survivor' && winners.has(p.id)).map(p=>p.name).join(', ')} also win.</p>}
    {rankingError && <p className="warning" role="alert">Could not save local rankings. Storage may be full or disabled.</p>}
    {showRankings && <div className="night-ranking-heading"><h3>NIGHT RANKINGS</h3><p>Winners first · Results from this game</p></div>}
    <div className="match-player-list" aria-label={showRankings ? 'Night rankings' : 'Final player results'}>
      {ordered.map(p => {
        const won = winners.has(p.id);
        const state = p.escaped ? 'Escaped victorious' : p.alive ? 'Survived' : 'Eliminated';
        return <article key={p.id} className={`match-player-frame ${won ? 'player-won' : ''}`} aria-label={`${p.name}: ${won ? 'won' : 'lost'}`}>
          <div className="result-row match-player-card">
            <ResultPortrait player={p} avatars={avatars} compact/>
            <div className="match-player-info"><strong>{p.name}</strong><span className="match-player-role">{roles[p.role].name}{madmen.includes(p.id) ? (corrupted.includes(p.id) ? ' · Madman' : ' · Former Madman') : ''}</span><span className="match-player-state">{state}</span></div>
            <span className={`outcome-badge ${won ? 'badge-won' : 'badge-lost'}`}>{won ? 'WON' : 'LOST'}</span>
          </div>
        </article>;
      })}
    </div>
    <div className="match-result-actions">
      <button className="match-rankings-button" aria-pressed={showRankings} onClick={()=>setShowRankings(value=>!value)}>{showRankings ? <ArrowLeft size={20} aria-hidden="true"/> : <BarChart3 size={20} aria-hidden="true"/>}{showRankings ? 'PLAYER RESULTS' : 'NIGHT RANKINGS'}</button>
      <button className="match-menu-button" aria-label="BACK TO MENU" onClick={onMenu}><Home size={20} aria-hidden="true"/> RETURN TO MAIN MENU</button>
    </div>
  </section>;
}
