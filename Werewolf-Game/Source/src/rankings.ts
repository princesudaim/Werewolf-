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
    const stored: unknown=JSON.parse(localStorage.getItem(RANKINGS_KEY) || '[]');
    const value=stored && typeof stored==='object' && 'version' in stored && stored.version===1 && 'records' in stored ? stored.records : stored;
    if (!Array.isArray(value)) return [];
    return value.filter((r): r is Ranking=>!!r && typeof r.name==='string' && Number.isSafeInteger(r.played) && Number.isSafeInteger(r.wins) && r.played>=0 && r.wins>=0 && r.wins<=r.played);
  } catch { return []; }
}

export type RankingStore = Pick<Storage,'getItem'|'setItem'>;
/** One atomic value couples public totals with recovery-credit IDs. Legacy arrays still read/write unchanged. */
export function recordRankedMatch(storage:RankingStore,players:Player[],winners:number[],credit?:{id:string;expiresAt:number},now=Date.now()):'recorded'|'already-recorded' {
  const raw=JSON.parse(storage.getItem(RANKINGS_KEY)||'[]') as unknown;
  let list:unknown,credits:Record<string,number>=Object.create(null),envelope=false;
  if(Array.isArray(raw))list=raw;
  else if(raw && typeof raw==='object' && 'version' in raw && raw.version===1 && 'records' in raw && Array.isArray(raw.records) && 'credits' in raw && raw.credits && typeof raw.credits==='object' && !Array.isArray(raw.credits)){
    list=raw.records;envelope=true;
    for(const [id,expiry]of Object.entries(raw.credits)){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || !Number.isSafeInteger(expiry))throw new Error('Invalid ranking credit ledger');if((expiry as number)>now)credits[id]=expiry as number;}
  }else throw new Error('Invalid ranking storage');
  if(credit && credits[credit.id]!==undefined)return'already-recorded';
  const previous=(list as unknown[]).filter((r):r is Ranking=>!!r && typeof r==='object' && 'name' in r && typeof r.name==='string' && 'played' in r && Number.isSafeInteger(r.played) && 'wins' in r && Number.isSafeInteger(r.wins) && (r.played as number)>=0 && (r.wins as number)>=0 && (r.wins as number)<=(r.played as number));
  const next=updateRankings(previous,players,winners);
  if(credit){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(credit.id) || !Number.isSafeInteger(credit.expiresAt) || credit.expiresAt<=now)throw new Error('Expired ranking credit');credits[credit.id]=credit.expiresAt;}
  storage.setItem(RANKINGS_KEY,JSON.stringify(envelope||credit?{version:1,records:next,credits}:next));return'recorded';
}
