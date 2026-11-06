import type {ReactNode} from 'react';
import {Drama,House,Cross,Eye,Utensils,Landmark,Droplet,MicOff,PartyPopper,Skull,ShieldCheck,Crosshair,Swords,LifeBuoy,Footprints,Orbit,Star,Search,Vote,Dumbbell,Thermometer,Moon,Baby,Newspaper,Feather,Biohazard,Snowflake,Dices,Brain,Radar,KeyRound,LockKeyhole,Waves,HeartHandshake} from 'lucide-react';
import {Avatar} from './PlayerSetup';
import type {Role} from './werewolf-engine';
import {ROLE_TARGET_MARKERS} from './role-target-markers';
import clawMark from './assets/imposter-claw.png';
import './target-portrait.css';
const icons={Drama,House,Cross,Eye,Utensils,Landmark,Droplet,MicOff,PartyPopper,Skull,ShieldCheck,Crosshair,Swords,LifeBuoy,Footprints,Orbit,Star,Search,Vote,Dumbbell,Thermometer,Moon,Baby,Newspaper,Feather,Biohazard,Snowflake,Dices,Brain,Radar,KeyRound,LockKeyhole,Waves,HeartHandshake};
export function RoleTargetMarker({role}:{role:Role}){
  const symbol=ROLE_TARGET_MARKERS[role];
  const Icon=symbol==='Claw'?null:icons[symbol];
  return <span className="role-target-marker" data-marker-role={role} aria-hidden="true">
    {Icon?<Icon size={18} strokeWidth={2.5}/>:<img className="wolf-claw-marker" src={clawMark} alt=""/>}
  </span>;
}
/** Fixed square: status/selection overlays never enter the card's text flow. */
export function TargetPortrait({name,avatars,alive,escaped,children}:{name:string;avatars:Record<string,string>;alive:boolean;escaped?:boolean;children?:ReactNode}){
  return <span className="target-portrait">
    <Avatar name={name} avatars={avatars} className="target-avatar"/>
    {!alive&&<span className="target-status" data-status={escaped?'escaped':'dead'}>{escaped?'ESCAPED':'DEAD'}</span>}
    {children}
  </span>;
}
