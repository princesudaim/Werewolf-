import {roles,defaults} from './werewolf-engine.ts';
import {validatePerformance,freshPerformance} from './match-performance.ts';

export const GAME_RECOVERY_SCHEMA = 'werewolf-match-1';
export const GAME_SCREENS = ['nightIntro','pass','action','privateResult','morning','discussion','vote','voteResult','end'] as const;
export type GameSnapshot = {state:Record<string,unknown>;refs:Record<string,unknown>};
export const STATE_FIELDS = {
  "screen": "screen",
  "names": "strings",
  "avatars": "avatars",
  "counts": "counts",
  "randomCounts": "randomCounts",
  "settings": "settings",
  "players": "players",
  "round": "number",
  "queue": "ids",
  "index": "number",
  "selected": "ids",
  "privateInfo": "nullableInfo",
  "turnInfo": "infos",
  "morningBlocked": "players",
  "morningMuted": "ids",
  "enraged": "boolean",
  "enragedNext": "boolean",
  "parasiteStock": "numberMap",
  "mindWinner": "string",
  "friendDraft": "string",
  "friendSent": "boolean",
  "privateReports": "infoMap",
  "lastDetentions": "idMap",
  "hypnoUsed": "ids",
  "corrupted": "ids",
  "madmen": "ids",
  "failedMayors": "ids",
  "stolenRoles": "roleMap",
  "gamblerCorrect": "numberMap",
  "gamblerDebts": "ids",
  "gamblerReady": "ids",
  "nightEscapes": "strings",
  "converted": "ids",
  "wolfVotes": "ids",
  "saves": "ids",
  "lastSaves": "idMap",
  "currentSaves": "idMap",
  "mayors": "ids",
  "assembly": "boolean",
  "assemblyNames": "strings",
  "assemblyAnnouncementOpen": "boolean",
  "templeUsed": "ids",
  "guards": "visits",
  "bullets": "visits",
  "sheriffUsed": "ids",
  "previousVisits": "visits",
  "watchTargets": "idMap",
  "provocations": "ids",
  "instigatorUses": "numberMap",
  "celebrityFameUsed": "numberMap",
  "fame": "stringArrays",
  "sickLife": "numberMap",
  "lone": "visits",
  "strong": "visits",
  "serials": "visits",
  "visitors": "visits",
  "shields": "ids",
  "shieldUses": "numberMap",
  "shots": "visits",
  "newspapers": "papers",
  "deaths": "players",
  "ballots": "ballots",
  "result": "string",
  "won": "winner",
  "jesterWinner": "string",
  "revivals": "ids",
  "revived": "players",
  "necromancerUsed": "ids",
  "seconds": "number",
  "rankingError": "boolean",
  "passiveWaitUntil": "number",
  "passiveSeconds": "number"
} as const;
export const REF_FIELDS = {
  "performance": "performance",
  "descriptionRoles": "roles",
  "seenPrivateEvents": "stringSet",
  "curses": "idArrays",
  "triggeredCurses": "ids",
  "mindParasites": "idArrays",
  "lovers": "idMap",
  "friendInitiators": "idSet",
  "friendInbox": "inbox",
  "friendOutbox": "outbox",
  "friendMessagesSent": "idSet",
  "fakeDoctorSaves": "idMap",
  "policeTargets": "idMap",
  "muteAttempts": "visits",
  "detectiveAttempts": "visits",
  "provocationAttempts": "provocationVisits",
  "revivalAttempts": "visits",
  "mayorAttempts": "ids",
  "fakeMayorAttempts": "ids",
  "parasiteAttempts": "visits",
  "parasiteRegens": "regens",
  "curseAttempts": "visits",
  "loverAttempts": "visits",
  "newspaperAttempts": "paperAttempts",
  "pendingReports": "infoMap",
  "nextFame": "stringArrays",
  "policeChoices": "idMap",
  "hypnosis": "visits",
  "hypnosisExpiry": "expiryMap",
  "thefts": "visits",
  "infections": "visits",
  "gamblerBets": "visits",
  "wolfBallots": "visits",
  "nightVisits": "visits",
  "discussionDeadline": "number",
  "rankingRecorded": "boolean"
} as const;
const own=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
export const plain=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v) && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null);
const exact=(o:Record<string,unknown>,keys:readonly string[])=>Object.keys(o).length===keys.length && keys.every(k=>own(o,k));
const num=(v:unknown)=>typeof v==='number' && Number.isFinite(v) && Math.abs(v)<=Number.MAX_SAFE_INTEGER;
const integer=(v:unknown)=>num(v) && Number.isInteger(v);
const text=(v:unknown)=>typeof v==='string' && v.length<=1_500_000;
const array=(v:unknown,check:(item:unknown)=>boolean)=>Array.isArray(v) && v.length<=10_000 && v.every(check);
const role=(v:unknown)=>typeof v==='string' && own(roles,v);
const paper=(v:unknown)=>plain(v) && exact(v,['headline','drawing']) && typeof v.headline==='string' && [...v.headline].length<=10 && typeof v.drawing==='string' && (v.drawing==='' || v.drawing.startsWith('data:image/png;base64,')) && text(v.drawing);
const sides=['village','wolf','jester','serialkiller','raven','whitewolf','mindflayer','friends','wolf-friends','draw'];
export function validateGameSnapshot(value:unknown):value is GameSnapshot {
 try{
  if(!plain(value) || !exact(value,['state','refs']) || !plain(value.state) || !plain(value.refs))return false;
  const s=value.state,r=value.refs;
  if(!exact(s,Object.keys(STATE_FIELDS).filter(k=>!['celebrityFameUsed','morningMuted'].includes(k) || own(s,k))) || !exact(r,Object.keys(REF_FIELDS).filter(k=>!['performance','muteAttempts'].includes(k) || own(r,k))) || !Array.isArray(s.players) || s.players.length<4 || s.players.length>100)return false;
  const ids=new Set(s.players.map(p=>plain(p)?p.id:undefined));
  const id=(v:unknown)=>integer(v) && ids.has(v);
  const map=(v:unknown,check:(item:unknown)=>boolean,keyCheck:(k:string)=>boolean=k=>/^(0|[1-9][0-9]*)$/.test(k) && id(Number(k)))=>plain(v) && Object.keys(v).every(k=>keyCheck(k) && check(v[k]));
  const player=(v:unknown)=>plain(v) && Object.keys(v).every(k=>['id','name','role','alive','escaped','joinedPack'].includes(k)) && ['id','name','role','alive'].every(k=>own(v,k)) && id(v.id) && typeof v.name==='string' && v.name.length<=1000 && role(v.role) && typeof v.alive==='boolean' && (!own(v,'escaped') || typeof v.escaped==='boolean') && (!own(v,'joinedPack') || typeof v.joinedPack==='boolean');
  const visit=(v:unknown)=>plain(v) && exact(v,['actor','target']) && id(v.actor) && id(v.target);
  const info=(v:unknown)=>plain(v) && Object.keys(v).every(k=>['title','text','people','shownRole','tone','replyTo','replyName'].includes(k)) && typeof v.title==='string' && text(v.title) && typeof v.text==='string' && text(v.text) && (v.people===undefined || array(v.people,p=>plain(p) && exact(p,['id','name']) && id(p.id) && typeof p.name==='string')) && (v.shownRole===undefined || role(v.shownRole)) && (v.tone===undefined || ['default','gold','red','green'].includes(String(v.tone))) && (v.replyTo===undefined || id(v.replyTo)) && (v.replyName===undefined || typeof v.replyName==='string');
  const letter=(v:unknown,inbox:boolean)=>plain(v) && exact(v,inbox?['from','to','text','deliver','replyAllowed']:['from','to','text','replyAllowed']) && id(v.from) && id(v.to) && typeof v.text==='string' && text(v.text) && typeof v.replyAllowed==='boolean' && (!inbox || integer(v.deliver));
  const settings=(v:unknown)=>plain(v) && Object.keys(v).every(k=>own(defaults,k)) && Object.entries(defaults).every(([k,d])=>{
   // Older active saves retain their existing Thief and unlimited Celebrity rules; do not fill missing options.
   if(!own(v,k) && ['thiefDeathOnly','thiefTargetMode','celebrityFameNights','manualDiscussionControls','hideVotedOutRoles'].includes(k))return true;
   if(k==='celebrityFameNights')return v[k]===1 || v[k]===2;
   if(k==='thiefTargetMode')return typeof v[k]==='string' && ['persistent','replace','cycle'].includes(v[k] as string);
   const x=v[k];if(typeof d==='boolean')return typeof x==='boolean';
   if(typeof d==='number')return num(x) && (x as number)>=0 && (!['intelligenceInterval','loneWolfInterval','strongWolfInterval','serialKillerInterval','thiefAttackInterval'].includes(k) || (x as number)>=1);
   if(k==='disabledRandomRoles')return array(x,role);
   return map(x,n=>num(n) && (n as number)>=0,role);
  });
  const check=(v:unknown,kind:string):boolean=>{
   switch(kind){
    case 'performance':return validatePerformance(v,ids);
    case 'screen':return (GAME_SCREENS as readonly unknown[]).includes(v);
    case 'winner':return v===null || sides.includes(String(v));
    case 'number':return integer(v);
    case 'boolean':return typeof v==='boolean';
    case 'string':return typeof v==='string' && text(v);
    case 'strings':return array(v,x=>typeof x==='string' && text(x));
    case 'roles':return array(v,role);
    case 'players':return array(v,player);
    case 'ids':return array(v,id);
    case 'ballots':return array(v,x=>x===null || id(x));
    case 'visits':return array(v,visit);
    case 'provocationVisits':return array(v,x=>visit(x) || (plain(x) && exact(x,['actor','target']) && id(x.actor) && x.target===-1));
    case 'papers':return array(v,paper);
    case 'nullableInfo':return v===null || info(v);
    case 'infos':return array(v,info);
    case 'infoMap':return map(v,info);
    case 'roleMap':return map(v,role);
    case 'idMap':return map(v,id);
    case 'numberMap':return map(v,integer);
    case 'expiryMap':return map(v,x=>x===null || integer(x));
    case 'idArrays':return map(v,x=>array(x,id));
    case 'stringArrays':return map(v,x=>array(x,y=>typeof y==='string' && text(y)));
    case 'idSet':return v instanceof Set && v.size<=100 && [...v].every(id);
    case 'stringSet':return v instanceof Set && v.size<=10_000 && [...v].every(x=>typeof x==='string' && text(x));
    case 'inbox':return array(v,x=>letter(x,true));
    case 'outbox':return array(v,x=>letter(x,false));
    case 'regens':return array(v,x=>plain(x) && exact(x,['actor','amount']) && id(x.actor) && integer(x.amount));
    case 'paperAttempts':return array(v,x=>plain(x) && exact(x,['actor','paper']) && id(x.actor) && paper(x.paper));
    case 'avatars':return map(v,x=>typeof x==='string' && text(x),()=>true);
    case 'counts':return plain(v) && exact(v,Object.keys(roles)) && Object.values(v).every(x=>integer(x) && (x as number)>=0);
    case 'randomCounts':return plain(v) && exact(v,['village','wolf','neutral']) && Object.values(v).every(x=>integer(x) && (x as number)>=0);
    case 'settings':return settings(v);
    default:return false;
   }
  };
  if(!Object.entries(STATE_FIELDS).every(([k,kind])=>['celebrityFameUsed','morningMuted'].includes(k) && !own(s,k) || check(s[k],kind)) || !Object.entries(REF_FIELDS).every(([k,kind])=>['performance','muteAttempts'].includes(k) && !own(r,k) || check(r[k],kind)))return false;
  if(!own(s,'celebrityFameUsed') && plain(s.settings) && own(s.settings,'celebrityFameNights'))return false;
  if(own(s,'celebrityFameUsed') && !map(s.celebrityFameUsed,x=>integer(x) && (x as number)>=0 && (x as number)<=2))return false;
  if(ids.size!==s.players.length || !(s.players as Record<string,unknown>[]).every((p,i)=>p.id===i))return false;
  if(!integer(s.round) || (s.round as number)<1 || !integer(s.index) || (s.index as number)<0 || (s.seconds as number)<0 || (s.passiveWaitUntil as number)<0 || (s.passiveSeconds as number)<0 || (r.discussionDeadline as number)<0)return false;
  if((r.descriptionRoles as unknown[]).length!==s.players.length)return false;
  if(['pass','action','privateResult','vote'].includes(String(s.screen))){const queue=s.queue as number[];if((s.index as number)>=queue.length || !(s.players as Record<string,unknown>[]).find(p=>p.id===queue[s.index as number])?.alive)return false;}
  if(s.screen==='privateResult' && s.privateInfo===null)return false;
  if(s.screen==='end' && s.won===null)return false;
  return true;
 }catch{return false;}
}
/** Exact existing timer-to-vote transition, used only when recovering an expired discussion. */
export function prepareRecoveredSnapshot(snapshot:GameSnapshot,now:number):GameSnapshot {
 const s={...snapshot.state},r={...snapshot.refs};
 if(!own(s,'morningMuted'))s.morningMuted=[];
 if(!own(r,'muteAttempts'))r.muteAttempts=[];
 if(!own(s,'celebrityFameUsed'))s.celebrityFameUsed={};
 if(!own(r,'performance'))r.performance=freshPerformance(true,true);
 if(s.screen==='discussion' && now>=(r.discussionDeadline as number)){
  const players=s.players as {id:number;alive:boolean}[];
  s.queue=players.filter(p=>p.alive).map(p=>p.id);s.index=0;
  s.ballots=(s.provocations as number[]).filter(id=>players.some(p=>p.id===id&&p.alive)).flatMap(id=>[id,id]);s.screen='vote';
 }
 return{state:s,refs:r};
}
