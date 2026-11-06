import { Crown, Home, Medal, RotateCcw, Skull, Trophy, Users, VenetianMask } from "lucide-react";
import { useEffect } from "react";
import { sfx } from "../lib/audio";
import { computeScores, ROLE_META } from "../lib/engine";
import { confetti } from "../lib/fx";
import type { GameEvent, HighScore, Player, Settings } from "../lib/types";
import { Avatar, Btn, Card, RoleIcon, SectionLabel } from "./ui";
import { cn } from "../utils/cn";

export default function GameOverScreen({
  players,
  events,
  winner,
  rounds,
  highs,
  settings,
  onRematch,
  onLobby,
  onMenu,
}: {
  players: Player[];
  events: GameEvent[];
  winner: "town" | "imposters";
  rounds: number;
  highs: HighScore[];
  settings: Settings;
  onRematch: () => void;
  onLobby: () => void;
  onMenu: () => void;
}) {
  const rows = computeScores(players, events, winner);
  const mvp = rows[0];
  const impWin = winner === "imposters";
  const accent = impWin ? "#ff2d55" : "#34d399";
  void settings;

  useEffect(() => {
    if (impWin) {
      sfx.lose();
      sfx.susReveal();
    }
    sfx.win();
    confetti(3200, impWin ? ["#ff2d55", "#a78bfa", "#f4f1ff"] : ["#34d399", "#22d3ee", "#fbbf24", "#f4f1ff"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      {/* banner */}
      <div className="anim-card-in flex flex-col items-center text-center">
        <div
          className="anim-pulse-glow grid h-24 w-24 place-items-center rounded-[1.8rem]"
          style={{ background: `${accent}1a`, color: accent, boxShadow: `0 0 60px -10px ${accent}` }}
        >
          {impWin ? <VenetianMask size={46} /> : <Trophy size={44} />}
        </div>
        <div className="font-display mt-6 text-[10px] font-bold tracking-[0.5em] text-dim">
          {rounds} NIGHT{rounds > 1 ? "S" : ""} · CASE CLOSED
        </div>
        <h1
          className="anim-stamp font-display mt-2 text-[34px] font-black leading-tight tracking-wide"
          style={{ color: accent, textShadow: `0 0 44px ${accent}aa` }}
        >
          {impWin ? "THE SYNDICATE\nTOOK THE CITY" : "THE TOWN\nSURVIVES"}
        </h1>
        <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-dim">
          {impWin
            ? "Parity achieved. The last honest lights of Nightfall flicker out — the masks own the streets now."
            : "Every imposter neutralized. The city breathes again — until the next round, anyway."}
        </p>
      </div>

      {/* MVP */}
      {mvp && (
        <Card className="anim-fade-up mt-8 p-4" >
          <div
            className="flex items-center gap-3.5 rounded-2xl p-2"
            style={{ background: "radial-gradient(circle at 20% 50%, rgba(251,191,36,0.14) 0%, transparent 70%)" }}
          >
            <div className="relative">
              <Avatar name={mvp.player.name} size={56} dead={!mvp.player.alive} />
              <Crown size={20} className="absolute -top-3 left-1/2 -translate-x-1/2 -rotate-12 text-amber-neon" />
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-black tracking-[0.34em] text-amber-neon">MVP OF THE MATCH</div>
              <div className="font-display text-lg font-black">{mvp.player.name}</div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: ROLE_META[mvp.player.role].color }}>
                <RoleIcon role={mvp.player.role} size={12} />
                {ROLE_META[mvp.player.role].name}
              </div>
            </div>
            <div className="pr-2 text-right">
              <div className="font-display text-2xl font-black text-amber-neon tabular-nums">{mvp.score}</div>
              <div className="text-[9px] font-bold tracking-[0.24em] text-dim">PTS</div>
            </div>
          </div>
        </Card>
      )}

      {/* scoreboard */}
      <section className="mt-7">
        <SectionLabel>FINAL SCOREBOARD</SectionLabel>
        <Card className="mt-3 divide-y divide-white/[0.05]">
          {rows.map((r, i) => {
            const wonTeam =
              (winner === "imposters" && r.player.role === "imposter") ||
              (winner === "town" && r.player.role !== "imposter");
            return (
              <div key={r.player.id} className="anim-fade-up flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                <span className="w-5 text-center font-display text-xs font-black text-dim">
                  {i === 0 ? <Medal size={15} className="text-amber-neon" /> : i + 1}
                </span>
                <Avatar name={r.player.name} size={36} dead={!r.player.alive} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("truncate text-sm font-bold", !r.player.alive && "text-dim line-through decoration-blood/70")}>
                      {r.player.name}
                    </span>
                    {!r.player.alive && <Skull size={11} className="shrink-0 text-blood/80" />}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[9px] font-bold tracking-wider"
                      style={{ color: ROLE_META[r.player.role].color, background: `${ROLE_META[r.player.role].color}16` }}
                    >
                      <RoleIcon role={r.player.role} size={10} />
                      {ROLE_META[r.player.role].name.toUpperCase()}
                    </span>
                    {r.badges.slice(0, 3).map((b) => (
                      <span key={b} className="rounded-md bg-white/[0.06] px-1.5 py-px text-[9px] font-bold tracking-wider text-dim">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("font-display text-base font-black tabular-nums", wonTeam ? "text-emerald-neon" : "text-dim")}>
                    {r.score}
                  </div>
                  <div className={cn("text-[8px] font-black tracking-[0.2em]", wonTeam ? "text-emerald-neon/80" : "text-dim/60")}>
                    {wonTeam ? "WIN" : "LOSS"}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      {/* high scores */}
      <section className="mt-7">
        <SectionLabel>HALL OF LEGENDS · THIS DEVICE</SectionLabel>
        <Card className="mt-3 p-2">
          {highs.slice(0, 5).map((h, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
              <span className="w-5 text-center font-display text-xs font-black text-dim">
                {i === 0 ? <Crown size={13} className="text-amber-neon" /> : i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-bold">{h.name}</span>
              <span className="text-[9px] font-bold tracking-widest text-dim/70">{h.date.slice(5)}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-widest",
                  h.result === "WIN" ? "bg-emerald-neon/15 text-emerald-neon" : "bg-blood/15 text-blood"
                )}
              >
                {h.result}
              </span>
              <span className="w-11 text-right font-display text-xs font-black text-amber-neon tabular-nums">{h.score}</span>
            </div>
          ))}
        </Card>
      </section>

      {/* actions */}
      <div className="mt-8 space-y-2.5">
        <Btn size="lg" block data-primary onClick={onRematch}>
          <RotateCcw size={18} /> RUN IT BACK — SAME CREW
        </Btn>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="ghost" onClick={onLobby}>
            <Users size={15} /> EDIT LOBBY
          </Btn>
          <Btn variant="ghost" onClick={onMenu}>
            <Home size={15} /> MAIN MENU
          </Btn>
        </div>
        <p className="pt-1 text-center text-[10px] tracking-[0.24em] text-dim/50">ROLES RESHUFFLE EVERY REMATCH</p>
      </div>
    </div>
  );
}
