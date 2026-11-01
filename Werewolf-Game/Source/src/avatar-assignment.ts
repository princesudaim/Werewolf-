export type AvatarMap = Record<string, string>;
export const playerKey = (name: string) => name.trim().toLocaleLowerCase();
const avatarIds = [1,2,3,4,5,7,8,9,11,13,15,16,17,18,19,20,21,23,24];
// Old copies of the moved portrait are removed from saved player profiles too.
const movedAvatars = new Set(['./werewolf/avatars/player22.webp','./werewolf/avatars/player22-covered.webp']);
export const resolveAvatar = (src: string) => movedAvatars.has(src) ? '' : src;
export const avatarFiles = avatarIds.map(id => `./werewolf/avatars/player${id}.webp`);

/** Assign an avatar to a player, reassigning every other current player using it. */
export function assignAvatar(names: string[], avatars: AvatarMap, name: string, chosen: string, random = Math.random): { avatars: AvatarMap; displaced: string[]; unassigned: string[] } {
  const next = {...avatars};
  const target = playerKey(name);
  const displaced = chosen ? names.filter(n => playerKey(n) !== target && next[playerKey(n)] === chosen) : [];
  for (const n of displaced) delete next[playerKey(n)];
  if (chosen) next[target] = chosen; else delete next[target];
  const used = new Set(names.map(n => next[playerKey(n)]).filter(Boolean));
  const unassigned: string[] = [];
  for (const n of displaced) {
    const available = avatarFiles.filter(src => !used.has(src));
    if (!available.length) { unassigned.push(n); continue; }
    const index = Math.min(available.length-1, Math.max(0, Math.floor(random()*available.length)));
    next[playerKey(n)] = available[index];
    used.add(available[index]);
  }
  return {avatars:next,displaced,unassigned};
}

/** Repair old rosters that were saved before avatar uniqueness was enforced. */
export function normalizeAvatars(names: string[], avatars: AvatarMap, random = Math.random): { avatars: AvatarMap; changed: string[]; unassigned: string[] } {
  const next = {...avatars};
  const occupied = new Set(names.map(n=>next[playerKey(n)]).filter(Boolean));
  const seen = new Set<string>();
  const changed:string[] = [], unassigned:string[] = [];
  for (const n of names) {
    const k=playerKey(n), src=next[k];
    if (!src) continue;
    if (!seen.has(src)) { seen.add(src); continue; }
    changed.push(n);
    const available=avatarFiles.filter(a=>!occupied.has(a));
    if (!available.length) { delete next[k]; unassigned.push(n); continue; }
    const index=Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)));
    next[k]=available[index]; occupied.add(available[index]); seen.add(available[index]);
  }
  return {avatars:next,changed,unassigned};
}
