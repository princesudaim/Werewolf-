/** Explicit-call storage foundation. Not connected to the game until full-state/privacy integration passes. */
export const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_RECOVERY_CHARS = 2_000_000;
const FORMAT = 1;
const MAX_DEPTH = 48;
const MAX_NODES = 50_000;
export type RecoveryStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type Checkpoint<T> = {
  format: 1; schema: string; matchId: string; revision: number;
  createdAt: number; savedAt: number; expiresAt: number; payload: T;
};
export type Inspection<T> = {status:'ready'; checkpoint:Checkpoint<T>} | {status:'none'|'incomplete'|'invalid'|'incompatible'|'expired'|'clock-mismatch'|'unavailable'};
export type WriteResult = {ok:true; savedAt:number; expiresAt:number} | {ok:false; reason:'invalid'|'expired'|'storage'; olderCheckpointMayStillBeUsable:boolean};
type Packed = {t:'u'|'0'|'m'} | {t:'s';v:string} | {t:'n';v:number} | {t:'b';v:boolean} | {t:'a'|'e';v:Packed[]} | {t:'o'|'p';v:[string,Packed][]};
class InvalidRecovery extends Error {}
function invalid():never {throw new InvalidRecovery('Invalid recovery data');}
const own = (value:object,key:PropertyKey) => Object.prototype.hasOwnProperty.call(value,key);
const record = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value) && (Object.getPrototypeOf(value)===Object.prototype || Object.getPrototypeOf(value)===null);
const safeInteger = (n:unknown):n is number => Number.isSafeInteger(n) && (n as number)>=0;
function encode(value:unknown):Packed {
  let nodes=0;const ancestors=new Set<object>();
  function visit(v:unknown,depth:number):Packed {
    if(++nodes>MAX_NODES || depth>MAX_DEPTH)invalid();
    if(v===undefined)return{t:'u'};if(v===null)return{t:'0'};
    if(typeof v==='string')return{t:'s',v};if(typeof v==='boolean')return{t:'b',v};
    if(typeof v==='number'){if(!Number.isFinite(v))invalid();return Object.is(v,-0)?{t:'m'}:{t:'n',v};}
    if(typeof v!=='object' || ancestors.has(v))invalid();ancestors.add(v);
    let result:Packed;
    if(Array.isArray(v)){
      if(Object.getPrototypeOf(v)!==Array.prototype)invalid();
      for(const key of Reflect.ownKeys(v)){if(key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key)!;if(typeof key!=='string' || !/^(0|[1-9][0-9]*)$/.test(key) || !('value' in d) || !d.enumerable)invalid();}
      result={t:'a',v:Array.from(v,item=>visit(item,depth+1))};
    }
    else if(v instanceof Set){if(Object.getPrototypeOf(v)!==Set.prototype || Reflect.ownKeys(v).length)invalid();result={t:'e',v:[...v].map(item=>visit(item,depth+1))};}
    else {
      if(!record(v))invalid();const entries:[string,Packed][]=[];
      for(const key of Reflect.ownKeys(v)){
        if(typeof key!=='string')invalid();
        const descriptor=Object.getOwnPropertyDescriptor(v,key)!;
        if(!('value' in descriptor) || !descriptor.enumerable)invalid();
        entries.push([key,visit(descriptor.value,depth+1)]);
      }
      result={t:Object.getPrototypeOf(v)===null?'p':'o',v:entries};
    }
    ancestors.delete(v);return result;
  }
  return visit(value,0);
}
function decode(value:unknown):unknown {
  let nodes=0;
  function visit(v:unknown,depth:number):unknown {
    if(++nodes>MAX_NODES || depth>MAX_DEPTH || !record(v))invalid();
    const keys=Object.keys(v);if(keys.some(k=>k!=='t' && k!=='v'))invalid();
    if(v.t==='u' || v.t==='0' || v.t==='m'){if(keys.length!==1)invalid();return v.t==='u'?undefined:v.t==='m'?-0:null;}
    if(keys.length!==2 || !own(v,'v'))invalid();
    switch(v.t){
      case 's':if(typeof v.v!=='string')invalid();return v.v;
      case 'b':if(typeof v.v!=='boolean')invalid();return v.v;
      case 'n':if(typeof v.v!=='number' || !Number.isFinite(v.v))invalid();return v.v;
      case 'a':case 'e':{if(!Array.isArray(v.v))invalid();const items=v.v.map(item=>visit(item,depth+1));return v.t==='e'?new Set(items):items;}
      case 'o':case 'p':{
        if(!Array.isArray(v.v))invalid();const out:Record<string,unknown>=v.t==='p'?Object.create(null):{};
        for(const entry of v.v){
          if(!Array.isArray(entry) || entry.length!==2 || typeof entry[0]!=='string' || own(out,entry[0]))invalid();
          Object.defineProperty(out,entry[0],{value:visit(entry[1],depth+1),enumerable:true,writable:true,configurable:true});
        }
        return out;
      }
      default:return invalid();
    }
  }
  return visit(value,0);
}
/** Installation directory, matching relative app entry/asset URLs. No browser access on import. */
export function recoveryKey(url:string):string {
  const entry=new URL(url);if(entry.protocol!=='https:' && entry.protocol!=='http:')invalid();
  return 'werewolf.match-recovery.v1:'+encodeURIComponent(new URL('.',entry).pathname);
}
function metadata(value:unknown):value is Omit<Checkpoint<unknown>,'payload'> & {payload:unknown} {
  if(!record(value))return false;
  const required=['format','schema','matchId','revision','createdAt','savedAt','expiresAt','payload'];
  return Object.keys(value).length===required.length && required.every(k=>own(value,k)) && value.format===FORMAT &&
    typeof value.schema==='string' && /^[a-zA-Z0-9._-]{1,80}$/.test(value.schema) && typeof value.matchId==='string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value.matchId) &&
    safeInteger(value.revision) && value.revision>0 && safeInteger(value.createdAt) && safeInteger(value.savedAt) && safeInteger(value.expiresAt) &&
    value.createdAt<=value.savedAt && value.savedAt<value.expiresAt && value.expiresAt-value.createdAt===RECOVERY_TTL_MS;
}
const guardKey = (key:string) => key+':commit';
const readyGuard = (c:Checkpoint<unknown>) => 'ready:'+c.matchId+':'+c.revision;
/** Fixed expiry from first save, never extended by timer ticks or later writes. */
export function makeCheckpoint<T>(payload:T,schema:string,matchId:string,now:number,previous?:Checkpoint<T>):Checkpoint<T> {
  const checkpoint:Checkpoint<T>={format:FORMAT,schema,matchId,revision:previous?previous.revision+1:1,createdAt:previous?.createdAt??now,savedAt:now,expiresAt:previous?.expiresAt??now+RECOVERY_TTL_MS,payload};
  if(!metadata(checkpoint) || (previous && (previous.matchId!==matchId || previous.schema!==schema || now<previous.savedAt)))invalid();
  return checkpoint;
}
/** Read-only inspection. Expired/incompatible/invalid payloads are never returned to rendering code. */
export function inspectRecovery<T>(storage:RecoveryStorage,key:string,schema:string,validate:(value:unknown)=>value is T,now=Date.now()):Inspection<T> {
  try {
    const raw=storage.getItem(key);if(raw===null)return{status:'none'};
    const guard=storage.getItem(guardKey(key));if(!guard || guard==='pending')return{status:'incomplete'};
    if(raw.length>MAX_RECOVERY_CHARS)return{status:'invalid'};
    const parsed:unknown=JSON.parse(raw);
    if(!record(parsed) || parsed.format!==FORMAT || parsed.schema!==schema)return{status:'incompatible'};
    if(!metadata(parsed))return{status:'invalid'};
    if(guard!==readyGuard(parsed))return{status:'incomplete'};
    if(now>=parsed.expiresAt)return{status:'expired'};
    if(!safeInteger(now) || now<parsed.savedAt)return{status:'clock-mismatch'};
    const payload=decode(parsed.payload);if(!validate(payload))return{status:'invalid'};
    return{status:'ready',checkpoint:{...parsed,payload}};
  }catch(error){return{status:error instanceof InvalidRecovery || error instanceof SyntaxError?'invalid':'unavailable'};}
}
/** Does not touch names, preferences, rankings or any other installation's recovery. */
export function clearRecovery(storage:RecoveryStorage,key:string):{cleared:boolean;mayContainSavedData:boolean} {
  let data=false,guard=false;
  try{storage.removeItem(key);data=true;}catch{/* Caller must not claim the data was erased. */}
  try{storage.removeItem(guardKey(key));guard=true;}catch{/* A leftover marker alone contains no roles/messages. */}
  return{cleared:data&&guard,mayContainSavedData:!data};
}
/**
 * Caller must opt in and coordinate exclusive writers before using this API.
 * Pending marker invalidates the old checkpoint before serialization/write. A failed or
 * interrupted write must not masquerade as a successful save of the latest action.
 */
export function writeRecovery<T>(storage:RecoveryStorage,key:string,checkpoint:Checkpoint<T>,validate:(value:unknown)=>value is T,now=Date.now()):WriteResult {
  let pending=false;
  try{
    storage.setItem(guardKey(key),'pending');pending=true;
    if(!metadata(checkpoint) || !validate(checkpoint.payload) || !safeInteger(now) || now<checkpoint.savedAt)invalid();
    if(now>=checkpoint.expiresAt){clearRecovery(storage,key);return{ok:false,reason:'expired',olderCheckpointMayStillBeUsable:false};}
    const raw=JSON.stringify({...checkpoint,payload:encode(checkpoint.payload)});if(raw.length>MAX_RECOVERY_CHARS)invalid();
    storage.setItem(key,raw);storage.setItem(guardKey(key),readyGuard(checkpoint));
    return{ok:true,savedAt:checkpoint.savedAt,expiresAt:checkpoint.expiresAt};
  }catch(error){
    const cleared=clearRecovery(storage,key);
    return{ok:false,reason:error instanceof InvalidRecovery?'invalid':'storage',olderCheckpointMayStillBeUsable:!pending && !cleared.cleared && cleared.mayContainSavedData};
  }
}
