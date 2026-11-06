import { Fragment } from 'react';
import {freshPerformance,matchStandings,type MatchPerformance} from './match-performance';
import './match-ranking.css';
import { Gavel, Home, RotateCcw, ShieldQuestion, Skull, Trophy, Users } from 'lucide-react';
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
        <p className="visually-hidden">{victim.name} was voted out{revealRole ? ` — ${roles[victim.role].name}` : '' }.</p>
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

export function MatchResults({players,avatars,side,title,winnerIds,madmen,corrupted,round,rankingError,onMenu,performance=freshPerformance(false,true),onRestart,restartDisabled=false}: {
  players:Player[];avatars:AvatarMap;side:WinningSide|null;title:string;winnerIds:number[];
  madmen:number[];corrupted:number[];round:number;rankingError:boolean;onMenu:()=>void;
  performance?:MatchPerformance;onRestart?:()=>void;restartDisabled?:boolean;
}) {
  const standings=matchStandings(players,winnerIds,performance);
  const tiers=['WINNERS · ALIVE','WINNERS · DEAD','LOST · ALIVE','LOST · DEAD'];
  return <section className={`match-results ranked-results outcome-${side || 'draw'}`} aria-labelledby="match-result-title">
    <div className="ranking-title"><h2 id="match-result-title">{title}</h2><p>MATCH RANKINGS · NIGHT {round}</p></div>
    {rankingError && <p className="warning" role="alert">Could not save local rankings. Storage may be full or disabled. Open Settings to retry before starting again.</p>}
    {performance.partial && <p className="ranking-history-note">Earlier choices were not recorded in this saved game. MVP uses the available record.</p>}
    <div className="match-player-list" role="group" aria-label="Match rankings">
      {standings.map((row,index)=>{
        const p=row.player,previous=standings[index-1];
        return <Fragment key={p.id}>
          {!row.mvp && (!previous || previous.mvp || row.tier!==previous.tier) && <h3 className="ranking-tier">{tiers[row.tier]}</h3>}
          <article className={`match-player-frame ${row.won?'player-won':''} ${row.mvp?'is-mvp':''}`} aria-label={`${p.name}: ${row.won?'won':'lost'}`}>
            <div className="result-row match-player-card">
              <span className="ranking-position" aria-label={`Rank ${index+1}`}>#{index+1}</span>
              <ResultPortrait player={p} avatars={avatars} compact/>
              <div className="match-player-info">
                {row.mvp && <span className="mvp-label"><Trophy size={16} aria-hidden="true"/> MVP</span>}
                <strong>{p.name}</strong>
                <div className="match-player-meta">
                  <span className="match-player-role">{roles[p.role].name}{madmen.includes(p.id)?(corrupted.includes(p.id)?' · Madman':' · Former Madman'):''}</span>
                  <span className="match-player-state">{p.escaped?'ESCAPED':p.alive?'ALIVE':'DEAD'}</span>
                </div>
              </div>
              <div className="match-player-score"><span className={`outcome-badge ${row.won?'badge-won':'badge-lost'}`}>{row.won?'WON':'LOST'}</span><span>{row.score} pts</span></div>
              <span className="performance-reason">{row.reason}</span>
            </div>
          </article>
        </Fragment>;
      })}
    </div>
    <p className="ranking-method">MVP is based on recorded actions and votes. Dead players lose 2 points.</p>
    <div className="match-result-actions">
      <button className="match-rankings-button" disabled={restartDisabled || rankingError || !onRestart} onClick={onRestart}><RotateCcw size={20} aria-hidden="true"/> START AGAIN</button>
      <button className="match-menu-button" aria-label="BACK TO MENU" onClick={onMenu}><Home size={20} aria-hidden="true"/> RETURN TO MAIN MENU</button>
    </div>
  </section>;
}
