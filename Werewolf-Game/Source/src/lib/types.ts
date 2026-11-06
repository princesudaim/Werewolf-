export type RoleId = "imposter" | "doctor" | "detective" | "sheriff" | "crew";

export type Phase =
  | "start"
  | "lobby"
  | "settings"
  | "reveal"
  | "night"
  | "report"
  | "day"
  | "eject"
  | "over";

export interface Player {
  id: number;
  name: string;
  role: RoleId;
  alive: boolean;
}

export interface Settings {
  imposterCount: number;
  /** how many of each town power to deal */
  doctorCount: number;
  detectiveCount: number;
  sheriffCount: number;
  /** % chance each individual slot of that role actually spawns (0–100) */
  doctorChance: number;
  detectiveChance: number;
  sheriffChance: number;
  /** "one" = one bullet per game, "night" = one bullet per night */
  sheriffShots: "one" | "night";
  doctorSelfHeal: boolean;
  /** true = self-heal only once per game; false = unlimited */
  doctorSelfHealOnce: boolean;
  /** 2nd imposter sees 1st imposter's mark */
  /** Imposters learn each other's identity on their role card */
  imposterSeesPartner: boolean;
  /** 2nd Imposter sees 1st Imposter's mark. OFF = pure luck, they coordinate blind. */
  revealPartnerChoice: boolean;
  /** every night turn looks byte-for-byte identical — no role name, icon or colour */
  stealthTurns: boolean;
  /** anonymous investigation verdict is printed in the morning report */
  publishInvestigation: boolean;
  revealRoleOnEject: boolean;
  revealRoleOnDeath: boolean;
  daySeconds: number;
  sound: boolean;
  /** master volume 0–1 */
  volume: number;
  haptics: boolean;
}

export type DeathCause = "mafia" | "sheriff" | "guilt" | "ejected";

export interface DeathInfo {
  playerId: number;
  cause: DeathCause;
}

export interface GameEvent {
  round: number;
  type:
    | "mafia-kill"
    | "save"
    | "fiftyfifty"
    | "check-imposter"
    | "check-innocent"
    | "shot-imposter"
    | "guilt"
    | "shot"
    | "good-read"
    | "eject-imposter"
    | "eject-town"
    | "skip";
  actor?: number;
  target?: number;
  data?: Record<string, unknown>;
}

export interface NightState {
  impVotes: { actorId: number; targetId: number }[];
  doctorSaves: { actorId: number; targetId: number }[];
  detectiveChecks: { actorId: number; targetId: number; result: "IMPOSTER" | "INNOCENT" }[];
  sheriffShots: { actorId: number; targetId: number | null }[];
  /** private hunches from crewmates (and out-of-ammo sheriffs) — pure cover, scored at the end */
  suspicions: { actorId: number; targetId: number }[];
}

export interface ScoreRow {
  player: Player;
  score: number;
  badges: string[];
}

export interface HighScore {
  name: string;
  role: RoleId;
  result: "WIN" | "LOSS";
  score: number;
  date: string;
}

/** What the player actually does on their turn. Crewmates get "suspect" as cover. */
export type NightMode = "kill" | "heal" | "inspect" | "shoot" | "suspect";

export interface QueueActor {
  playerId: number;
  role: RoleId;
  mode: NightMode;
  /** neutral label shown on the pass screen — never leaks the role */
  label: string;
  /** index among same-role actors, e.g. imposter #2 sees partner's mark */
  roleIndex: number;
  roleTotal: number;
}
