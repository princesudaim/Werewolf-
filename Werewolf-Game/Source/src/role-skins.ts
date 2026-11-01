import type { Role } from './werewolf-engine';

export const CELEBRITY_SKINS = [
  { id: 'default', name: 'Default', image: 'celebrity-new.webp' },
  { id: 'spotlight', name: 'Spotlight', image: 'celebrity-spotlight.webp' },
  { id: 'gala', name: 'Gala', image: 'celebrity-gala.webp' },
] as const;
export const CHARMER_SKINS = [
  { id: 'default', name: 'Default', image: 'charmer-new.webp' },
  { id: 'moonlight', name: 'Moonlight', image: 'charmer-moonlight.webp' },
  { id: 'starlight', name: 'Starlight', image: 'charmer-starlight.webp' },
  { id: 'sapphire', name: 'Sapphire', image: 'charmer-sapphire.webp' },
  { id: 'sunrise', name: 'Sunrise', image: 'charmer-sunrise.webp' },
] as const;
export type CharmerSkin = typeof CHARMER_SKINS[number]['id'];
export const CHARMER_SKIN_KEY = 'werewolf.charmerSkin';
export function validCharmerSkin(value: unknown): CharmerSkin {
  return CHARMER_SKINS.find(skin => skin.id === value)?.id ?? 'default';
}

export type CelebritySkin = typeof CELEBRITY_SKINS[number]['id'];
export const CELEBRITY_SKIN_KEY = 'werewolf.celebritySkin';

export function validCelebritySkin(value: unknown): CelebritySkin {
  return CELEBRITY_SKINS.find(skin => skin.id === value)?.id ?? 'default';
}
export function rolePicture(role: Role, celebritySkin: CelebritySkin, charmerSkin: CharmerSkin = 'default'): string {
  const image = role === 'celebrity'
    ? CELEBRITY_SKINS.find(skin => skin.id === celebritySkin)?.image ?? CELEBRITY_SKINS[0].image
    : role === 'charmer' ? CHARMER_SKINS.find(skin => skin.id === charmerSkin)?.image ?? CHARMER_SKINS[0].image : `${role}.webp`;
  return `./werewolf/${image}`;
}
