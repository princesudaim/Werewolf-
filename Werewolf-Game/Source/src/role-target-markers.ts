import type {Role} from './werewolf-engine';
/** The actor's visible private-turn role, never the target's secret identity. */
export const ROLE_TARGET_MARKERS = {
  madman:'Drama', werewolf:'Claw', villager:'House', doctor:'Cross', seer:'Eye',
  chef:'Utensils', mayor:'Landmark', templar:'Droplet', muted:'MicOff', jester:'PartyPopper',
  necromancer:'Skull', bodyguard:'ShieldCheck', sheriff:'Crosshair', serialkiller:'Swords',
  survivor:'LifeBuoy', visitor:'Footprints', psychic:'Orbit', celebrity:'Star',
  detective:'Search', instigator:'Vote', strongwolf:'Dumbbell', sickman:'Thermometer',
  lonewolf:'Moon', wolfpup:'Baby', journalist:'Newspaper', raven:'Feather', rabidwolf:'Biohazard',
  whitewolf:'Snowflake', gambler:'Dices', mindflayer:'Brain', intelligence:'Radar', thief:'KeyRound',
  police:'LockKeyhole', hypnowolf:'Waves', charmer:'HeartHandshake',
} as const satisfies Record<Role,string>;
