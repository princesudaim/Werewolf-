import {STATE_FIELDS,REF_FIELDS} from './game-snapshot.ts';
import {freshPerformance} from './match-performance.ts';

/** Every registered match field is reset; only the original setup survives a replay. */
export const REPLAY_SETUP_FIELDS=['names','avatars','counts','randomCounts','settings','players'] as const;
export function freshMatchProgress(recoveryEnabled=false){
 const blank=(kind:string):unknown=>{
  if(kind==='number')return 0;
  if(kind==='string')return '';
  if(kind==='boolean')return false;
  if(kind==='nullableInfo' || kind==='winner')return null;
  if(kind.endsWith('Set'))return new Set();
  if(kind==='performance')return freshPerformance(recoveryEnabled);
  if(['avatars','counts','randomCounts','settings','roleMap','idMap','numberMap','expiryMap','idArrays','stringArrays','infoMap'].includes(kind))return {};
  return [];
 };
 const state:Record<string,unknown>=Object.fromEntries(Object.entries(STATE_FIELDS).filter(([key])=>!(REPLAY_SETUP_FIELDS as readonly string[]).includes(key)).map(([key,kind])=>[key,blank(kind)]));
 state.round=1;state.screen='nightIntro';
 const refs:Record<string,unknown>=Object.fromEntries(Object.entries(REF_FIELDS).map(([key,kind])=>[key,blank(kind)]));
 return{state,refs};
}
