import {
  ArrowRight,
  Ban,
  EyeOff,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldQuestion,
  Siren,
  Skull,
  Sun,
  Unlock,
  VenetianMask,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import { ROLE_META } from "../lib/engine";
import { burstAtEl, shake, vibrate } from "../lib/fx";
import type { Player, Settings } from "../lib/types";
import { Avatar, Btn, Card, PlayerTile, RoleIcon, TimerRing, TopBar } from "./ui";
import { cn } from "../utils/cn";

export default function DayScreen({
  players,
  settings,
  round,
  paused,
  onVerdict,
}: {
  players: Player[];
  settings: Settings;
  round: number;
  paused: boolean;
  onVerdict: (ejectId: number | null) => void;
}) {
  const total = settings.daySeconds;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(true);
  const [hostUnlocked, setHostUnlocked] = useState(false);
  const [ejectPick, setEjectPick] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const lastTick = useRef(-1);
  const ejectRef = useRef<HTMLButtonElement | null>(null);

  const alive = players.filter((p) => p.alive);
  const impostersAlive = alive.filter((p) => p.role === "imposter").length;
  const danger = left <= 20 && left > 0;

  useEffect(() => {
    if (!running || paused) return;
    const iv = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(iv);
  }, [running, paused]);

  useEffect(() => {
    if (left <= 10 && left > 0 && lastTick.current !== left) {
      lastTick.current = left;
      sfx.tick();
    }
    if (left === 0) {
      sfx.alarm();
      vibrate([120, 80, 120], settings.haptics);
      setRunning(false);
      setHostUnlocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const unlockHost = () => {
    if (hostUnlocked) {
      setHostUnlocked(false);
      setEjectPick(null);
      setConfirming(false);
      return;
    }
    if (!confirming) {
      sfx.click();
      setConfirming(true);
      return;
    }
    sfx.confirm();
    setHostUnlocked(true);
    setConfirming(false);
  };

  const castVerdict = () => {
    if (ejectPick === null) return;
    sfx.eject();
    shake(11, 420);
    vibrate([90, 60, 90], settings.haptics);
    burstAtEl(ejectRef.current, { colors: ["#ff2d55", "#a78bfa", "#f4f1ff"], count: 40, power: 460 });
    setTimeout(() => onVerdict(ejectPick), 550);
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col pb-6">
      <TopBar title={`DAY ${round} · THE COURT`} />
      <div className="flex-1 overflow-y-auto px-5 pt-2">
        <div className="anim-fade-up flex flex-col items-center text-center">
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-1.5 hairline">
            <VenetianMask size={13} className="text-blood" />
            <span className="text-[11px] font-bold tracking-[0.14em] text-dim">
              {impostersAlive} IMPOSTER{impostersAlive > 1 ? "S" : ""} AMONG {alive.length} SOULS
            </span>
          </div>

          <div className="mt-6">
            <TimerRing seconds={left} total={total} danger={danger} />
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                setRunning((r) => !r);
              }}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? "PAUSE" : "RESUME"}
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                sfx.flip();
                setLeft(total);
                setRunning(true);
              }}
            >
              <RotateCcw size={14} /> RESET
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                sfx.pop();
                setLeft((l) => Math.min(total, l + 30));
              }}
            >
              +0:30
            </Btn>
          </div>
        </div>

        {/* alive roster */}
        <div className="anim-fade-up mx-auto mt-6 max-w-[360px]" style={{ animationDelay: "0.12s" }}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Sun size={13} className="text-amber-neon" />
            <span className="font-display text-[10px] font-bold tracking-[0.34em] text-dim">STILL BREATHING</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {alive.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.03] px-3 py-2 hairline">
                <Avatar name={p.name} size={30} />
                <span className="truncate text-xs font-bold">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* host verdict */}
        <Card className="anim-fade-up mx-auto mt-6 max-w-[360px] p-4" >
          {!hostUnlocked ? (
            <button
              onClick={unlockHost}
              className="btn-press flex w-full items-center gap-3.5 rounded-2xl text-left"
            >
              <div
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors",
                  confirming ? "bg-amber-neon/20 text-amber-neon" : "bg-white/[0.05] text-dim"
                )}
              >
                {confirming ? <ShieldQuestion size={22} /> : <Lock size={20} />}
              </div>
              <div className="flex-1">
                <div className="font-display text-xs font-black tracking-[0.18em]">
                  {confirming ? "CONFIRM: YOU'RE THE HOST?" : "HOST VERDICT PANEL"}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-dim">
                  {confirming
                    ? "Tap again to unlock the eject controls. No peeking, players."
                    : left === 0
                    ? "Time's up — unlock to cast the verdict."
                    : "Locked until the Host takes the phone."}
                </p>
              </div>
              <div className={cn("text-[10px] font-black tracking-widest", confirming ? "text-amber-neon" : "text-dim/60")}>
                {confirming ? "TAP 2/2" : "TAP 1/2"}
              </div>
            </button>
          ) : (
            <div className="anim-fade-up">
              <div className="flex items-center gap-3 px-1 pb-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blood/15 text-blood">
                  <Unlock size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-xs font-black tracking-[0.18em]">HOST — CAST THE VERDICT</div>
                  <p className="text-[10.5px] text-dim">Pick who the town ejects, or skip and risk the night.</p>
                </div>
                <Siren size={16} className={cn("text-blood", left === 0 && "anim-blink")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {alive.map((p) => (
                  <PlayerTile
                    key={p.id}
                    name={p.name}
                    selected={ejectPick === p.id}
                    accent="#ff2d55"
                    onClick={() => setEjectPick(p.id)}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Btn
                  ref={ejectRef}
                  variant="danger"
                  disabled={ejectPick === null}
                  onClick={castVerdict}
                  data-primary
                >
                  <Skull size={15} />
                  EJECT {ejectPick !== null ? players.find((p) => p.id === ejectPick)?.name.toUpperCase() : "—"}
                </Btn>
                <Btn variant="ghost" onClick={() => { sfx.flip(); onVerdict(null); }}>
                  <Ban size={15} /> SKIP VOTE
                </Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================ EJECTION SCREEN ========================== */

export function EjectScreen({
  player,
  reveal,
  round,
  onContinue,
}: {
  player: Player;
  reveal: boolean;
  round: number;
  onContinue: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center overflow-hidden px-6 pb-8 text-center">
      <div className="font-display text-[10px] font-bold tracking-[0.5em] text-dim">DAY {round} · VERDICT DELIVERED</div>

      <div className="anim-eject relative mt-10" style={{ animationDelay: "0.9s" }}>
        <Card className="flex w-[240px] flex-col items-center p-6" >
          <Avatar name={player.name} size={86} />
          <div className="font-display mt-4 text-2xl font-black tracking-wide">{player.name.toUpperCase()}</div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.34em] text-dim">HAS BEEN EJECTED</div>
        </Card>
        <div className="absolute -top-3 -right-3 rotate-12 rounded-xl bg-blood px-3 py-1.5 font-display text-[10px] font-black tracking-[0.2em] text-white shadow-[0_0_24px_rgba(255,45,85,0.8)]">
          GONE
        </div>
      </div>

      <div className="anim-fade-up mt-44" style={{ animationDelay: "1.6s" }}>
        {reveal ? (
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold tracking-[0.4em] text-dim">THEIR TRUE ROLE WAS</div>
            <div
              className="anim-stamp font-display mt-2.5 flex items-center gap-2.5 rounded-2xl border-[3px] px-7 py-2.5 text-2xl font-black tracking-wide"
              style={{
                color: ROLE_META[player.role].color,
                borderColor: ROLE_META[player.role].color,
                textShadow: `0 0 26px ${ROLE_META[player.role].color}99`,
                animationDelay: "2s",
              }}
            >
              <RoleIcon role={player.role} size={22} />
              {ROLE_META[player.role].name.toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-5 py-3 hairline">
            <EyeOff size={16} className="text-dim" />
            <span className="text-xs font-bold tracking-[0.18em] text-dim">THEIR ROLE REMAINS UNKNOWN</span>
          </div>
        )}
      </div>

      <div className="anim-fade-up mt-10 w-full max-w-xs" style={{ animationDelay: "2.4s" }}>
        <Btn size="lg" block data-primary onClick={onContinue}>
          <ArrowRight size={17} /> FACE THE NIGHT
        </Btn>
      </div>
    </div>
  );
}
