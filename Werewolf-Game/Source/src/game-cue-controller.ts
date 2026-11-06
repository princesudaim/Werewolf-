import {audioCatalog,gameCueCatalog,chooseVotedOutCue,chooseGameEndCue,chooseMorningDeathCue,audioRandom,type MorningDeathCue,type GameEndCue,type VotedOutCue,type GameCue} from './game-audio.ts';
export type CuePlatform={random?:()=>number;createAudio:()=>HTMLAudioElement;timer:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;clear:(id:ReturnType<typeof setTimeout>)=>void;duck:(on:boolean)=>void};
/** One reusable clip voice and one bounded sequence. No deferred autoplay replay. */
export class GameCueController {
  private player:HTMLAudioElement|null=null;
  private lastMorningDeath:MorningDeathCue|null=null;
  private lastGameEnd:GameEndCue|null=null;
  private lastVotedOut:VotedOutCue|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private epoch=0;
  private visible=true;
  private enabled=false;
  private volume=0;
  private disposed=false;
  private unlocked=false;
  private platform:CuePlatform;
  constructor(platform:CuePlatform){this.platform=platform;}
  configure(enabled:boolean,volume:number){
    if(this.enabled!==enabled || this.volume!==volume)this.cancel();
    this.enabled=enabled;this.volume=Math.max(0,Math.min(100,volume));
  }
  private getPlayer(){return this.player??(this.player=this.platform.createAudio());}
  primeFromGesture(){
    if(this.unlocked||this.disposed||!this.visible||!this.enabled||this.volume===0||this.player?.paused===false)return;
    try{
      const p=this.getPlayer(),epoch=this.epoch;p.src=audioCatalog.cues.tap.file;p.volume=0;p.loop=false;
      this.unlocked=true;
      void Promise.resolve(p.play()).then(()=>{if(epoch===this.epoch){p.pause();p.currentTime=0;}}).catch(()=>{this.unlocked=false;});
    }catch{this.unlocked=false;}
  }
  play(sequence:readonly GameCue[]){
    this.cancel(false);
    if(!this.enabled||!this.visible||this.volume===0||this.disposed||!sequence.length){this.platform.duck(false);return;}
    const epoch=this.epoch;this.platform.duck(true);
    const run=(index:number)=>{
      if(epoch!==this.epoch)return;
      const request=sequence[index];if(!request){this.cancel();return;}
      const cue=request==='morning-death'?chooseMorningDeathCue(this.lastMorningDeath,(this.platform.random??audioRandom)()):request==='game-end'?chooseGameEndCue(this.lastGameEnd,(this.platform.random??audioRandom)()):request==='voted-out'?chooseVotedOutCue(this.lastVotedOut,(this.platform.random??audioRandom)()):request;
      if(request==='voted-out')this.lastVotedOut=cue as VotedOutCue;
      if(request==='game-end')this.lastGameEnd=cue as GameEndCue;
      if(request==='morning-death')this.lastMorningDeath=cue as MorningDeathCue;
      try{
        const p=this.getPlayer(),clip=gameCueCatalog[cue];p.src=clip.file;p.loop=false;p.volume=this.volume/100;p.currentTime=0;
        p.onended=()=>{
          // A buffered clip must actually finish, not just reach a wall-clock guess.
          // Ignore an old queued event if this reused element is playing a new clip.
          if(epoch!==this.epoch || p.ended===false)return;
          if(this.timer!==null)this.platform.clear(this.timer);this.timer=null;
          run(index+1);
        };
        void Promise.resolve(p.play()).then(()=>{
          if(epoch!==this.epoch)return;
          // Abort a stalled/broken sequence rather than replaying an overdue MVP.
          this.timer=this.platform.timer(()=>{this.timer=null;this.cancel();},Math.ceil(clip.seconds*1000)+4000);
        }).catch(()=>{if(epoch===this.epoch)this.cancel();});
      }catch{if(epoch===this.epoch)this.cancel();}
    };run(0);
  }
  setVisible(visible:boolean){this.visible=visible;if(!visible)this.cancel();}
  cancel(restoreAmbience=true){this.epoch++;if(this.timer!==null)this.platform.clear(this.timer);this.timer=null;try{if(this.player){this.player.onended=null;this.player.pause();this.player.volume=0;}}catch{}if(restoreAmbience)this.platform.duck(false);}
  dispose(){this.cancel();this.disposed=true;try{if(this.player){this.player.removeAttribute?.('src');this.player.load?.();}}catch{}this.player=null;}
}
