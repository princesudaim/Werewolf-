import { BookOpen, Crown, Moon, Play, Settings2, Skull, Sun, Trophy, Users, Vote } from "lucide-react";
import { useState } from "react";
import { sfx } from "../lib/audio";
import { confetti } from "../lib/fx";
import { loadHighs } from "../lib/storage";
import { ROLE_META } from "../lib/engine";
import { Btn, Card, LogoMark, SectionLabel } from "./ui";
import { cn } from "../utils/cn";

function HowToPlay({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Users,
      color: "#a78bfa",
      title: "1 · GATHER & REVEAL",
      body: "4–12 players, one phone. Pass it around — everyone secretly views their role card, then hides it again.",
    },
    {
      icon: Moon,
      color: "#22d3ee",
      title: "2 · THE NIGHT ROUND",
      body: "No moderator, no eyes closed. The phone visits EVERY living player in random order — imposters mark a victim, the Doctor shields, the Detective investigates, the Sheriff may shoot, and Crewmates log a private hunch. Everyone taps a name, so who holds the phone tells you nothing.",
    },
    {
      icon: Sun,
      color: "#fbbf24",
      title: "3 · DAY COURT",
      body: "The dead are announced. Everyone argues for 2 minutes. Then the Host casts the verdict: eject a suspect, or skip and gamble on the night.",
    },
    {
      icon: Vote,
      color: "#34d399",
      title: "4 · WIN CONDITIONS",
      body: "Town wins by eliminating every imposter. Imposters win the moment they equal the remaining town — parity means takeover.",
    },
  ];
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050409]/85 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="mx-auto max-w-md py-10" onClick={(e) => e.stopPropagation()}>
        <Card className="anim-card-in p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blood/15 text-blood">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg font-black tracking-wide">FIELD MANUAL</h3>
              <p className="text-xs text-dim">Everything you need to survive.</p>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {steps.map((s) => (
              <div key={s.title} className="flex gap-3.5">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${s.color}1c`, color: s.color }}
                >
                  <s.icon size={19} />
                </div>
                <div>
                  <div className="font-display text-[11px] font-bold tracking-[0.2em]" style={{ color: s.color }}>
                    {s.title}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-dim">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SectionLabel>THE ROSTER</SectionLabel>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {(Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 hairline">
                  <span className="font-display text-[10px] font-bold tracking-[0.14em]" style={{ color: ROLE_META[r].color }}>
                    {ROLE_META[r].team}
                  </span>
                  <span className="text-sm font-bold">{ROLE_META[r].name}</span>
                  <span className="ml-auto text-[10px] tracking-[0.14em] text-dim">{ROLE_META[r].tagline}</span>
                </div>
              ))}
            </div>
          </div>
          <Btn block className="mt-6" data-primary onClick={onClose}>
            GOT IT
          </Btn>
        </Card>
      </div>
    </div>
  );
}

export default function StartScreen({
  onStart,
  onSettings,
}: {
  onStart: () => void;
  onSettings: () => void;
}) {
  const [manual, setManual] = useState(false);
  const highs = loadHighs();

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <div className="flex-1" />
      <div className="anim-card-in flex flex-col items-center text-center">
        <div className="relative">
          <div
            className="absolute -inset-14 rounded-full opacity-70 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,45,85,0.3) 0%, transparent 65%)" }}
          />
          <div className="anim-heartbeat relative">
            <LogoMark size={118} />
          </div>
        </div>

        <h1
          className="font-display anim-flicker mt-8 text-[42px] leading-none font-black tracking-[0.1em]"
          style={{ textShadow: "0 0 34px rgba(255,45,85,0.65), 0 0 90px rgba(255,45,85,0.35)" }}
        >
          NIGHTFALL
        </h1>
        <p className="mt-3 font-display text-[10px] font-bold tracking-[0.5em] text-dim">
          ONE PHONE · ZERO TRUST
        </p>
        <p className="mt-4 max-w-[290px] text-sm leading-relaxed text-dim">
          An offline pass-and-play mafia game. No moderator, no eyes closed — everyone takes a night turn, so
          nobody knows who is who.
        </p>

        <div className="mt-9 w-full space-y-3">
          <Btn
            size="lg"
            block
            data-primary
            className="anim-pulse-glow text-blood"
            onClick={() => {
              sfx.reveal();
              confetti(900, ["#ff2d55", "#fbbf24", "#f4f1ff"]);
              onStart();
            }}
          >
            <Play size={20} className="-ml-1" />
            START THE CHAOS
          </Btn>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => setManual(true)}>
              <BookOpen size={16} /> HOW TO PLAY
            </Btn>
            <Btn variant="ghost" onClick={onSettings}>
              <Settings2 size={16} /> SETTINGS
            </Btn>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <Card className="anim-fade-up mt-10 p-4" >
        <div className="flex items-center gap-2 px-1">
          <Trophy size={15} className="text-amber-neon" />
          <span className="font-display text-[10px] font-bold tracking-[0.34em] text-dim">HALL OF LEGENDS</span>
          <span className="ml-auto text-[10px] text-dim/70">local device</span>
        </div>
        {highs.length === 0 ? (
          <div className="flex items-center gap-3 px-2 pt-3 pb-1">
            <Skull size={18} className="shrink-0 text-dim/60" />
            <p className="text-xs leading-relaxed text-dim">
              No legends yet. The board resets never — play a match and carve your name in.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            {highs.slice(0, 5).map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2",
                  i === 0 && "bg-amber-neon/[0.07]"
                )}
              >
                <span className="w-5 text-center font-display text-xs font-black text-dim">
                  {i === 0 ? <Crown size={14} className="text-amber-neon" /> : i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-bold">{h.name}</span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-widest",
                    h.result === "WIN" ? "bg-emerald-neon/15 text-emerald-neon" : "bg-blood/15 text-blood"
                  )}
                >
                  {h.result}
                </span>
                <span className="w-12 text-right font-display text-xs font-bold text-amber-neon tabular-nums">
                  {h.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-6 text-center text-[10px] tracking-[0.2em] text-dim/50">
        FREE TO PLAY · NO PREMIUM · WORKS OFFLINE
      </p>

      {manual && <HowToPlay onClose={() => setManual(false)} />}
    </div>
  );
}
