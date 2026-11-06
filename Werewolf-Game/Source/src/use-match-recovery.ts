import {useEffect,useLayoutEffect,useRef,useState,type Dispatch,type SetStateAction,type MutableRefObject} from 'react';
import {clearRecovery,inspectRecovery,makeCheckpoint,recoveryKey,writeRecovery,type Checkpoint,type Inspection} from './match-recovery';
import {GAME_RECOVERY_SCHEMA,GAME_SCREENS,STATE_FIELDS,REF_FIELDS,prepareRecoveredSnapshot,validateGameSnapshot,type GameSnapshot} from './game-snapshot';
import {defaults,type Settings,type Player} from './werewolf-engine';

type View={enabled:boolean;active:boolean;busy:boolean;stage:'saved'|'private'|null;canResume:boolean;actor:string;notice:string;savedAt:number;scoreRetry:number};
const storage=()=>{try{return window.localStorage;}catch{return null;}};
const inspect=(key:string):Inspection<GameSnapshot>=>{const s=storage();return s?inspectRecovery(s,key,GAME_RECOVERY_SCHEMA,validateGameSnapshot):{status:'unavailable'};};
const statusMessage=(status:string)=>status==='expired'?'This saved match has expired.':status==='clock-mismatch'?'The device clock changed. Check it before trying recovery.':status==='unavailable'?'Browser storage is unavailable.':'This saved match cannot be recovered by this version.';
function opaqueId(){const values=new Uint32Array(4);window.crypto.getRandomValues(values);return Array.from(values,n=>n.toString(36)).join('_');}
function roleWait(settings:Settings,role:string){const passive=['villager','jester','celebrity','sickman'].includes(role),extra=Number(settings.roleWaitSeconds?.[role as keyof typeof settings.roleWaitSeconds])||0;return Math.max(0,Math.min(15,Math.floor(Math.max(settings.allRolesWait?Number(settings.allRolesWaitSeconds)||5:0,settings.passiveWait&&passive?Number(settings.passiveWaitSeconds)||5:0,Number.isFinite(extra)?extra:0))));}

export class MatchRecovery {
 state:Record<string,unknown>={};setters:Record<string,(value:unknown)=>void>={};refs:Record<string,{current:unknown}>={};
 key:string;view:View;supported:boolean;owned=false;fault=false;id:string|undefined;checkpoint:Checkpoint<GameSnapshot>|undefined;
 private expiryTimer:number|undefined;private generation=0;
 private prepared:GameSnapshot|undefined;private signature='';private waitEnd:number|null=null;private lease:{release:()=>void}|null=null;
 constructor(initial:Inspection<GameSnapshot>,private update:Dispatch<SetStateAction<View>>,key:string){
  this.key=key;this.supported=!!key&&!!window.navigator.locks?.request;
  this.view={enabled:false,active:false,busy:false,stage:initial.status==='none'||initial.status==='unavailable'?null:'saved',canResume:initial.status==='ready',actor:'',notice:initial.status==='ready'||initial.status==='none'?'':statusMessage(initial.status),savedAt:initial.status==='ready'?initial.checkpoint.savedAt:0,scoreRetry:0};
 }
 change=(patch:Partial<View>)=>{this.view={...this.view,...patch};this.update(this.view);};
 release=()=>{this.generation++;window.clearTimeout(this.expiryTimer);this.expiryTimer=undefined;const lease=this.lease;this.lease=null;this.owned=false;lease?.release();};
 private acquire=async()=>{
  if(this.owned)return true;if(!this.supported)return false;
  const generation=this.generation;
  return new Promise<boolean>(resolve=>{
   window.navigator.locks.request(this.key+':exclusive',{ifAvailable:true,mode:'exclusive'},async lock=>{
    if(!lock||generation!==this.generation){resolve(false);return;}
    let release!:()=>void;const held=new Promise<void>(done=>release=done),lease={release};this.lease=lease;this.owned=true;resolve(true);await held;
    if(this.lease===lease){this.lease=null;this.owned=false;}
   }).catch(()=>resolve(false));
  });
 };
 enable=async()=>{
  if(this.view.busy)return;this.change({busy:true,notice:''});
  if(!await this.acquire()){this.change({busy:false,notice:this.supported?'Another tab has this match open. Close it before enabling recovery here.':'Recovery needs browser storage and Web Locks support. The game can still be played without recovery.'});return;}
  const current=inspect(this.key);
  if(current.status!=='none'){this.release();this.change({busy:false,stage:current.status==='unavailable'?null:'saved',canResume:current.status==='ready',notice:current.status==='ready'?'A saved match already exists. Resume or discard it first.':statusMessage(current.status)});return;}
  this.fault=false;this.change({busy:false,enabled:true,notice:'Recovery is on for the next match. Close other game tabs before starting.'});
 };
 private armExpiry=()=>{window.clearTimeout(this.expiryTimer);if(this.checkpoint)this.expiryTimer=window.setTimeout(this.expire,Math.max(0,this.checkpoint.expiresAt-Date.now()));};
 private expire=()=>{
  if(!this.owned||!this.id||!this.checkpoint)return;
  if(Date.now()<this.checkpoint.expiresAt){this.armExpiry();return;}
  if(this.view.stage!==null)this.change({stage:'saved',actor:'',canResume:false});
  void this.discard().then(()=>{if(!this.id)this.change({notice:'The 24-hour recovery period ended. The save was erased. An open match can still continue without recovery.'});});
 };
 begin=()=>{if(!this.view.enabled||!this.owned)return;this.id=opaqueId();this.checkpoint=undefined;this.signature='';this.fault=false;this.change({active:true,savedAt:0,notice:''});};
 resume=async()=>{
  if(this.view.busy)return;this.change({busy:true,notice:''});
  if(!await this.acquire()){this.change({busy:false,notice:this.supported?'This match is open in another tab. Close that tab, then try again.':'This browser cannot safely coordinate recovery between tabs.'});return;}
  const current=inspect(this.key);
  if(current.status!=='ready'){this.release();this.change({busy:false,canResume:false,notice:statusMessage(current.status)});return;}
  this.id=current.checkpoint.matchId;this.checkpoint=current.checkpoint;this.armExpiry();this.fault=false;this.signature='';
  this.prepared=prepareRecoveredSnapshot(current.checkpoint.payload,Date.now());
  if(this.prepared.state.screen==='discussion')this.prepared.state.seconds=Math.max(0,Math.ceil(((this.prepared.refs.discussionDeadline as number)-Date.now())/1000));
  const restoredSettings=this.prepared.state.settings as Settings,device=this.state.settings as Settings;
  this.prepared.state.settings={...restoredSettings,sounds:device.sounds,buttonSounds:device.buttonSounds,haptics:device.haptics};
  for(const key of Object.keys(REF_FIELDS))this.refs[key].current=this.prepared.refs[key];
  for(const key of Object.keys(STATE_FIELDS))if(key!=='screen')this.setters[key](this.prepared.state[key]);
  const target=String(this.prepared.state.screen),players=this.prepared.state.players as Player[],queue=this.prepared.state.queue as number[],index=this.prepared.state.index as number;
  const privateScreen=['action','privateResult','vote','discussion'].includes(target);
  const actor=target==='discussion'?players.find(p=>p.alive):players.find(p=>p.id===queue[index]);
  this.change({enabled:true,active:true,busy:false,stage:privateScreen?'private':null,actor:privateScreen?actor?.name||'the current player':'',notice:'',savedAt:current.checkpoint.savedAt});
  if(privateScreen)this.setters.screen('recovery');else{this.setters.screen(target);this.prepared=undefined;}
 };
 reveal=()=>{
  if(!this.prepared||!this.owned)return;
  if(!this.checkpoint || Date.now()<this.checkpoint.savedAt || Date.now()>=this.checkpoint.expiresAt){this.prepared=undefined;this.change({stage:'saved',actor:'',canResume:false,notice:'This save is no longer valid. Check the device clock or discard the saved match.'});return;}
  const p=prepareRecoveredSnapshot(this.prepared,Date.now()),target=String(p.state.screen);
  if(this.prepared.state.screen==='discussion' && target==='vote'){for(const key of ['queue','index','ballots','selected'])this.setters[key](p.state[key]);}
  if(target==='action'){
   const active=(p.state.players as Player[]).find(player=>player.id===(p.state.queue as number[])[p.state.index as number]);
   this.waitEnd=(p.state.passiveWaitUntil as number)>0?p.state.passiveWaitUntil as number:this.checkpoint!.savedAt+roleWait(p.state.settings as Settings,active?.role||'')*1000;
   this.setters.passiveWaitUntil(this.waitEnd);this.setters.passiveSeconds(Math.max(0,Math.ceil((this.waitEnd-Date.now())/1000)));
  }
  this.prepared=undefined;this.change({stage:null,actor:'',notice:''});this.setters.screen(target);
 };
 consumeWait=()=>{const end=this.waitEnd;this.waitEnd=null;return end;};
 discard=async(onlyExpired=false)=>{
  if(this.view.busy)return;this.change({busy:true});
  if(!await this.acquire()){this.change({busy:false,notice:this.supported?'Close the other tab using this match before discarding its save.':"This browser cannot safely erase recovery. Update this browser, or clear this site's data in browser settings (that also removes profiles and rankings)."});return;}
  if(onlyExpired){const current=inspect(this.key);if(current.status!=='expired'){this.release();this.change({busy:false,stage:current.status==='none'?null:'saved',canResume:current.status==='ready',savedAt:current.status==='ready'?current.checkpoint.savedAt:0,notice:current.status==='ready'||current.status==='none'?'':statusMessage(current.status)});return;}}
  const s=storage(),result=s?clearRecovery(s,this.key):{cleared:false,mayContainSavedData:true};
  if(!result.cleared){this.fault=true;this.change({busy:false,enabled:false,notice:'Could not fully erase the recovery save. It may remain in browser storage. Retry when storage is available.'});return;}
  const wasGate=this.view.stage!==null;this.id=undefined;this.checkpoint=undefined;this.prepared=undefined;this.signature='';this.fault=false;this.release();
  this.change({enabled:false,active:false,busy:false,stage:null,actor:'',canResume:false,savedAt:0,notice:''});if(wasGate)this.setters.screen('home');
 };
 retry=()=>{if(!this.owned)return;this.fault=false;this.signature='';this.change({enabled:true,notice:''});};
 retryScore=()=>this.change({scoreRetry:this.view.scoreRetry+1});
 credit=()=>this.view.active&&this.id&&this.checkpoint&&this.checkpoint.expiresAt>Date.now()?{id:this.id,expiresAt:this.checkpoint.expiresAt}:undefined;
 finish=(id:string)=>{if(this.id!==id||!this.owned)return;void this.discard();};
 capture=(screen:string)=>{
  if(!this.view.active||!this.owned||!this.id||this.view.busy||this.fault)return;
  if(this.checkpoint&&Date.now()>=this.checkpoint.expiresAt){this.expire();return;}
  if(!this.view.enabled||this.view.stage!==null)return;
  if(screen==='end'&&this.refs.rankingRecorded.current){void this.discard();return;}
  if(screen==='home'){void this.discard();return;}
  if(!(GAME_SCREENS as readonly string[]).includes(screen))return;
  const state={...this.state},refs=Object.fromEntries(Object.entries(this.refs).map(([key,ref])=>[key,ref.current]));
  // Absolute deadlines are authoritative; do not rewrite the whole save every countdown tick.
  state.seconds=0;state.passiveSeconds=0;
  // Keep absent legacy Thief options absent; manufacturing undefined keys would invalidate the next save.
  const settings=state.settings as Record<string,unknown>;
  state.settings=Object.fromEntries(Object.keys(defaults).filter(key=>Object.prototype.hasOwnProperty.call(settings,key)).map(key=>[key,settings[key]]));
  const payload:GameSnapshot={state,refs};
  try{
   const signature=JSON.stringify(payload,(_key,value)=>value instanceof Set?{setValues:[...value]}:value);
   if(signature===this.signature)return;
   const now=Date.now(),s=storage();if(!s)throw new Error('Storage unavailable');
   const next=makeCheckpoint(payload,GAME_RECOVERY_SCHEMA,this.id,now,this.checkpoint);
   const result=writeRecovery(s,this.key,next,validateGameSnapshot,now);
   if(!result.ok)throw new Error('Checkpoint unavailable');
   this.signature=signature;this.checkpoint=next;this.armExpiry();this.change({savedAt:now,notice:''});
  }catch{
   const s=storage();if(s)clearRecovery(s,this.key);
   this.fault=true;this.change({enabled:false,notice:'Recovery could not be updated. Do not refresh or close this match. An older save may remain; retry saving or erase recovery when storage works.'});
  }
 };
}

export function useMatchRecovery(){
 // File downloads and unsupported origins still play normally, without recovery.
 let key='';try{key=recoveryKey(window.location.href);}catch{/* Recovery is HTTP(S)-scoped. */}
 const [initial]=useState<Inspection<GameSnapshot>>(()=>key?inspect(key):{status:'none'});const [view,setView]=useState<View>(()=>({enabled:false,active:false,busy:false,stage:initial.status==='none'||initial.status==='unavailable'?null:'saved',canResume:initial.status==='ready',actor:'',notice:initial.status==='ready'||initial.status==='none'?'':statusMessage(initial.status),savedAt:initial.status==='ready'?initial.checkpoint.savedAt:0,scoreRetry:0}));
 const ref=useRef<MatchRecovery|null>(null);if(!ref.current)ref.current=new MatchRecovery(initial,setView,key);const controller=ref.current;controller.view=view;
 useEffect(()=>{if(initial.status==='expired')void controller.discard(true);return()=>controller.release();},[controller]);
 return controller;
}
export function useMatchState<T>(controller:MatchRecovery,key:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{const [value,setValue]=useState(initial);controller.state[key]=value;controller.setters[key]=next=>setValue(next as T);return[value,setValue];}
export function useMatchRef<T>(controller:MatchRecovery,key:string,initial:T):MutableRefObject<T>{const ref=useRef(initial);controller.refs[key]=ref;return ref;}
export function useRecoveryCommit(controller:MatchRecovery,screen:string){useLayoutEffect(()=>{controller.capture(screen);});}
