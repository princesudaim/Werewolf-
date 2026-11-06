// This monitor never receives match state, changes storage or reloads a page.
export const OFFLINE_STATUS_MESSAGE = 'werewolf:offline-status:v1';
export const OFFLINE_REPAIR_MESSAGE = 'werewolf:offline-repair:v1';
export type OfflineSnapshot = Readonly<{
  supported:boolean;
  availability:'checking'|'ready'|'reopen'|'incomplete'|'unknown'|'error';
  waiting:boolean;
  installing:boolean;
  installFailed:boolean;
  canRepair:boolean;
  workerRepairing:boolean;
  repairState:'idle'|'offered'|'working'|'done'|'version'|'failed'|'uncertain';
}>;
type Environment = {
  workers:ServiceWorkerContainer;
  channel:()=>MessageChannel;
  events?:Pick<Window,'addEventListener'|'removeEventListener'>;
  timeoutMs?:number;
  repairTimeoutMs?:number;
};

export class OfflineMonitor {
  private env:Environment|undefined;
  private state:OfflineSnapshot;
  private subscribers=new Set<()=>void>();
  private cleanup:Array<()=>void>=[];
  private watched=new Set<ServiceWorker>();
  private registration:ServiceWorkerRegistration|undefined;
  private started=false;
  private disposed=false;
  private generation=0;
  private cancelRepair:(()=>void)|undefined;
  private cancelProbe:(()=>void)|undefined;

  constructor(env?:Environment) {
    this.env=env;
    this.state=Object.freeze({supported:!!env,availability:'checking',waiting:false,installing:false,installFailed:false,canRepair:false,workerRepairing:false,repairState:'idle'});
  }
  getSnapshot=()=>this.state;
  subscribe=(callback:()=>void)=>{this.subscribers.add(callback);return ()=>{this.subscribers.delete(callback);};};
  private publish(patch:Partial<OfflineSnapshot>) {
    if(this.disposed)return;
    const next={...this.state,...patch};
    if((Object.keys(next) as Array<keyof OfflineSnapshot>).every(key=>next[key]===this.state[key]))return;
    this.state=Object.freeze(next);
    for(const callback of this.subscribers)callback();
  }
  private listen(target:EventTarget,type:string,handler:EventListener) {
    target.addEventListener(type,handler);
    this.cleanup.push(()=>target.removeEventListener(type,handler));
  }
  private watch(worker:ServiceWorker|null) {
    if(!worker||this.watched.has(worker))return;
    this.watched.add(worker);
    let installed=['installed','activating','activated'].includes(worker.state);
    this.listen(worker,'statechange',()=>{
      if(['installed','activating','activated'].includes(worker.state))installed=true;
      if(worker.state==='redundant'&&!installed)this.publish({installFailed:true});
      this.check();
    });
  }
  start=async()=>{
    if(this.started||this.disposed||!this.env)return;
    this.started=true;
    this.listen(this.env.workers,'controllerchange',()=>this.check());
    if(this.env.events){
      const handler=()=>this.check();
      this.env.events.addEventListener('online',handler);
      this.cleanup.push(()=>this.env?.events?.removeEventListener('online',handler));
    }
    try {
      // Exactly the existing registration URL/scope/policy; no activation messages.
      let registration:ServiceWorkerRegistration|undefined;
      try{registration=await this.env.workers.register('sw.js',{scope:'./',updateViaCache:'none'});}
      catch{
        // Offline script checks may fail although a current controller still works.
        if(this.env.workers.controller)registration=await this.env.workers.getRegistration();
        if(!registration)throw new Error('offline registration unavailable');
      }
      if(this.disposed)return;
      this.registration=registration;
      this.listen(registration,'updatefound',()=>{
        this.publish({installFailed:false});
        this.watch(registration.installing);
        this.check();
      });
      this.watch(registration.installing);
      this.watch(registration.active);
      this.check();
    } catch {
      this.publish({availability:'error',installing:false});
    }
  };
  check=()=>{
    if(this.disposed||!this.env)return;
    this.cancelProbe?.();
    this.cancelProbe=undefined;
    const generation=++this.generation;
    const registration=this.registration;
    if(!registration)return;
    const installing=!!registration.installing&&['parsed','installing'].includes(registration.installing.state);
    this.publish({waiting:!!registration.waiting,installing});
    this.watch(registration.installing);
    this.watch(registration.active);
    const controller=this.env.workers.controller;
    const target=controller||registration.active;
    if(!target){
      this.publish({availability:this.state.installFailed?'error':'checking'});
      return;
    }
    this.publish({availability:'checking'});
    let channel:MessageChannel;
    try{channel=this.env.channel();}catch{this.publish({availability:'unknown'});return;}
    let finished=false;
    const cleanup=()=>{
      clearTimeout(timer);
      channel.port1.onmessage=null;
      channel.port1.close();
      channel.port2.close();
    };
    const finish=(availability:OfflineSnapshot['availability'])=>{
      if(finished)return;
      finished=true;
      cleanup();
      if(!this.disposed&&generation===this.generation)this.publish({availability});
    };
    const timer=setTimeout(()=>finish('unknown'),this.env.timeoutMs??3000);
    this.cancelProbe=()=>{finished=true;cleanup();};
    channel.port1.onmessage=event=>{
      const data=event.data;
      if(data?.type!==OFFLINE_STATUS_MESSAGE)return;
      this.publish({canRepair:data.canRepair===true,workerRepairing:data.repairing===true,repairState:this.state.repairState==='idle'&&data.canRepair===true&&data.complete===false?'offered':this.state.repairState});
      if(data.unavailable===true)finish('unknown');
      else if(typeof data.complete==='boolean')finish(data.complete?(controller?'ready':'reopen'):'incomplete');
    };
    try{target.postMessage({type:OFFLINE_STATUS_MESSAGE},[channel.port2]);}
    catch{finish('unknown');}
  };
  repairMissing=()=>{
    if(this.disposed||!this.env||!this.state.canRepair||this.state.availability!=='incomplete'||this.state.repairState==='working'||this.state.workerRepairing)return;
    const target=this.env.workers.controller||this.registration?.active;
    if(!target)return;
    this.cancelProbe?.();
    ++this.generation;
    this.publish({repairState:'working'});
    let channel:MessageChannel;
    try{channel=this.env.channel();}catch{this.publish({repairState:'uncertain'});return;}
    let finished=false;
    const cleanup=()=>{clearTimeout(timer);channel.port1.onmessage=null;channel.port1.close();channel.port2.close();};
    const finish=(state:OfflineSnapshot['repairState'])=>{
      if(finished)return;finished=true;cleanup();
      if(this.disposed)return;
      const current=this.env!.workers.controller||this.registration?.active;
      this.publish({repairState:current===target?state:'uncertain'});
      this.check();
    };
    const timer=setTimeout(()=>finish('uncertain'),this.env.repairTimeoutMs??135000);
    this.cancelRepair=()=>{finished=true;cleanup();};
    channel.port1.onmessage=event=>{
      const data=event.data;
      if(data?.type!==OFFLINE_REPAIR_MESSAGE)return;
      if(data.ok===true&&data.complete===true)finish('done');
      else finish(data.reason==='version'?'version':'failed');
    };
    try{target.postMessage({type:OFFLINE_REPAIR_MESSAGE},[channel.port2]);}catch{finish('uncertain');}
  };
  dispose=()=>{
    this.disposed=true;
    ++this.generation;
    this.cancelProbe?.();
    this.cancelRepair?.();
    for(const remove of this.cleanup.splice(0))remove();
    this.watched.clear();
    this.subscribers.clear();
  };
}

function browserEnvironment():Environment|undefined {
  if(typeof window==='undefined'||!/^https?:$/.test(window.location.protocol)||window.isSecureContext===false||!window.navigator.serviceWorker)return;
  return {workers:window.navigator.serviceWorker,channel:()=>new MessageChannel(),events:window};
}
export const offlineMonitor=new OfflineMonitor(browserEnvironment());
