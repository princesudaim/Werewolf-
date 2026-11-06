export type AvatarMap = Record<string, string>;
export const playerKey = (name: string) => name.trim().toLocaleLowerCase();
// Stable displayed positions: replace only 1, 2, 3, 5, 6, 7 and 8.
export const avatarFiles = [
  "./werewolf/avatars/photo-01-20261106.png",
  "./werewolf/avatars/photo-02-20261106.png",
  "./werewolf/avatars/photo-03-20261106.jpg",
  "./werewolf/avatars/player4.webp",
  "./werewolf/avatars/photo-05-20261106.jpg",
  "./werewolf/avatars/photo-06-20261106.png",
  "./werewolf/avatars/photo-07-20261106.png",
  "./werewolf/avatars/photo-08-20261106.jpg",
  "./werewolf/avatars/player11.webp",
  "./werewolf/avatars/player13.webp",
  "./werewolf/avatars/player15.webp",
  "./werewolf/avatars/player16.webp",
  "./werewolf/avatars/player17.webp",
  "./werewolf/avatars/player18.webp",
  "./werewolf/avatars/player19.webp",
  "./werewolf/avatars/player20.webp",
  "./werewolf/avatars/player21.webp",
  "./werewolf/avatars/player23.webp",
  "./werewolf/avatars/player24.webp"
];
const replacedAvatars: Record<string, string> = {
  "player1.webp": "./werewolf/avatars/photo-01-20261106.png",
  "player2.webp": "./werewolf/avatars/photo-02-20261106.png",
  "player3.webp": "./werewolf/avatars/photo-03-20261106.jpg",
  "player5.webp": "./werewolf/avatars/photo-05-20261106.jpg",
  "player7.webp": "./werewolf/avatars/photo-06-20261106.png",
  "player8.webp": "./werewolf/avatars/photo-07-20261106.png",
  "player9.webp": "./werewolf/avatars/photo-08-20261106.jpg"
};
export function resolveAvatar(src: string): string {
  if (typeof src !== 'string') return '';
  if (/player22(?:-covered)?\.webp(?:[?#].*)?$/.test(src)) return '';
  const filename = src.split(/[?#]/, 1)[0].split('/').pop() || '';
  return Object.prototype.hasOwnProperty.call(replacedAvatars, filename) ? replacedAvatars[filename] : src;
}

/** Assign an avatar to a player, reassigning every other current player using it. */
export function assignAvatar(names: string[], avatars: AvatarMap, name: string, chosen: string, random = Math.random): { avatars: AvatarMap; displaced: string[]; unassigned: string[] } {
  const next = Object.fromEntries(Object.entries(avatars).map(([name, src]) => [name, resolveAvatar(src)]));
  chosen = resolveAvatar(chosen);
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
export function normalizeAvatars(names: string[], avatars: AvatarMap, random = Math.random): { avatars: AvatarMap; changed: string[]; unassigned: string[]; migrated: boolean } {
  const next = Object.fromEntries(Object.entries(avatars).map(([name, src]) => [name, resolveAvatar(src)]));
  const migrated = Object.keys(avatars).some(name => avatars[name] !== next[name]);
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
  return {avatars:next,changed,unassigned,migrated};
}
