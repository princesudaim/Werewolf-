import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  Crosshair,
  Fingerprint,
  Pause,
  Rocket,
  Skull,
  Stethoscope,
  VenetianMask,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { ROLE_META } from "../lib/engine";
import { sfx } from "../lib/audio";
import type { RoleId } from "../lib/types";
import { avatarFor, loadAvatarMap } from "../lib/avatars";
import { PlayerAvatar } from "./Avatar";
import { cn } from "../utils/cn";

/* ------------------------------- backdrop ------------------------------ */

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 backdrop-grid" />
      <div
        className="anim-floaty absolute -top-[20vh] -left-[18vw] h-[62vh] w-[62vw] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,45,85,0.16) 0%, transparent 62%)" }}
      />
      <div
        className="anim-floaty absolute top-[34vh] -right-[24vw] h-[70vh] w-[70vw] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.13) 0%, transparent 62%)", animationDelay: "-6s" }}
      />
      <div
        className="anim-floaty absolute -bottom-[26vh] left-[6vw] h-[56vh] w-[56vw] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 62%)", animationDelay: "-11s" }}
      />
      <div className="absolute inset-0 backdrop-noise" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 90% 70% at 50% 42%, transparent 40%, rgba(4,3,9,0.88) 100%)" }}
      />
    </div>
  );
}

/* --------------------------------- logo -------------------------------- */

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 4c-13.2 0-22 9.2-22 22.4 0 9.8 4.4 16.6 9.6 21.2 3.4 3 6.4 5.2 8 8.4.7 1.4 1.6 4 4.4 4s3.7-2.6 4.4-4c1.6-3.2 4.6-5.4 8-8.4 5.2-4.6 9.6-11.4 9.6-21.2C54 13.2 45.2 4 32 4Z"
        fill="#f4f1ff"
      />
      <path
        d="M12 26.5c6-3 12.2-2.2 16.8 1.2 1.5 1.1.5 3.8-1.4 3.6-5.6-.4-10.8-1.6-15.6-3.4-.6-.2-.7-1 .2-1.4Z"
        fill="#07060d"
      />
      <path
        d="M52 26.5c-6-3-12.2-2.2-16.8 1.2-1.5 1.1-.5 3.8 1.4 3.6 5.6-.4 10.8-1.6 15.6-3.4.6-.2.7-1-.2-1.4Z"
        fill="#07060d"
      />
      <path
        d="M10 25.6 C 20 20.5, 44 20.5, 54 25.6 L 52.4 29.4 C 42 24.6, 22 24.6, 11.6 29.4 Z"
        fill="#ff2d55"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <LogoMark size={compact ? 30 : 44} />
      <div className="leading-none">
        <div
          className={cn(
            "font-display font-black tracking-[0.18em] anim-flicker",
            compact ? "text-sm" : "text-xl"
          )}
          style={{ textShadow: "0 0 22px rgba(255,45,85,0.55)" }}
        >
          NIGHTFALL
        </div>
        {!compact && (
          <div className="mt-1 text-[10px] font-semibold tracking-[0.42em] text-dim">
            MAFIA · PASS & PLAY
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- buttons ------------------------------ */

type BtnVariant = "primary" | "ghost" | "danger" | "safe" | "outline";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  silent?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const btnStyles: Record<BtnVariant, string> = {
  primary:
    "bg-blood text-white shadow-[0_10px_36px_-8px_rgba(255,45,85,0.75)] hover:shadow-[0_14px_44px_-6px_rgba(255,45,85,0.9)]",
  ghost: "hairline bg-white/[0.04] text-ink hover:bg-white/[0.09]",
  outline: "border border-blood/60 text-blood hover:bg-blood/10",
  danger: "bg-[#2a0b14] text-blood hairline hover:bg-[#3a0f1c]",
  safe: "bg-emerald-neon/90 text-[#04120c] shadow-[0_10px_36px_-10px_rgba(52,211,153,0.8)] hover:shadow-[0_14px_44px_-8px_rgba(52,211,153,0.95)]",
};

export function Btn({
  variant = "primary",
  size = "md",
  block,
  silent,
  className,
  children,
  onClick,
  ref,
  ...rest
}: BtnProps) {
  return (
    <button
      ref={ref}
      {...rest}
      onClick={(e) => {
        if (!silent) sfx.click();
        onClick?.(e);
      }}
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 rounded-2xl font-bold tracking-wide disabled:pointer-events-none disabled:opacity-35",
        size === "sm" && "px-3.5 py-2 text-xs",
        size === "md" && "px-5 py-3 text-sm",
        size === "lg" && "px-6 py-4 text-base",
        block && "w-full",
        btnStyles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------------- card -------------------------------- */

export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={cn("glass rounded-3xl", className)} onClick={onClick}>
      {children}
    </div>
  );
}

/* -------------------------------- avatar ------------------------------- */

export function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Shared avatar. Looks up the player's chosen character (persisted per name)
 * and falls back to a stable hash so everyone always has a face.
 */
export function Avatar({
  name,
  size = 44,
  dead,
  className,
  avatarId,
}: {
  name: string;
  size?: number;
  dead?: boolean;
  className?: string;
  avatarId?: number;
}) {
  const id = avatarId ?? avatarFor(name || "?", loadAvatarMap());
  return <PlayerAvatar avatarId={id} size={size} dead={dead} className={className} />;
}

/* ------------------------------- role icon ----------------------------- */

export const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  imposter: VenetianMask,
  doctor: Stethoscope,
  detective: Fingerprint,
  sheriff: Crosshair,
  crew: Rocket,
};

export function RoleIcon({
  role,
  size = 22,
  className,
}: {
  role: RoleId;
  size?: number;
  className?: string;
}) {
  const Icon = ROLE_ICONS[role];
  return <Icon size={size} className={className} style={{ color: ROLE_META[role].color }} />;
}

/* -------------------------------- top bar ------------------------------ */

export function TopBar({
  title,
  onBack,
  onPause,
  showPause,
  right,
}: {
  title?: string;
  onBack?: () => void;
  onPause?: () => void;
  showPause?: boolean;
  right?: ReactNode;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-2 px-4 pt-4 pb-2 sm:px-6">
      <div className="flex w-20 items-center">
        {onBack && (
          <Btn variant="ghost" size="sm" onClick={onBack} aria-label="Back" className="!rounded-xl">
            <ChevronLeft size={18} />
          </Btn>
        )}
      </div>
      <div className="text-center">
        {title && (
          <div className="font-display text-[11px] font-bold tracking-[0.34em] text-dim">
            {title}
          </div>
        )}
      </div>
      <div className="flex w-20 items-center justify-end gap-2">
        {right}
        {showPause && onPause && (
          <Btn variant="ghost" size="sm" onClick={onPause} aria-label="Pause" className="!rounded-xl">
            <Pause size={18} />
          </Btn>
        )}
      </div>
    </header>
  );
}

/* ------------------------------ pass screen ---------------------------- */

export function PassScreen({
  eyebrow,
  name,
  sub,
  actionLabel = "I'M IN — UNLOCK",
  onReady,
  accent = "#ff2d55",
  danger,
}: {
  eyebrow: string;
  name: string;
  sub: string;
  actionLabel?: string;
  onReady: () => void;
  accent?: string;
  danger?: boolean;
}) {
  return (
    <div className="anim-card-in flex min-h-[72dvh] flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[11px] font-bold tracking-[0.4em] text-dim">{eyebrow}</div>
      <div className="relative mt-8">
        <div
          className="absolute -inset-7 rounded-full opacity-60 blur-2xl"
          style={{ background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)` }}
        />
        <Avatar name={name} size={110} />
        {danger && (
          <div className="absolute -right-2 -bottom-2 rounded-full bg-night p-2 text-blood shadow-[0_0_18px_rgba(255,45,85,0.6)]">
            <Skull size={20} />
          </div>
        )}
      </div>
      <h2 className="font-display mt-8 text-4xl font-black tracking-tight break-words">{name}</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-dim">{sub}</p>
      <Btn
        size="lg"
        block
        data-primary
        className="mt-10 max-w-xs"
        onClick={() => {
          sfx.flip();
          onReady();
        }}
      >
        {actionLabel}
      </Btn>
      <div className="mt-4 flex items-center gap-2 text-[11px] tracking-[0.2em] text-dim/70">
        <span className="anim-blink inline-block h-1.5 w-1.5 rounded-full bg-blood" />
        EVERYONE ELSE — EYES OFF THE SCREEN
      </div>
    </div>
  );
}

/* ------------------------------ timer ring ----------------------------- */

export function TimerRing({
  seconds,
  total,
  size = 190,
  danger,
}: {
  seconds: number;
  total: number;
  size?: number;
  danger?: boolean;
}) {
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  const color = danger ? "#ff2d55" : "#22d3ee";
  return (
    <div
      className={cn("relative grid place-items-center rounded-full", danger && "anim-timer-danger")}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,241,255,0.08)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.35s linear, stroke 0.3s", filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div
            className="font-display text-4xl font-black tabular-nums"
            style={{ color, textShadow: `0 0 24px ${color}88` }}
          >
            {String(mm).padStart(1, "0")}:{String(ss).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.3em] text-dim">
            {danger ? "WRAP IT UP" : "DELIBERATION"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- switch ------------------------------- */

export function Switch({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfx.pop();
        onChange(!on);
      }}
      className={cn(
        "btn-press relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-30",
        on ? "bg-blood shadow-[0_0_16px_-2px_rgba(255,45,85,0.8)]" : "bg-white/10"
      )}
      aria-pressed={on}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

export function SettingRow({
  icon,
  title,
  desc,
  control,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        {desc && <div className="mt-0.5 text-xs leading-snug text-dim">{desc}</div>}
      </div>
      {control}
    </div>
  );
}

/* ------------------------------ pause overlay -------------------------- */

export function PauseOverlay({
  onResume,
  onSettings,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#050409]/80 p-6 backdrop-blur-xl">
      <Card className="anim-card-in w-full max-w-xs p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-dim">
          <Pause size={26} />
        </div>
        <h3 className="font-display mt-4 text-xl font-black tracking-widest">FROZEN</h3>
        <p className="mt-1 text-xs text-dim">Screen hidden. Pass responsibly.</p>
        <div className="mt-6 space-y-2.5">
          <Btn block data-primary onClick={onResume}>
            RESUME
          </Btn>
          <Btn block variant="ghost" onClick={onSettings}>
            SETTINGS
          </Btn>
          <Btn block variant="ghost" onClick={onRestart}>
            RESTART MATCH
          </Btn>
          <Btn block variant="danger" onClick={onQuit}>
            QUIT TO MENU
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ player tile ---------------------------- */

export function PlayerTile({
  name,
  selected,
  onClick,
  disabled,
  accent = "#ff2d55",
  note,
}: {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  accent?: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfx.select();
        onClick?.();
      }}
      className={cn(
        "btn-press group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all disabled:opacity-40",
        selected ? "bg-white/[0.09]" : "bg-white/[0.03] hover:bg-white/[0.06]"
      )}
      style={{
        border: `1.5px solid ${selected ? accent : "rgba(244,241,255,0.08)"}`,
        boxShadow: selected ? `0 0 22px -6px ${accent}` : "none",
      }}
    >
      <Avatar name={name} size={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{name}</div>
        {note && <div className="text-[10px] font-semibold tracking-[0.18em] text-dim">{note}</div>}
      </div>
      <div
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full border transition-all",
          selected ? "border-transparent" : "border-white/20"
        )}
        style={{ background: selected ? accent : "transparent" }}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 6.5 4.5 9.5 10.5 2.5" stroke="#07060d" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

/* --------------------------------- misc -------------------------------- */

export function Stepper({
  value,
  min = 0,
  max = 4,
  onChange,
  accent = "#ff2d55",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next === value) {
      sfx.deny();
      return;
    }
    sfx.pop();
    onChange(next);
  };
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.05] p-1">
      <button
        onClick={() => step(-1)}
        aria-label="Decrease"
        disabled={value <= min}
        className="btn-press grid h-7 w-7 place-items-center rounded-lg text-base font-black text-dim transition-colors hover:bg-white/[0.08] hover:text-ink disabled:opacity-25"
      >
        −
      </button>
      <span
        className="w-6 text-center font-display text-sm font-black tabular-nums"
        style={{ color: value > 0 ? accent : "#8f8aa6" }}
      >
        {value}
      </span>
      <button
        onClick={() => step(1)}
        aria-label="Increase"
        disabled={value >= max}
        className="btn-press grid h-7 w-7 place-items-center rounded-lg text-base font-black text-dim transition-colors hover:bg-white/[0.08] hover:text-ink disabled:opacity-25"
      >
        +
      </button>
    </div>
  );
}

const CHANCES = [25, 50, 75, 100];

export function ChancePicker({
  value,
  onChange,
  accent = "#ff2d55",
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex gap-1", disabled && "pointer-events-none opacity-30")}>
      {CHANCES.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            onClick={() => {
              sfx.select();
              onChange(c);
            }}
            className={cn(
              "btn-press rounded-lg px-2 py-1 font-display text-[10px] font-black tabular-nums transition-all",
              active ? "text-night" : "bg-white/[0.05] text-dim hover:bg-white/[0.09]"
            )}
            style={active ? { background: accent, boxShadow: `0 0 16px -4px ${accent}` } : undefined}
          >
            {c}%
          </button>
        );
      })}
    </div>
  );
}

/** Role count + spawn-chance control used in both Lobby and Settings. */
export function RoleConfigRow({
  role,
  count,
  chance,
  onCount,
  onChance,
  maxCount = 4,
}: {
  role: RoleId;
  count: number;
  chance: number;
  onCount: (v: number) => void;
  onChance: (v: number) => void;
  maxCount?: number;
}) {
  const meta = ROLE_META[role];
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}16` }}
        >
          <RoleIcon role={role} size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{count === 1 ? meta.name : meta.plural}</div>
          <div className="truncate text-[11px] text-dim">{meta.tagline}</div>
        </div>
        <Stepper value={count} min={0} max={maxCount} onChange={onCount} accent={meta.color} />
      </div>
      <div className={cn("mt-2.5 flex items-center gap-2 pl-12", count === 0 && "opacity-30")}>
        <span className="text-[10px] font-bold tracking-[0.18em] text-dim">SPAWN ODDS</span>
        <div className="ml-auto">
          <ChancePicker value={chance} onChange={onChance} accent={meta.color} disabled={count === 0} />
        </div>
      </div>
      {count > 0 && chance < 100 && (
        <p className="mt-1.5 pl-12 text-[10px] leading-snug text-dim/80">
          Each of the {count} slot{count > 1 ? "s" : ""} rolls {chance}% independently — the roster stays a
          gamble.
        </p>
      )}
    </div>
  );
}

export function PoweredBy() {
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[220] select-none">
      <div className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-md">
        <span className="anim-blink inline-block h-1 w-1 rounded-full bg-blood" />
        <span className="font-display text-[8.5px] font-bold tracking-[0.22em] text-dim/70">
          POWERED BY{" "}
          <span className="text-blood/90" style={{ textShadow: "0 0 10px rgba(255,45,85,0.6)" }}>
            PRINCE_SUDAIM
          </span>
        </span>
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-white/[0.07]" />
      <div className="font-display text-[10px] font-bold tracking-[0.4em] text-dim">{children}</div>
      <div className="h-px flex-1 bg-white/[0.07]" />
    </div>
  );
}
