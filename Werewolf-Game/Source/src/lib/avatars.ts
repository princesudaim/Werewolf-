/* NIGHTFALL avatars — 12 inline SVG crewmates and four image-based choices. */

export type AccessoryId =
  | "none"
  | "antenna"
  | "cap"
  | "crown"
  | "horns"
  | "halo"
  | "leaf"
  | "flame"
  | "bolt"
  | "visorshade"
  | "bandage"
  | "headphones";

export interface AvatarDef {
  id: number;
  name: string;
  body: string;
  shade: string;
  accessory: AccessoryId;
  accent: string;
  image?: string;
}

const HASHED_AVATAR_COUNT = 12;

export const AVATARS: AvatarDef[] = [
  { id: 0, name: "Scarlet", body: "#ff3b5c", shade: "#c01c3a", accessory: "none", accent: "#ffd1da" },
  { id: 1, name: "Cyanide", body: "#22d3ee", shade: "#0e8ca6", accessory: "antenna", accent: "#c8f6ff" },
  { id: 2, name: "Bumble", body: "#fbbf24", shade: "#c08706", accessory: "cap", accent: "#fff0c2" },
  { id: 3, name: "Mint", body: "#34d399", shade: "#12876a", accessory: "leaf", accent: "#ccfbe9" },
  { id: 4, name: "Royal", body: "#a78bfa", shade: "#6d4fd1", accessory: "crown", accent: "#e6ddff" },
  { id: 5, name: "Ember", body: "#fb7185", shade: "#c03a52", accessory: "flame", accent: "#ffdbe2" },
  { id: 6, name: "Abyss", body: "#3b4a7a", shade: "#1e2647", accessory: "horns", accent: "#c3cdf0" },
  { id: 7, name: "Frost", body: "#e2e8f0", shade: "#a3adbd", accessory: "halo", accent: "#ffffff" },
  { id: 8, name: "Volt", body: "#a3e635", shade: "#6ba013", accessory: "bolt", accent: "#eaffc4" },
  { id: 9, name: "Dusk", body: "#f472b6", shade: "#b83e84", accessory: "headphones", accent: "#ffd9ee" },
  { id: 10, name: "Rust", body: "#fb923c", shade: "#c05e12", accessory: "bandage", accent: "#ffe2c7" },
  { id: 11, name: "Shadow", body: "#4b5563", shade: "#242a34", accessory: "visorshade", accent: "#cbd2dd" },
  { id: 12, name: "Photo 1", body: "#e879f9", shade: "#a21caf", accessory: "none", accent: "#fae8ff", image: "./avatars/crew-12.jpg" },
  { id: 13, name: "Photo 2", body: "#60a5fa", shade: "#1d4ed8", accessory: "none", accent: "#dbeafe", image: "./avatars/crew-13.jpg" },
  { id: 14, name: "Photo 3", body: "#fb7185", shade: "#be123c", accessory: "none", accent: "#ffe4e6", image: "./avatars/crew-14.jpg" },
  { id: 15, name: "Photo 4", body: "#facc15", shade: "#a16207", accessory: "none", accent: "#fef9c3", image: "./avatars/crew-15.png" },
];

export function avatarById(id: number): AvatarDef {
  return AVATARS[((id % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

/** Stable fallback so a player always has a face even before they pick one. */
export function hashToAvatar(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % HASHED_AVATAR_COUNT;
}

/* ------------------------- persistence (per name) ------------------------ */

const KEY = "nightfall.avatars.v1";

export function loadAvatarMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveAvatarMap(map: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

/** Remembered choice wins; otherwise a stable hash of the name. */
export function avatarFor(name: string, map: Record<string, number>): number {
  const key = name.trim().toLowerCase();
  return map[key] ?? hashToAvatar(key);
}

export function setAvatarFor(name: string, id: number, map: Record<string, number>) {
  const next = { ...map, [name.trim().toLowerCase()]: id };
  saveAvatarMap(next);
  return next;
}
