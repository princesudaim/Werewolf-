/** Audio-only coordination between copies of this installation. No game/private
 * data, storage writes, worker messages or forced navigation. Older builds which
 * do not support this channel cannot be muted remotely; close those copies.
 */
type Port=Pick<BroadcastChannel,'postMessage'|'onmessage'|'close'>;
export class AudioFocus {
  private channel:Port|null=null;
  private owner=false;
  private disposed=false;
  private id:string;
  private change:(owner:boolean)=>void;
  constructor(open:()=>Port,id:string,change:(owner:boolean)=>void){
    this.id=id;this.change=change;
    try{
      this.channel=open();this.channel.onmessage=event=>{
        const data=event.data;
        if(!this.disposed&&data?.type==='claim'&&typeof data.id==='string'&&data.id!==this.id&&this.owner){this.owner=false;this.change(false);}
      };
    }catch{/* Unsupported browsers still have local, single-player ownership. */}
  }
  get ownsAudio(){return this.owner;}
  claim(){
    if(this.disposed||this.owner)return;
    this.owner=true;this.change(true);
    try{this.channel?.postMessage({type:'claim',id:this.id});}catch{}
  }
  dispose(){
    this.disposed=true;this.owner=false;try{if(this.channel){this.channel.onmessage=null;this.channel.close();}}catch{}this.channel=null;
  }
}
