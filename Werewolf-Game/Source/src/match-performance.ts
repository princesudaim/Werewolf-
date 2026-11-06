import {appearsWerewolf,teamOfPlayer,type Player,type Role,type Visit,type NightTrace} from './werewolf-engine.ts';

export const PERFORMANCE_POINTS={vote:2,save:5,attack:1,kill:2,check:2,block:3,mute:2,revive:4,convert:3,hypnotize:3,inherit:3,prediction:4,mark:1,shield:3,health:2} as const;
/** Final-state adjustment only: not a bad decision or a replayable ledger event. */
export const DEATH_PENALTY=2;
export type PerformanceKind=keyof typeof PERFORMANCE_POINTS;
export type PerformanceEvent={key:string;actor:number;kind:PerformanceKind;good:boolean};
export type MatchPerformance={events:PerformanceEvent[];partial:boolean;recoveryEnabled:boolean};
export const freshPerformance=(recoveryEnabled=false,partial=false):MatchPerformance=>({events:[],partial,recoveryEnabled});

/** Idempotent facts only: no text, hidden role history or messages in the ledger. */
export function addPerformance(log:MatchPerformance,key:string,actor:number,kind:PerformanceKind,good=true):void {
 if(log.events.some(e=>e.key===key))return;
 if(log.events.length>=10000){log.partial=true;return;}
 log.events.push({key,actor,kind,good});
}
export function validatePerformance(value:unknown,ids:ReadonlySet<unknown>):value is MatchPerformance {
 if(!value || typeof value!=='object' || Array.isArray(value))return false;
 const v=value as MatchPerformance;
 return Object.keys(v).sort().join(',')==='events,partial,recoveryEnabled' && typeof v.partial==='boolean' && typeof v.recoveryEnabled==='boolean' && Array.isArray(v.events) && v.events.length<=10000 && new Set(v.events.map(e=>e?.key)).size===v.events.length && v.events.every(e=>!!e && typeof e==='object' && Object.keys(e).sort().join(',')==='actor,good,key,kind' && typeof e.key==='string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(e.key) && ids.has(e.actor) && Object.prototype.hasOwnProperty.call(PERFORMANCE_POINTS,e.kind) && typeof e.good==='boolean');
}
const dangerous:Role[]=['serialkiller','raven','whitewolf','mindflayer'];
/** Goals at the time of the action, not the final role after infection/theft. */
export function choiceValue(actor:Player,target:Player,friends:Record<number,number>):'ally'|'opponent'|'uncertain' {
 if(actor.id===target.id || friends[actor.id]===target.id)return 'ally';
 const a=teamOfPlayer(actor,friends),t=teamOfPlayer(target,friends);
 if(a==='friends')return 'opponent';
 if(a==='village')return t==='village'?'ally':t==='wolf' || t==='friends' || dangerous.includes(target.role)?'opponent':'uncertain';
 if(a==='wolf')return t==='wolf'?'ally':'opponent';
 if(dangerous.includes(actor.role))return 'opponent';
 return 'uncertain';
}
export function scoreVote(log:MatchPerformance,round:number,actor:Player,target:Player|null,friends:Record<number,number>):void {
 if(!target)return; // Passing is not a wrong guess. Mayor weighting does not multiply credit.
 const value=choiceValue(actor,target,friends);
 if(value==='uncertain' && teamOfPlayer(actor,friends)==='neutral')return;
 if(target.role==='jester' && friends[target.id]===undefined){addPerformance(log,`vote:${round}:${actor.id}`,actor.id,'vote',false);return;}
 if(value!=='uncertain')addPerformance(log,`vote:${round}:${actor.id}`,actor.id,'vote',value==='opponent');
}
export type NightPerformanceInput={round:number;before:Player[];after:Player[];combatDeaths?:readonly number[];visits:Visit[];blocked:ReadonlySet<number>;corrupted:readonly number[];friends:Record<number,number>;trace:NightTrace;doctors:Record<number,number>;police:Record<number,number>;mutes?:Visit[];revivals:Visit[];infections:Visit[];hypnosis:Visit[];parasites:Visit[];marks:Visit[];mayors:number[];stolen:Record<number,Role>};
export function scoreNight(log:MatchPerformance,input:NightPerformanceInput):void {
 const {round,before,after,visits,blocked,corrupted,friends,trace}=input;
 const find=(id:number)=>before.find(p=>p.id===id);
 const effective=(id:number)=>!blocked.has(id) && !corrupted.includes(id);
 const alive=(id:number)=>after.some(p=>p.id===id && p.alive);
 const event=(kind:PerformanceKind,actor:number,target:number,good=true,unique=false)=>addPerformance(log,`${kind}:${unique?'once':round}:${actor}:${target}`,actor,kind,good);
 for(const {actor,target} of trace.attacks){
  const a=find(actor),t=find(target);if(!a || !t || !effective(actor))continue;
  const value=choiceValue(a,t,friends);
  const correct=value==='opponent' && (a.role!=='templar' || appearsWerewolf(t.role));
  if(value!=='uncertain')event('attack',actor,target,correct);
  if(correct && trace.landed.some(v=>v.actor===actor && v.target===target) && (!input.combatDeaths || input.combatDeaths.includes(target)) && t.alive && !alive(target) && !after.find(p=>p.id===target)?.escaped)event('kill',actor,target);
 }
 for(const [actorKey,target] of Object.entries(input.doctors)){
  const actor=Number(actorKey),a=find(actor),t=find(target);if(!a || !t || !effective(actor))continue;
  const value=choiceValue(a,t,friends);
  if(trace.doctorSaved.includes(target) && alive(target) && value!=='uncertain')event('save',actor,target,value==='ally');
  else if(t.role==='sickman' && alive(target) && value==='ally')event('health',actor,target);
 }
 for(const {actor,target} of trace.guarded){
  const a=find(actor),t=find(target);if(a && t && alive(target) && effective(actor) && choiceValue(a,t,friends)!=='uncertain')event('save',actor,target,choiceValue(a,t,friends)==='ally');
 }
 for(const actor of input.mayors)if(effective(actor))for(const target of new Set(trace.assemblySaved)){
  const a=find(actor),t=find(target);if(a && t && alive(target) && choiceValue(a,t,friends)!=='uncertain')event('save',actor,target,choiceValue(a,t,friends)==='ally');
 }
 for(const actor of new Set(trace.shielded))if(find(actor)?.role==='survivor' && alive(actor) && effective(actor))event('shield',actor,actor);
 for(const [actorKey,target] of Object.entries(input.police)){
  const actor=Number(actorKey),a=find(actor),t=find(target);
  if(!a || !t || !effective(actor) || !blocked.has(target) || !visits.some(v=>v.actor===target) || corrupted.includes(target))continue;
  const value=choiceValue(a,t,friends);if(value!=='uncertain')event('block',actor,target,value==='opponent');
 }
 for(const {actor,target} of input.mutes || []){
  const a=find(actor),t=find(target);
  if(a?.role==='muted' && t && effective(actor) && alive(target)){const value=choiceValue(a,t,friends);if(value!=='uncertain')event('mute',actor,target,value==='opponent');}
 }
 for(const {actor,target} of input.revivals){
  const a=find(actor),t=find(target);if(a && t && effective(actor) && !t.alive && alive(target)){
   const value=choiceValue(a,t,friends);if(value!=='uncertain')event('revive',actor,target,value==='ally');
  }
 }
 for(const {actor,target} of input.infections){
  const a=find(actor),t=find(target),now=after.find(p=>p.id===target);
  if(a && t && now && effective(actor) && now.alive && ((t.role!=='werewolf' && now.role==='werewolf') || (!t.joinedPack && now.joinedPack)) && choiceValue(a,t,friends)!=='ally')event('convert',actor,target);
 }
 for(const {actor,target} of input.hypnosis){
  const a=find(actor),t=find(target);if(a && t && effective(actor) && alive(target) && choiceValue(a,t,friends)==='opponent')event('hypnotize',actor,target,true,true);
 }
 for(const {actor,target} of [...input.parasites,...input.marks]){
  const a=find(actor),t=find(target);
  if(a && t && effective(actor) && alive(target) && choiceValue(a,t,friends)==='opponent' && (a.role!=='mindflayer' || friends[actor]===undefined))event('mark',actor,target,true,true);
 }
 for(const actor of new Set(visits.map(v=>v.actor))){
  const a=find(actor);if(!a || !effective(actor) || !['seer','psychic','chef'].includes(a.role))continue;
  const targets=[...new Set(visits.filter(v=>v.actor===actor).map(v=>v.target))].sort((a,b)=>a-b);
  if(a.role==='chef'){
   if(targets.length===2)addPerformance(log,`check:pair:${actor}:${targets.join('-')}`,actor,'check');
  }else for(const target of targets)event('check',actor,target,true,true);
 }
 scoreInheritance(log,round,'night',input.stolen);
}
export function scoreInheritance(log:MatchPerformance,round:number,phase:string,stolen:Record<number,Role>):void {
 for(const actor of Object.keys(stolen).map(Number))addPerformance(log,`inherit:${round}:${phase}:${actor}`,actor,'inherit');
}
export function scorePredictions(log:MatchPerformance,round:number,before:Record<number,number>,after:Record<number,number>,wrong:readonly number[]=[]):void {
 for(const [id,n] of Object.entries(after))if(n>(before[Number(id)]||0))addPerformance(log,`prediction:${round}:${id}`,Number(id),'prediction');
 for(const actor of wrong)addPerformance(log,`prediction:${round}:${actor}`,actor,'prediction',false);
}
const labels:Record<PerformanceKind,[string,string]>={vote:['correct vote','correct votes'],save:['save','saves'],attack:['good attack choice','good attack choices'],kill:['successful attack','successful attacks'],check:['useful check','useful checks'],block:['useful block','useful blocks'],mute:['useful silence','useful silences'],revive:['good revival','good revivals'],convert:['conversion','conversions'],hypnotize:['disruption','disruptions'],inherit:['role stolen','roles stolen'],prediction:['correct prediction','correct predictions'],mark:['goal step','goal steps'],shield:['attack survived','attacks survived'],health:['health boost','health boosts']};
export function matchStandings(players:Player[],winnerIds:readonly number[],log:MatchPerformance){
 const winners=new Set(winnerIds);
 const rows=players.map(player=>{
  const events=log.events.filter(e=>e.actor===player.id),good=events.filter(e=>e.good && e.kind!=='kill').length,bad=events.filter(e=>!e.good).length;
  const won=winners.has(player.id),deathPenalty=!player.alive&&!player.escaped?DEATH_PENALTY:0;
  const score=events.reduce((n,e)=>n+(e.good?PERFORMANCE_POINTS[e.kind]:-2),0)+(won?2:0)-deathPenalty;
  const counts=Object.entries(labels).map(([kind,label])=>{const n=events.filter(e=>e.good && e.kind===kind).length;return{kind,n,text:`${n} ${label[n===1?0:1]}`};}).filter(c=>c.n>0 && !(c.kind==='attack' && events.some(e=>e.good && e.kind==='kill'))).sort((a,b)=>PERFORMANCE_POINTS[b.kind as PerformanceKind]-PERFORMANCE_POINTS[a.kind as PerformanceKind]);
  const reasons=counts.slice(0,bad?1:2).map(c=>c.text);
  if(bad)reasons.push(`${bad} ${bad===1?'mistake':'mistakes'}`);
  const summary=reasons.join(' · ') || (won?'Team win · No scored decisions':'No scored decisions');
  const reason=summary+(deathPenalty?` · Death −${deathPenalty} pts`:'');
  return{player,won,score,good,bad,reason,deathPenalty,tier:won?(player.alive || player.escaped?0:1):(player.alive?2:3),mvp:false};
 });
 const compare=(a:typeof rows[number],b:typeof rows[number])=>b.score-a.score || (b.good/(b.good+b.bad||1))-(a.good/(a.good+a.bad||1)) || Number(b.won)-Number(a.won) || b.good-a.good || a.player.id-b.player.id;
 const best=[...rows].sort(compare)[0];if(best)best.mvp=true;
 return rows.sort((a,b)=>Number(b.mvp)-Number(a.mvp) || a.tier-b.tier || compare(a,b));
}
