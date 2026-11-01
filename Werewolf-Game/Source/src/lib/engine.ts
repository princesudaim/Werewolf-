import type {
  DeathInfo,
  GameEvent,
  NightState,
  Player,
  QueueActor,
  RoleId,
  ScoreRow,
  Settings,
} from "./types";

export const ROLE_META: Record<
  RoleId,
  { name: string; plural: string; tagline: string; desc: string; color: string; team: "MAFIA" | "TOWN" }
> = {
  imposter: {
    name: "Imposter",
    plural: "Imposters",
    tagline: "KILL. DECEIVE. SURVIVE.",
    desc: "Each night, mark one townie for elimination. Win when imposters equal the town.",
    color: "#ff2d55",
    team: "MAFIA",
  },
  doctor: {
    name: "Doctor",
    plural: "Doctors",
    tagline: "ONE ANTIDOTE A NIGHT.",
    desc: "Each night, protect one player (maybe yourself). If the syndicate marks them, they survive.",
    color: "#34d399",
    team: "TOWN",
  },
  detective: {
    name: "Detective",
    plural: "Detectives",
    tagline: "READ THEM FILTHY.",
    desc: "Each night, inspect one player. The city tells you if they're an IMPOSTER or INNOCENT.",
    color: "#22d3ee",
    team: "TOWN",
  },
  sheriff: {
    name: "Sheriff",
    plural: "Sheriffs",
    tagline: "ONE SHOT. MAKE IT COUNT.",
    desc: "At night you may fire one bullet. Hit an imposter and they die — hit an innocent and you die of guilt.",
    color: "#fbbf24",
    team: "TOWN",
  },
  crew: {
    name: "Crewmate",
    plural: "Crewmates",
    tagline: "TRUST NO ONE.",
    desc: "No night powers — just your voice, your vote, and your survival instincts. Find the imposters.",
    color: "#a78bfa",
    team: "TOWN",
  },
};

export function defaultSettings(): Settings {
  return {
    imposterCount: 2,
    doctorCount: 1,
    detectiveCount: 1,
    sheriffCount: 1,
    doctorChance: 100,
    detectiveChance: 100,
    sheriffChance: 100,
    sheriffShots: "one",
    doctorSelfHeal: true,
    doctorSelfHealOnce: true,
    imposterSeesPartner: true,
    revealPartnerChoice: false,
    stealthTurns: true,
    publishInvestigation: true,
    revealRoleOnEject: false, // locked per your spec: "Their role remains unknown"
    revealRoleOnDeath: true,
    daySeconds: 120,
    sound: true,
    volume: 1,
    haptics: true,
  };
}

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

export function maxImposters(n: number): number {
  return Math.max(1, Math.min(3, Math.floor((n - 1) / 2)));
}

export function recommendedImposters(n: number): number {
  if (n <= 5) return 1;
  if (n <= 8) return 2;
  return 3;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Roll each configured slot of a role against its spawn chance. */
function rollCount(count: number, chancePct: number): number {
  let c = 0;
  for (let i = 0; i < count; i++) if (Math.random() * 100 < chancePct) c++;
  return c;
}

export const MAX_ROLE_COUNT = 4;

/** Town-power slots available after the syndicate is seated. */
export function townSlots(playerCount: number, s: Settings): number {
  return Math.max(0, playerCount - Math.min(s.imposterCount, maxImposters(playerCount)));
}

/**
 * Build the roster for N names and deal it.
 * Every configured role slot is honoured (capped only by the number of town seats),
 * so a 4-player game with 1 imposter + doctor + detective + sheriff leaves zero crewmates.
 */
export function assignRoles(names: string[], s: Settings): Player[] {
  const n = names.length;
  const imps = Math.min(s.imposterCount, maxImposters(n));
  const roles: RoleId[] = [];
  for (let i = 0; i < imps; i++) roles.push("imposter");

  let slots = n - imps;
  const specs: [RoleId, number, number][] = [
    ["doctor", s.doctorCount, s.doctorChance],
    ["detective", s.detectiveCount, s.detectiveChance],
    ["sheriff", s.sheriffCount, s.sheriffChance],
  ];
  // shuffle so that when seats are scarce it isn't always the doctor who wins the slot
  for (const [role, count, chance] of shuffle(specs)) {
    if (slots <= 0) break;
    const rolled = Math.min(rollCount(Math.max(0, count), chance), slots);
    for (let i = 0; i < rolled; i++) roles.push(role);
    slots -= rolled;
  }

  while (roles.length < n) roles.push("crew");
  const dealt = shuffle(roles.slice(0, n));
  return names.map((name, i) => ({ id: i, name, role: dealt[i], alive: true }));
}

/**
 * EVERY living player takes a turn at night — including Crewmates.
 * There is no moderator and no eyes-open/eyes-closed ritual: the phone visits
 * all players in a random order, so watching who receives it reveals nothing.
 * Crewmates (and sheriffs who are out of ammo) log a private "suspicion" as cover.
 *
 * Imposters keep their relative order so that agent #2 can see agent #1's mark.
 */
export function nightTurnOrder(
  players: Player[],
  s: Settings,
  shotsUsed: Record<number, number>
): QueueActor[] {
  const alive = shuffle(players.filter((p) => p.alive));

  const counters: Record<string, number> = {};
  const totals: Record<string, number> = {};
  for (const p of alive) totals[p.role] = (totals[p.role] ?? 0) + 1;

  const order = alive.map((p, i) => {
    const idx = counters[p.role] ?? 0;
    counters[p.role] = idx + 1;

    let mode: QueueActor["mode"] = "suspect";
    if (p.role === "imposter") mode = "kill";
    else if (p.role === "doctor") mode = "heal";
    else if (p.role === "detective") mode = "inspect";
    else if (p.role === "sheriff") {
      const canShoot = s.sheriffShots === "night" || (shotsUsed[p.id] ?? 0) < 1;
      mode = canShoot ? "shoot" : "suspect";
    }

    return {
      playerId: p.id,
      role: p.role,
      mode,
      // deliberately neutral — identical wording for every single player
      label: `NIGHT TURN ${i + 1} OF ${alive.length}`,
      roleIndex: idx,
      roleTotal: totals[p.role] ?? 1,
    } satisfies QueueActor;
  });

  // imposters must resolve in a stable order among themselves (agent 1 marks first)
  const impSeats = order.map((a, i) => (a.role === "imposter" ? i : -1)).filter((i) => i >= 0);
  impSeats.forEach((seat, n) => {
    order[seat] = { ...order[seat], roleIndex: n };
  });

  return order;
}

/**
 * Can this actor select this target?
 * EVERY player always sees the full list of living players, so the number of
 * tiles on screen never leaks a role. Restrictions are enforced silently —
 * a forbidden tile simply refuses to select instead of being greyed out.
 */
export function canTarget(
  actor: { playerId: number; mode: string },
  target: Player,
  players: Player[],
  opts: { doctorSelfBlocked?: boolean } = {}
): boolean {
  if (!target.alive) return false;
  const self = target.id === actor.playerId;
  const me = players.find((p) => p.id === actor.playerId);

  switch (actor.mode) {
    case "kill":
      // no self-kill, no killing your own syndicate
      return !self && target.role !== "imposter";
    case "inspect":
    case "shoot":
      // pointless to inspect/shoot yourself
      return !self;
    case "heal":
      // doctors may cover anyone, including themselves (subject to self-heal rules)
      return self ? !opts.doctorSelfBlocked : true;
    case "suspect":
      // crewmates may name literally anyone
      return true;
    default:
      void me;
      return true;
  }
}

export function checkWin(players: Player[]): "town" | "imposters" | null {
  const imps = players.filter((p) => p.alive && p.role === "imposter").length;
  const town = players.filter((p) => p.alive && p.role !== "imposter").length;
  if (imps === 0) return "town";
  if (imps >= town) return "imposters"; // parity = syndicate takeover
  return null;
}

/**
 * Resolve the night. Locked rules:
 * - 1 imposter vote  -> 100% execution
 * - 2 votes, same mark -> 100%
 * - 2 votes, different marks -> 50/50 coin flip between the two
 * - Doctor saving the final mark fully neutralizes the kill
 * - Sheriff bullet: imposter dies / innocent -> sheriff dies of guilt instead
 */
export function resolveNight(
  players: Player[],
  night: NightState,
  selfHealUsed: number[],
  round: number
): {
  players: Player[];
  deaths: DeathInfo[];
  events: GameEvent[];
  selfHealUsed: number[];
  winner: "town" | "imposters" | null;
} {
  const events: GameEvent[] = [];
  const deaths: DeathInfo[] = [];
  const killedIds = new Map<number, DeathInfo["cause"]>();
  const newSelfHealUsed = [...selfHealUsed];

  // ---- resolve the syndicate mark ----
  let finalMark: number | undefined;
  const votes = night.impVotes;
  if (votes.length === 1) {
    finalMark = votes[0].targetId;
  } else if (votes.length >= 2) {
    const [a, b] = votes;
    if (a.targetId === b.targetId) {
      finalMark = a.targetId;
    } else {
      finalMark = Math.random() < 0.5 ? a.targetId : b.targetId;
      events.push({
        round,
        type: "fiftyfifty",
        data: { options: [a.targetId, b.targetId], winner: finalMark },
      });
    }
  }

  // ---- doctors (any one of them covering the mark neutralizes it) ----
  for (const save of night.doctorSaves) {
    if (save.targetId === save.actorId && !newSelfHealUsed.includes(save.actorId)) {
      newSelfHealUsed.push(save.actorId);
    }
  }
  const savior =
    finalMark !== undefined ? night.doctorSaves.find((s) => s.targetId === finalMark) : undefined;

  if (finalMark !== undefined && !savior) {
    killedIds.set(finalMark, "mafia");
    events.push({
      round,
      type: "mafia-kill",
      target: finalMark,
      data: { voters: votes.map((v) => v.actorId) },
    });
  } else if (finalMark !== undefined && savior) {
    events.push({ round, type: "save", actor: savior.actorId, target: finalMark });
  }

  // ---- detectives (results already shown live; logged for scoring) ----
  for (const check of night.detectiveChecks) {
    events.push({
      round,
      type: check.result === "IMPOSTER" ? "check-imposter" : "check-innocent",
      actor: check.actorId,
      target: check.targetId,
    });
  }

  // ---- private suspicions (cover turns — no mechanical effect, scored later) ----
  for (const hunch of night.suspicions) {
    const target = players.find((p) => p.id === hunch.targetId);
    if (target?.role === "imposter") {
      events.push({ round, type: "good-read", actor: hunch.actorId, target: hunch.targetId });
    }
  }

  // ---- sheriffs ----
  for (const shot of night.sheriffShots) {
    if (shot.targetId === null) continue;
    const target = players.find((p) => p.id === shot.targetId);
    events.push({ round, type: "shot", actor: shot.actorId });
    if (target && target.role === "imposter") {
      killedIds.set(target.id, "sheriff");
      events.push({ round, type: "shot-imposter", actor: shot.actorId, target: target.id });
    } else if (target) {
      killedIds.set(shot.actorId, "guilt");
      events.push({ round, type: "guilt", actor: shot.actorId, target: target.id });
    }
  }

  const newPlayers = players.map((p) =>
    killedIds.has(p.id) ? { ...p, alive: false } : p
  );
  for (const [playerId, cause] of killedIds) deaths.push({ playerId, cause });

  return {
    players: newPlayers,
    deaths,
    events,
    selfHealUsed: newSelfHealUsed,
    winner: checkWin(newPlayers),
  };
}

/** Day ejection + win re-check. */
export function resolveEject(
  players: Player[],
  ejectId: number,
  round: number
): { players: Player[]; events: GameEvent[]; winner: "town" | "imposters" | null } {
  const target = players.find((p) => p.id === ejectId);
  const events: GameEvent[] = [];
  const newPlayers = players.map((p) => (p.id === ejectId ? { ...p, alive: false } : p));
  if (target?.role === "imposter") {
    events.push({
      round,
      type: "eject-imposter",
      target: ejectId,
      data: { aliveTown: newPlayers.filter((p) => p.alive && p.role !== "imposter").map((p) => p.id) },
    });
  } else {
    events.push({ round, type: "eject-town", target: ejectId });
  }
  return { players: newPlayers, events, winner: checkWin(newPlayers) };
}

/* ------------------------------ scoring ------------------------------ */

const BADGE: Record<string, string> = {
  "mafia-kill": "Hit Confirmed",
  save: "Lifeline",
  "check-imposter": "Sleuth",
  "shot-imposter": "Deadeye",
  "good-read": "Good Read",
  survivor: "Last Breath",
  winner: "Champion",
};

export function computeScores(
  players: Player[],
  events: GameEvent[],
  winner: "town" | "imposters"
): ScoreRow[] {
  const rows = new Map<number, ScoreRow>();
  players.forEach((p) => rows.set(p.id, { player: p, score: 0, badges: [] }));
  const add = (id: number, pts: number, badge?: string) => {
    const r = rows.get(id);
    if (!r) return;
    r.score += pts;
    if (badge && !r.badges.includes(badge)) r.badges.push(badge);
  };

  for (const ev of events) {
    switch (ev.type) {
      case "mafia-kill":
        ((ev.data?.voters as number[]) ?? []).forEach((id) => add(id, 100, BADGE["mafia-kill"]));
        break;
      case "save":
        if (ev.actor !== undefined) add(ev.actor, 150, BADGE.save);
        break;
      case "check-imposter":
        if (ev.actor !== undefined) add(ev.actor, 120, BADGE["check-imposter"]);
        break;
      case "shot-imposter":
        if (ev.actor !== undefined) add(ev.actor, 200, BADGE["shot-imposter"]);
        break;
      case "good-read":
        if (ev.actor !== undefined) add(ev.actor, 60, BADGE["good-read"]);
        break;
      case "guilt":
        if (ev.actor !== undefined) add(ev.actor, -100);
        break;
      case "eject-imposter":
        ((ev.data?.aliveTown as number[]) ?? []).forEach((id) => add(id, 25));
        break;
    }
  }

  players.forEach((p) => {
    const isWinnerTeam =
      (winner === "imposters" && p.role === "imposter") ||
      (winner === "town" && p.role !== "imposter");
    if (isWinnerTeam) add(p.id, p.alive ? 300 : 150, BADGE.winner);
    if (p.alive) add(p.id, 100, BADGE.survivor);
  });

  return [...rows.values()].sort((a, b) => b.score - a.score);
}
