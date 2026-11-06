import { AlertTriangle, Dices, Play, Plus, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "../lib/audio";
import {
  MAX_PLAYERS,
  MAX_ROLE_COUNT,
  MIN_PLAYERS,
  maxImposters,
  recommendedImposters,
  ROLE_META,
} from "../lib/engine";
import { loadNames, saveNames } from "../lib/storage";
import { avatarFor, loadAvatarMap, setAvatarFor } from "../lib/avatars";
import { AvatarPicker, PlayerAvatar } from "./Avatar";
import type { RoleId, Settings } from "../lib/types";
import { Btn, Card, RoleConfigRow, RoleIcon, SectionLabel, TopBar } from "./ui";
import { cn } from "../utils/cn";

const RANDOM_NAMES = [
  "Nova", "Ghost", "Vex", "Echo", "Riot", "Jinx", "Onyx", "Blaze",
  "Moxie", "Zero", "Sage", "Rogue", "Pixel", "Wolf", "Ivy", "Dash",
  "Raven", "Frost", "Kit", "Neo", "Lux", "Ash", "Storm", "Jet",
];

function randomName(taken: string[]): string {
  const pool = RANDOM_NAMES.filter((n) => !taken.some((t) => t.toLowerCase() === n.toLowerCase()));
  if (pool.length === 0) return `Player ${taken.length + 1}`;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function LobbyScreen({
  settings,
  onSettings,
  onBack,
  onBegin,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
  onBack: () => void;
  onBegin: (names: string[]) => void;
}) {
  const [names, setNames] = useState<string[]>(() => {
    const saved = loadNames();
    return saved.length >= MIN_PLAYERS ? saved : ["", "", "", "", "", ""];
  });
  const [touched, setTouched] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, number>>(loadAvatarMap);
  const [picking, setPicking] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const clean = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names]);
  const dupes = useMemo(() => {
    const seen = new Set<string>();
    const d = new Set<string>();
    clean.forEach((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) d.add(k);
      seen.add(k);
    });
    return d;
  }, [clean]);

  const count = clean.length;
  const maxImp = maxImposters(Math.max(count, MIN_PLAYERS));
  const imposters = Math.min(settings.imposterCount, maxImp);
  const valid = count >= MIN_PLAYERS && count <= MAX_PLAYERS && dupes.size === 0;

  const setName = (i: number, v: string) => {
    setTouched(true);
    setNames((prev) => prev.map((n, j) => (j === i ? v : n)));
  };

  const addPlayer = () => {
    if (names.length >= MAX_PLAYERS) return;
    sfx.pop();
    const next = [...names, ""];
    setNames(next);
    requestAnimationFrame(() => {
      inputRefs.current[next.length - 1]?.focus();
    });
  };

  const removePlayer = (i: number) => {
    sfx.deny();
    setNames((prev) => prev.filter((_, j) => j !== i));
  };

  const autofill = () => {
    sfx.coin();
    setNames((prev) => {
      const kept = prev.map((n) => n.trim()).filter(Boolean);
      const out = [...kept];
      while (out.length < Math.max(6, kept.length)) out.push(randomName(out));
      return out.slice(0, MAX_PLAYERS);
    });
  };

  useEffect(() => {
    if (valid) saveNames(clean);
  }, [valid, clean]);

  const seats = Math.max(count, MIN_PLAYERS) - imposters;
  const wanted = settings.doctorCount + settings.detectiveCount + settings.sheriffCount;
  const overbooked = wanted > seats;

  const roster: { role: string; chance: number }[] = (() => {
    const r: { role: string; chance: number }[] = [];
    for (let i = 0; i < imposters; i++) r.push({ role: "imposter", chance: 100 });
    let left = seats;
    const specs: [string, number, number][] = [
      ["doctor", settings.doctorCount, settings.doctorChance],
      ["detective", settings.detectiveCount, settings.detectiveChance],
      ["sheriff", settings.sheriffCount, settings.sheriffChance],
    ];
    for (const [role, c, chance] of specs) {
      const n = Math.min(c, Math.max(0, left));
      for (let i = 0; i < n; i++) r.push({ role, chance });
      left -= n;
    }
    for (let i = 0; i < Math.max(0, left); i++) r.push({ role: "crew", chance: 100 });
    return r;
  })();

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col pb-8">
      <TopBar title="THE LOBBY" onBack={onBack} />

      <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-2">
        {/* players */}
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <h2 className="font-display text-lg font-black tracking-wide">
                PLAYERS{" "}
                <span className={cn("tabular-nums", valid ? "text-emerald-neon" : "text-blood")}>
                  {count}
                </span>
                <span className="text-dim">/{MAX_PLAYERS}</span>
              </h2>
              <p className="text-xs text-dim">
                {count < MIN_PLAYERS ? `need ${MIN_PLAYERS - count} more to deal` : "looking dangerous. good."}
              </p>
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={autofill} aria-label="Autofill names">
                <Dices size={15} />
              </Btn>
              <Btn variant="ghost" size="sm" onClick={addPlayer} disabled={names.length >= MAX_PLAYERS}>
                <Plus size={15} /> ADD
              </Btn>
            </div>
          </div>

          <div className="space-y-2">
            {names.map((n, i) => {
              const dup = n.trim() && dupes.has(n.trim().toLowerCase());
              return (
                <div key={i} className="anim-fade-up flex items-center gap-2.5" style={{ animationDelay: `${i * 40}ms` }}>
                  <button
                    onClick={() => {
                      sfx.pop();
                      setPicking(i);
                    }}
                    aria-label={`Choose avatar for player ${i + 1}`}
                    className="btn-press relative shrink-0"
                  >
                    <PlayerAvatar avatarId={avatarFor(n.trim() || `p${i + 1}`, avatarMap)} size={42} ring />
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-night text-[8px] font-black text-dim hairline">
                      ✎
                    </span>
                  </button>
                  <div
                    className={cn(
                      "flex flex-1 items-center rounded-2xl bg-white/[0.03] transition-colors focus-within:bg-white/[0.07]",
                      dup ? "border border-blood/70" : "hairline"
                    )}
                  >
                    <UserRound size={15} className="ml-3.5 shrink-0 text-dim/70" />
                    <input
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      value={n}
                      maxLength={16}
                      placeholder={`Player ${i + 1}`}
                      onChange={(e) => setName(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (i === names.length - 1 && names.length < MAX_PLAYERS) addPlayer();
                          else inputRefs.current[i + 1]?.focus();
                        }
                      }}
                      className="w-full bg-transparent px-2.5 py-3 text-sm font-bold placeholder:font-normal placeholder:text-dim/50"
                    />
                    {dup && <span className="pr-3 text-[9px] font-black tracking-widest text-blood">DUPE</span>}
                  </div>
                  {names.length > 1 && (
                    <button
                      onClick={() => removePlayer(i)}
                      aria-label={`Remove player ${i + 1}`}
                      className="btn-press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.03] text-dim transition-colors hover:bg-blood/15 hover:text-blood"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {touched && dupes.size > 0 && (
            <p className="mt-2 px-1 text-[11px] font-semibold text-blood">
              No clones allowed — every name must be unique.
            </p>
          )}
        </section>

        {/* imposters */}
        <Card className="p-4">
          <div className="flex items-center gap-2 px-1 pb-3">
            <Users size={15} className="text-blood" />
            <span className="font-display text-[10px] font-bold tracking-[0.34em] text-dim">SYNDICATE SIZE</span>
            <span className="ml-auto text-[10px] text-dim/70">recommended {recommendedImposters(Math.max(count, MIN_PLAYERS))}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((v) => {
              const enabled = v <= maxImp;
              const active = imposters === v;
              return (
                <button
                  key={v}
                  disabled={!enabled}
                  onClick={() => {
                    sfx.pop();
                    onSettings({ ...settings, imposterCount: v });
                  }}
                  className={cn(
                    "btn-press rounded-2xl py-3 font-display text-lg font-black transition-all disabled:opacity-25",
                    active
                      ? "bg-blood text-white shadow-[0_8px_28px_-8px_rgba(255,45,85,0.9)]"
                      : "bg-white/[0.04] text-dim hover:bg-white/[0.08]"
                  )}
                >
                  {v}
                  <span className="block font-sans text-[9px] font-bold tracking-[0.2em] opacity-80">
                    {v === 1 ? "SOLO" : v === 2 ? "DUO" : "TRIO"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 px-1 text-[11px] leading-snug text-dim">
            Keeping the town bigger than the syndicate — that's why {Math.max(count, MIN_PLAYERS)} players caps
            at {maxImp} imposter{maxImp > 1 ? "s" : ""}.
          </p>
        </Card>

        {/* town powers — counts + spawn odds */}
        <Card>
          <div className="flex items-center gap-2 px-5 pt-4 pb-1">
            <span className="font-display text-[10px] font-bold tracking-[0.34em] text-dim">TOWN POWERS</span>
            <span className="ml-auto text-[10px] font-bold tabular-nums text-dim/70">
              {wanted}/{seats} SEATS
            </span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <RoleConfigRow
              role="doctor"
              count={settings.doctorCount}
              chance={settings.doctorChance}
              onCount={(v) => onSettings({ ...settings, doctorCount: v })}
              onChance={(v) => onSettings({ ...settings, doctorChance: v })}
              maxCount={MAX_ROLE_COUNT}
            />
            <RoleConfigRow
              role="detective"
              count={settings.detectiveCount}
              chance={settings.detectiveChance}
              onCount={(v) => onSettings({ ...settings, detectiveCount: v })}
              onChance={(v) => onSettings({ ...settings, detectiveChance: v })}
              maxCount={MAX_ROLE_COUNT}
            />
            <RoleConfigRow
              role="sheriff"
              count={settings.sheriffCount}
              chance={settings.sheriffChance}
              onCount={(v) => onSettings({ ...settings, sheriffCount: v })}
              onChance={(v) => onSettings({ ...settings, sheriffChance: v })}
              maxCount={MAX_ROLE_COUNT}
            />
          </div>
          {overbooked ? (
            <div className="mx-4 mb-4 mt-2 flex items-start gap-2 rounded-xl border border-amber-neon/40 bg-amber-neon/[0.07] px-3 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-neon" />
              <p className="text-[11px] leading-snug text-dim">
                You asked for <span className="font-bold text-amber-neon">{wanted}</span> power roles but only{" "}
                <span className="font-bold text-amber-neon">{seats}</span> town seats exist. Extras get cut at
                random — add players or trim a role.
              </p>
            </div>
          ) : (
            <div className="px-5 pt-1 pb-4 text-[11px] text-dim">
              Set how many of each role and the odds each slot actually spawns. Leftover seats become
              Crewmates — at {wanted === seats ? "this setup everyone has a power role" : "0 crew if you fill every seat"}.
            </div>
          )}
        </Card>

        {/* roster preview */}
        <section>
          <SectionLabel>TONIGHT'S ROSTER</SectionLabel>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 px-2">
            {roster.map((slot, i) => {
              const role = slot.role as RoleId;
              const meta = ROLE_META[role];
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider"
                  style={{
                    color: meta.color,
                    background: `${meta.color}14`,
                    border: `1px solid ${meta.color}44`,
                    opacity: slot.chance < 100 ? 0.75 : 1,
                  }}
                >
                  <RoleIcon role={role} size={12} />
                  {meta.name.toUpperCase()}
                  {slot.chance < 100 && (
                    <span className="rounded bg-black/30 px-1 text-[9px] tabular-nums">{slot.chance}%</span>
                  )}
                </span>
              );
            })}
            {roster.length === 0 && <span className="text-xs text-dim">add players to see the deal</span>}
          </div>
          <p className="mt-2 text-center text-[10px] text-dim/70">
            slots marked with % may not spawn — the deal is rolled fresh each match
          </p>
        </section>
      </div>

      {picking !== null && (
        <AvatarPicker
          name={names[picking]?.trim() || `Player ${picking + 1}`}
          current={avatarFor(names[picking]?.trim() || `p${picking + 1}`, avatarMap)}
          taken={names
            .map((nm, j) => (j === picking ? -1 : avatarFor(nm.trim() || `p${j + 1}`, avatarMap)))
            .filter((v) => v >= 0)}
          onPick={(id) =>
            setAvatarMap(setAvatarFor(names[picking]?.trim() || `p${picking + 1}`, id, avatarMap))
          }
          onClose={() => setPicking(null)}
        />
      )}

      <div className="px-5 pt-5">
        <Btn
          size="lg"
          block
          data-primary
          disabled={!valid}
          onClick={() => {
            sfx.confirm();
            onBegin(clean);
          }}
        >
          <Play size={19} />
          DEAL THE ROLES
        </Btn>
        {!valid && count >= MIN_PLAYERS && (
          <p className="mt-2 text-center text-[11px] font-semibold text-blood">fix the dupes first</p>
        )}
      </div>
    </div>
  );
}
