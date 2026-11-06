import {
  ArrowRight,
  Brain,
  CheckCheck,
  Coins,
  Crosshair,
  MousePointerClick,
  Fingerprint,
  Ghost,
  HeartCrack,
  Moon,
  ShieldCheck,
  Skull,
  Stethoscope,
  Sunrise,
  VenetianMask,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { canTarget, nightTurnOrder, ROLE_META } from "../lib/engine";
import { burstAtEl, shake, vibrate } from "../lib/fx";
import type { DeathInfo, NightState, Player, QueueActor, Settings } from "../lib/types";
import { Avatar, Btn, Card, PassScreen, PlayerTile, RoleIcon, TopBar } from "./ui";

/* ============================== NIGHT FLOW ============================= */

export default function NightScreen({
  players,
  settings,
  round,
  selfHealUsed,
  shotsUsed,
  onComplete,
}: {
  players: Player[];
  settings: Settings;
  round: number;
  selfHealUsed: number[];
  shotsUsed: Record<number, number>;
  onComplete: (n: NightState) => void;
}) {
  const queue: QueueActor[] = useMemo(
    () => nightTurnOrder(players, settings, shotsUsed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [stage, setStage] = useState<"intro" | "pass" | "action">("intro");
  const [qi, setQi] = useState(0);
  const [night, setNight] = useState<NightState>({
    impVotes: [],
    doctorSaves: [],
    detectiveChecks: [],
    sheriffShots: [],
    suspicions: [],
  });
  const [selected, setSelected] = useState<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const actor = queue[qi];
  const actorPlayer = actor ? players.find((p) => p.id === actor.playerId)! : null;

  const partnerMark =
    actor?.mode === "kill" && night.impVotes.length > 0 && settings.revealPartnerChoice
      ? players.find((p) => p.id === night.impVotes[0].targetId)
      : null;

  const nextActor = (updated: NightState) => {
    setSelected(null);
    if (qi + 1 >= queue.length) {
      onComplete(updated);
    } else {
      setNight(updated);
      setQi(qi + 1);
      setStage("pass");
    }
  };

  const confirm = () => {
    if (!actor || !actorPlayer) return;
    // Every turn uses the SAME sound, shake and haptic — listeners can never
    // tell a kill from a heal from a crewmate's hunch.
    const feedback = () => {
      sfx.confirm();
      shake(7, 300);
      vibrate(45, settings.haptics);
    };

    if (actor.mode === "kill" && selected !== null) {
      feedback();
      nextActor({
        ...night,
        impVotes: [...night.impVotes, { actorId: actor.playerId, targetId: selected }],
      });
    } else if (actor.mode === "heal" && selected !== null) {
      feedback();
      nextActor({
        ...night,
        doctorSaves: [...night.doctorSaves, { actorId: actor.playerId, targetId: selected }],
      });
    } else if (actor.mode === "suspect" && selected !== null) {
      feedback();
      nextActor({
        ...night,
        suspicions: [...night.suspicions, { actorId: actor.playerId, targetId: selected }],
      });
    } else if (actor.mode === "inspect" && selected !== null) {
      const target = players.find((p) => p.id === selected)!;
      feedback();
      nextActor({
        ...night,
        detectiveChecks: [
          ...night.detectiveChecks,
          {
            actorId: actor.playerId,
            targetId: selected,
            result: target.role === "imposter" ? "IMPOSTER" : "INNOCENT",
          },
        ],
      });
    } else if (actor.mode === "shoot") {
      feedback();
      if (selected !== null) {
        burstAtEl(confirmRef.current, { colors: ["#fbbf24", "#ff2d55", "#f4f1ff"], count: 34, power: 420 });
      }
      nextActor({
        ...night,
        sheriffShots: [...night.sheriffShots, { actorId: actor.playerId, targetId: selected }],
      });
    }
  };

  /* ------------------------------- INTRO ------------------------------- */
  if (stage === "intro") {
    return (
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="anim-card-in flex flex-col items-center">
            <div
              className="anim-pulse-glow grid h-24 w-24 place-items-center rounded-full text-cyan-neon"
              style={{ background: "rgba(34,211,238,0.08)", color: "#7dd3fc" }}
            >
              <Moon size={44} />
            </div>
            <div className="font-display mt-8 text-[10px] font-bold tracking-[0.5em] text-dim">NIGHTFALL CITY</div>
            <h2 className="font-display mt-2 text-5xl font-black tracking-tight" style={{ textShadow: "0 0 40px rgba(125,211,252,0.5)" }}>
              NIGHT {round}
            </h2>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-dim">
              No moderator. No eyes closed. The phone visits{" "}
              <span className="font-bold text-ink">every single player</span> in a random order — so who holds
              it tells you nothing.
            </p>
            <Btn
              size="lg"
              block
              data-primary
              className="mt-10 min-w-[240px]"
              onClick={() => {
                sfx.flip();
                if (queue.length === 0)
                  onComplete({ impVotes: [], doctorSaves: [], detectiveChecks: [], sheriffShots: [], suspicions: [] });
                else setStage("pass");
              }}
            >
              {queue.length > 0 ? "CUE THE NIGHT" : "SKIP TO MORNING"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- PASS -------------------------------- */
  /* Fully neutral: same wording, same colour, no role hints. Everyone gets one. */
  if (stage === "pass" && actor && actorPlayer) {
    return (
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
        <PassScreen
          eyebrow={actor.label}
          name={actorPlayer.name}
          sub="Your turn. Take the phone, make your move, and pass it on like nothing happened."
          actionLabel="MY TURN"
          onReady={() => setStage("action")}
        />
        <div className="pb-6 text-center text-[10px] font-bold tracking-[0.3em] text-dim/60">
          TURN {qi + 1} OF {queue.length}
        </div>
      </div>
    );
  }

  if (!actor || !actorPlayer) return null;
  const accent = ROLE_META[actor.role].color;

  /* --------------------------- TARGET LISTS ---------------------------- */
  /* EVERY player sees EVERY living player — identical tile count for all roles,
     so nobody can infer a role by counting names on screen. Illegal targets
     (yourself, your own partner) simply refuse to select, with no visual tell. */
  const targets: Player[] = players.filter((p) => p.alive);

  const doctorSelfBlocked =
    actor.mode === "heal" &&
    (!settings.doctorSelfHeal ||
      (settings.doctorSelfHealOnce && selfHealUsed.includes(actor.playerId)) ||
      night.doctorSaves.some((s) => s.actorId === actor.playerId && s.targetId === actor.playerId));

  const stealth = settings.stealthTurns;
  // In stealth mode NOTHING on screen hints at the role: same icon, same colour,
  // same words, same buttons — a phone lying on the table reveals nothing.
  const uiAccent = stealth ? "#f4f1ff" : accent;

  const header = (icon: React.ReactNode, title: string, sub: string) => (
    <div className="anim-fade-up text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-3xl"
        style={{
          background: stealth ? "rgba(244,241,255,0.06)" : `${accent}1a`,
          color: uiAccent,
          boxShadow: stealth ? "none" : `0 0 36px -8px ${accent}`,
        }}
      >
        {icon}
      </div>
      <div className="font-display mt-4 text-[9px] font-bold tracking-[0.4em] text-dim">{actor.label}</div>
      <h2 className="font-display mt-1.5 text-2xl font-black tracking-wide" style={{ color: uiAccent }}>
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[280px] text-xs leading-relaxed text-dim">{sub}</p>
    </div>
  );

  /* ------------------------------ ACTIONS ------------------------------ */
  const actionMeta: Record<string, { title: string; sub: string; icon: React.ReactNode; cta: string }> = {
    kill: {
      title: "MARK YOUR TARGET",
      sub:
        partnerMark
          ? "Your partner already marked someone. Match it for a guaranteed hit — split it and fate flips a coin."
          : actor.roleTotal > 1
          ? "You choose blind — your partner can't see this. Same mark = certain kill, different marks = 50/50."
          : "You hunt solo tonight. Your mark is guaranteed.",
      icon: <VenetianMask size={30} />,
      cta: "MARK",
    },
    heal: {
      title: "ADMINISTER ANTIDOTE",
      sub: doctorSelfBlocked
        ? "Self-heal is spent or disabled. Shield someone else."
        : "Pick one patient — yourself included. If the syndicate marks them, they live.",
      icon: <Stethoscope size={30} />,
      cta: "SHIELD",
    },
    inspect: {
      title: "RUN THE CHECK",
      sub: "Point the bureau at one suspect. The answer is instant — and only yours.",
      icon: <Fingerprint size={30} />,
      cta: "INSPECT",
    },
    shoot: {
      title: "ONE SHOT.",
      sub: "Hit an imposter — they die tonight. Hit an innocent — the guilt kills YOU instead. Holstering is free.",
      icon: <Crosshair size={30} />,
      cta: "FIRE",
    },
    suspect: {
      title: "LOG YOUR HUNCH",
      sub:
        actor.role === "sheriff"
          ? "Your gun is empty tonight. Log a private suspicion instead — nail it and you score at the end."
          : "No powers, just instincts. Privately name who you think is rotten — nobody sees this, but a correct read scores at the end.",
      icon: <Brain size={30} />,
      cta: "SUSPECT",
    },
  };
  const am = stealth
    ? {
        title: "MAKE YOUR MOVE",
        sub: "Tap one name and confirm. Nobody sees your screen, your choice, or how long you took.",
        icon: <MousePointerClick size={30} />,
        cta: "CONFIRM",
      }
    : actionMeta[actor.mode];

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col pb-6">
      <TopBar title={`NIGHT ${round}`} />
      <div className="flex-1 overflow-y-auto px-5 pt-2">
        {header(am.icon, am.title, am.sub)}

        {/* partner intel */}
        {!stealth && actor.mode === "kill" && partnerMark && (
          <div className="anim-fade-up mx-auto mt-4 flex max-w-[320px] items-center gap-3 rounded-2xl border border-blood/40 bg-blood/[0.08] px-4 py-3" style={{ animationDelay: "0.15s" }}>
            <Skull size={17} className="shrink-0 text-blood" />
            <div className="text-xs leading-snug">
              <span className="font-bold text-blood">PARTNER'S MARK: </span>
              <span className="font-black tracking-wide">{partnerMark.name.toUpperCase()}</span>
              <div className="mt-0.5 text-[10px] text-dim">match it for 100% · differ for the 50/50</div>
            </div>
            <Coins size={16} className="ml-auto shrink-0 text-amber-neon/70" />
          </div>
        )}

        <div className="anim-fade-up mx-auto mt-5 grid max-w-[360px] grid-cols-2 gap-2" style={{ animationDelay: "0.2s" }}>
          {targets.map((t) => {
            const allowed = canTarget(actor, t, players, { doctorSelfBlocked });
            return (
              <PlayerTile
                key={t.id}
                name={t.name}
                selected={selected === t.id}
                accent={uiAccent}
                onClick={() => {
                  if (allowed) setSelected(t.id);
                  else {
                    // silent refusal — same for an imposter tapping a partner as
                    // for a doctor whose self-heal is spent. No label, no tell.
                    setSelected(null);
                    vibrate(18, settings.haptics);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5 px-5 pt-4">
        <Btn
          size="lg"
          block
          data-primary
          ref={confirmRef}
          disabled={selected === null}
          onClick={confirm}
        >
          <CheckCheck size={17} />
          {stealth
            ? "CONFIRM"
            : selected === null
            ? "PICK A NAME"
            : `${am.cta} ${players.find((p) => p.id === selected)?.name.toUpperCase()}`}
        </Btn>
        {/* identical secondary action for EVERY role so turn shapes never differ */}
        <Btn
          variant="ghost"
          block
          onClick={() => {
            sfx.confirm();
            vibrate(45, settings.haptics);
            nextActor(
              actor.mode === "shoot"
                ? { ...night, sheriffShots: [...night.sheriffShots, { actorId: actor.playerId, targetId: null }] }
                : night
            );
          }}
        >
          NO ACTION TONIGHT
        </Btn>
        <p className="text-center text-[10px] tracking-[0.24em] text-dim/60">
          SELECTION IS FINAL — THEN PASS THE PHONE ON
        </p>
      </div>
    </div>
  );
}

/* ============================ MORNING REPORT =========================== */

export function ReportScreen({
  players,
  deaths,
  round,
  settings,
  hadFiftyFifty,
  verdicts,
  onContinue,
}: {
  players: Player[];
  deaths: DeathInfo[];
  round: number;
  settings: Settings;
  hadFiftyFifty: boolean;
  verdicts: ("IMPOSTER" | "INNOCENT")[];
  onContinue: () => void;
}) {
  /* Causes are only spelled out when the host allows role reveals — otherwise a
     "sheriff's bullet" headline would out the sheriff for free. */
  const detailed = {
    mafia: { icon: <Skull size={15} />, label: "MARKED BY THE SYNDICATE", color: "#ff2d55" },
    sheriff: { icon: <Crosshair size={15} />, label: "TOOK THE SHERIFF'S BULLET", color: "#fbbf24" },
    guilt: { icon: <HeartCrack size={15} />, label: "DIED OF GUILT — MISFIRE", color: "#fbbf24" },
    ejected: { icon: <Ghost size={15} />, label: "EJECTED BY THE TOWN", color: "#a78bfa" },
  } as const;
  const vague = {
    icon: <Skull size={15} />,
    label: "FOUND DEAD AT DAWN",
    color: "#ff2d55",
  } as const;
  const causeMeta = settings.revealRoleOnDeath ? detailed : { mafia: vague, sheriff: vague, guilt: vague, ejected: vague };

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center pt-10">
        <div className="anim-card-in flex w-full flex-col items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full text-amber-neon" style={{ background: "rgba(251,191,36,0.08)", boxShadow: "0 0 44px -8px rgba(251,191,36,0.5)" }}>
            <Sunrise size={38} />
          </div>
          <div className="font-display mt-6 text-[10px] font-bold tracking-[0.5em] text-dim">NIGHT {round} · CASE FILE</div>
          <h2 className="font-display mt-2 text-4xl font-black tracking-tight">MORNING REPORT</h2>

          <div className="mt-7 w-full max-w-[340px] space-y-2.5">
            {deaths.length === 0 ? (
              <Card className="anim-fade-up flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-neon/10 text-emerald-neon">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <div className="font-display text-sm font-black tracking-wide text-emerald-neon">NO CASUALTIES</div>
                  <p className="mt-1 text-xs leading-snug text-dim">
                    Nobody died tonight. The town sleeps easy… for now. Someone, somewhere, got very lucky.
                  </p>
                </div>
              </Card>
            ) : (
              deaths.map((d, i) => {
                const victim = players.find((p) => p.id === d.playerId);
                if (!victim) return null;
                const cm = causeMeta[d.cause];
                return (
                  <div key={d.playerId} className="anim-fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
                    <Card className="flex items-center gap-4 p-4">
                      <Avatar name={victim.name} size={52} dead />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-display text-base font-black">{victim.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em]" style={{ color: cm.color }}>
                          {cm.icon} {cm.label}
                        </div>
                        <div className="mt-1 text-[11px] text-dim">
                          {settings.revealRoleOnDeath ? (
                            <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: ROLE_META[victim.role].color }}>
                              <RoleIcon role={victim.role} size={12} />
                              {ROLE_META[victim.role].name.toUpperCase()}
                            </span>
                          ) : (
                            "true role — classified"
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })
            )}

            {/* Anonymous investigation verdicts. The target is NEVER named, so only
                the detective who made the call can act on the result. */}
            {settings.publishInvestigation &&
              verdicts.map((v, i) => {
                const dirty = v === "IMPOSTER";
                return (
                  <div
                    key={`v${i}`}
                    className="anim-fade-up flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{
                      animationDelay: `${0.3 + i * 0.1}s`,
                      background: dirty ? "rgba(255,45,85,0.07)" : "rgba(52,211,153,0.06)",
                      border: `1px solid ${dirty ? "rgba(255,45,85,0.35)" : "rgba(52,211,153,0.3)"}`,
                    }}
                  >
                    <Fingerprint size={16} className="shrink-0" style={{ color: dirty ? "#ff2d55" : "#34d399" }} />
                    <div className="text-left">
                      <div
                        className="text-[10px] font-black tracking-[0.2em]"
                        style={{ color: dirty ? "#ff2d55" : "#34d399" }}
                      >
                        A CHECK CAME BACK {dirty ? "DIRTY" : "CLEAN"}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-dim">
                        {dirty
                          ? "Someone inspected an IMPOSTER last night — but only they know who."
                          : "Someone inspected an INNOCENT last night — but only they know who."}
                      </p>
                    </div>
                  </div>
                );
              })}

            {hadFiftyFifty && (
              <div className="anim-fade-up flex items-center gap-2.5 rounded-2xl border border-amber-neon/30 bg-amber-neon/[0.06] px-4 py-2.5" style={{ animationDelay: "0.4s" }}>
                <Coins size={15} className="shrink-0 text-amber-neon" />
                <p className="text-[11px] leading-snug text-dim">
                  The syndicate <span className="font-bold text-amber-neon">split their marks</span> — fate flipped a
                  coin in the dark.
                </p>
              </div>
            )}
          </div>

          <Btn size="lg" block data-primary className="mt-8 max-w-[340px]" onClick={onContinue}>
            <ArrowRight size={17} />
            GATHER THE TOWN
          </Btn>
        </div>
      </div>
    </div>
  );
}
