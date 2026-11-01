import { roles, type Player, type WinningSide } from './werewolf-engine.ts';
import { playerKey } from './avatar-assignment.ts';

export type Ranking = { name: string; played: number; wins: number };
export const RANKINGS_KEY = 'werewolf.rankings.v1';

/** Reconstructed standings, stored locally by player name rather than a server account. */
export function winningPlayers(players: Player[], side: WinningSide, lovers: Record<number,number>, jesterWinner: string, mindWinner: string): number[] {
  const survivingLover = (side === 'friends' || side === 'wolf-friends') ? players.find(p=>p.alive && lovers[p.id] !== undefined) : undefined;
  return players.filter(p=>{
    if (p.escaped) return true;
    if (p.alive && p.role === 'survivor' && lovers[p.id] === undefined) return true;
    if (side === 'wolf-friends') return (lovers[p.id]===undefined && roles[p.role].team==='wolf') || (!!survivingLover && (p.id===survivingLover.id || p.id===lovers[survivingLover.id]));
    if (side === 'friends') return !!survivingLover && (p.id===survivingLover.id || p.id===lovers[survivingLover.id]);
    if (lovers[p.id] !== undefined) return false;
    if (side === 'village' || side === 'wolf') return roles[p.role].team === side;
    if (side === 'jester') return p.role === 'jester' && p.name === jesterWinner;
    if (side === 'mindflayer') return p.role === 'mindflayer' && p.name === mindWinner;
    if (side === 'serialkiller' || side === 'raven' || side === 'whitewolf') return p.alive && p.role === side;
    return false;
  }).map(p=>p.id);
}

export function updateRankings(previous: Ranking[], players: Player[], winners: number[]): Ranking[] {
  const records = new Map(previous.map(record=>[playerKey(record.name),{...record}]));
  const won = new Set(winners);
  for (const player of players) {
    const key=playerKey(player.name), old=records.get(key);
    records.set(key,{name:player.name,played:(old?.played || 0)+1,wins:(old?.wins || 0)+(won.has(player.id) ? 1 : 0)});
  }
  return [...records.values()].sort((a,b)=>b.wins-a.wins || b.played-a.played || a.name.localeCompare(b.name));
}
export function readRankings(): Ranking[] {
  try {
    const value: unknown=JSON.parse(localStorage.getItem(RANKINGS_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((r): r is Ranking=>!!r && typeof r.name==='string' && Number.isSafeInteger(r.played) && Number.isSafeInteger(r.wins) && r.played>=0 && r.wins>=0 && r.wins<=r.played);
  } catch { return []; }
}
