import { defaultSettings } from "./engine";
import type { HighScore, RoleId, Settings } from "./types";

const SKEY = "nightfall.settings.v1";
const HKEY = "nightfall.highscores.v1";
const NKEY = "nightfall.names.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SKEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch {
    /* private mode — ignore */
  }
}

export function loadHighs(): HighScore[] {
  try {
    const raw = localStorage.getItem(HKEY);
    return raw ? (JSON.parse(raw) as HighScore[]) : [];
  } catch {
    return [];
  }
}

export function pushHighs(
  entries: { name: string; role: RoleId; result: "WIN" | "LOSS"; score: number }[]
): HighScore[] {
  const stamped: HighScore[] = entries.map((e) => ({
    ...e,
    date: new Date().toISOString().slice(0, 10),
  }));
  const merged = [...loadHighs(), ...stamped]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  try {
    localStorage.setItem(HKEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}

export function loadNames(): string[] {
  try {
    const raw = localStorage.getItem(NKEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveNames(names: string[]) {
  try {
    localStorage.setItem(NKEY, JSON.stringify(names.slice(0, 12)));
  } catch {
    /* ignore */
  }
}
