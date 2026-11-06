/* Compatibility for the unused original UI tree. All former synth recipes have
 * been retired. This bridge uses the new privacy-neutral tap only; the live game
 * owns outcome music/cues via useGameFeedback, never through this legacy API. */
import {FeedbackController} from '../feedback-controller.ts';
import {DEFAULT_FEEDBACK_PREFERENCES} from '../feedback-preferences.ts';
let controller:FeedbackController|null=null;
let enabled=true,volume=1;
const options=()=>({...DEFAULT_FEEDBACK_PREFERENCES,effects:enabled,haptics:false,effectsVolume:volume*100});
function player(){
  if(!controller && typeof window!=='undefined')controller=new FeedbackController({
    createContext:()=>{const AC=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;return AC?new AC():null;},
    createAudio:()=>new Audio(),vibrate:()=>{},now:()=>performance.now(),
  },options());
  return controller;
}
export function unlockAudio(){/* Live gesture unlocking belongs to the current controller. */}
export function setSound(on:boolean){enabled=on;controller?.configure(options());}
export function setVolume(value:number){volume=Math.max(0,Math.min(1,value));controller?.configure(options());}
const tap=()=>{if(enabled&&volume>0)player()?.play('tap',true);};
const oldNames=['click','pop','flip','reveal','susReveal','select','confirm','deny','kill','gunshot','save','innocent','guilty','tick','alarm','eject','coin','gameStart','emergency','win','lose'] as const;
export const sfx=Object.fromEntries(oldNames.map(name=>[name,tap])) as Record<typeof oldNames[number],()=>void>;
