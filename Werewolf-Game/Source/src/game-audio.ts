import morningDeathCatalog from './morning-death-audio-catalog.json' with {type:'json'};
import gameEndCatalog from './game-end-audio-catalog.json' with {type:'json'};
import votedOutCatalog from './voted-out-audio-catalog.json' with {type:'json'};
import phaseCatalog from './phase-audio-catalog.json' with {type:'json'};
import catalog from './audio-catalog.json' with {type:'json'};
export {catalog as audioCatalog,phaseCatalog as phaseAudioCatalog,votedOutCatalog as votedOutAudioCatalog,gameEndCatalog as gameEndAudioCatalog,morningDeathCatalog as morningDeathAudioCatalog};
export const gameCueCatalog={...catalog.cues,...phaseCatalog.cues,...votedOutCatalog.cues,...gameEndCatalog.cues,...morningDeathCatalog.cues};
export type AudioOutcome='village'|'wolf'|'jester'|'serialkiller'|'raven'|'whitewolf'|'mindflayer'|'friends'|'wolf-friends'|'draw';
export type VotedOutCue=keyof typeof votedOutCatalog.cues;
export type GameEndCue=keyof typeof gameEndCatalog.cues;
export type GameCue=keyof typeof gameCueCatalog|'voted-out'|'game-end'|'morning-death';
export function chooseGameEndCue(previous:GameEndCue|null,random:number):GameEndCue {
  const choices=(Object.keys(gameEndCatalog.cues) as GameEndCue[]).filter(c=>c!==previous);
  const unit=Number.isFinite(random)?Math.max(0,Math.min(1-Number.EPSILON,random)):0;
  return choices[Math.floor(unit*choices.length)]!;
}
export type MorningDeathCue=keyof typeof morningDeathCatalog.cues;
export function chooseMorningDeathCue(previous:MorningDeathCue|null,random:number):MorningDeathCue {
  const choices=(Object.keys(morningDeathCatalog.cues) as MorningDeathCue[]).filter(c=>c!==previous);
  const unit=Number.isFinite(random)?Math.max(0,Math.min(1-Number.EPSILON,random)):0;
  return choices[Math.floor(unit*choices.length)]!;
}
const votedOutCues=Object.keys(votedOutCatalog.cues) as VotedOutCue[];
/** Cosmetic selection only: never read or advance the game's assignment RNG. */
export function chooseVotedOutCue(previous:VotedOutCue|null,random:number):VotedOutCue {
  const candidates=votedOutCues.filter(cue=>cue!==previous);
  const unit=Number.isFinite(random)?Math.max(0,Math.min(1-Number.EPSILON,random)):0;
  return candidates[Math.floor(unit*candidates.length)]!;
}
let audioEntropy=(Date.now()>>>0)||0x9e3779b9;
export function audioRandom():number {
  if(globalThis.crypto?.getRandomValues)return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]!/4294967296;
  // Independent cosmetic fallback: never consume Math.random used by assignment.
  audioEntropy^=audioEntropy<<13;audioEntropy^=audioEntropy>>>17;audioEntropy^=audioEntropy<<5;
  return (audioEntropy>>>0)/4294967296;
}
/** Only public scene facts. Never pass role, action, vote, message or private result data. */
export type AudioScene={key:string;screen:string;side:AudioOutcome|null;hasDeaths:boolean;hasVictim:boolean;hasMvp:boolean;seconds:number};
/** Background audio was removed; retained as a compatibility guard for callers/tests. */
export function musicForScene(_screen:string,_side:AudioOutcome|null):null {return null;}
export function transitionCues(previous:AudioScene|null,next:AudioScene):GameCue[] {
  if(!previous || previous.key===next.key || previous.screen==='recovery' || next.screen==='recovery')return [];
  if(next.screen==='end')return ['morning','voteResult'].includes(previous.screen)?['game-end']:[];
  if(previous.screen==='nightIntro'&&next.screen==='pass')return ['night-start']; // Explicit CONTINUE starts each night sound.
  if(next.screen==='nightIntro')return [];
  if(next.screen==='pass')return []; // Private hand-offs have no scene sound.
  if(next.screen==='action'&&previous.screen==='pass')return [];
  if(next.screen==='announcement')return ['confirm'];
  if(next.screen==='morning')return next.hasDeaths&&previous.screen!=='morning'?['morning-death']:[]; // Once per visible report, never per victim.
  if(next.screen==='discussion')return ['meeting-start']; // Discussion begins, not the Mayor popup.
  if(next.screen==='vote'&&previous.screen==='discussion')return ['vote-open'];
  if(next.screen==='voteResult')return [next.hasVictim?'voted-out':'divided'];
  return [];
}
export function publicInteractionCue(label:string):GameCue {
  if(/^Add /.test(label))return 'add';
  if(/^Remove /.test(label))return 'remove';
  if(/random|shuffle/i.test(label))return 'randomize';
  if(/back|menu|rules|help|settings|close|done/i.test(label))return 'navigate';
  return 'select';
}
