import {defaults,type Settings} from './werewolf-engine.ts';

export const RANDOM_DEFAULTS_KEY='werewolf.random-defaults.v1';
export const RANDOM_DEFAULT_KEYS=['randomUniqueRoles','randomFollowChances','distributionUniqueRoles','distributionFollowChances'] as const;
/** Apply the requested defaults once to setup preferences, never to a recovered active match. */
export function randomSetupPreferences(stored:Partial<Settings>,version:unknown):Settings {
  const next={...defaults,...stored};
  if(version!==1)for(const key of RANDOM_DEFAULT_KEYS)next[key]=true;
  return next;
}
/** Write preferences first: a failed write must not mark the one-time update as completed. */
export function persistSetupPreferences(storage:Pick<Storage,'setItem'>,settings:Settings):void {
  storage.setItem('werewolf.settings',JSON.stringify(settings));
  storage.setItem(RANDOM_DEFAULTS_KEY,'1');
}
