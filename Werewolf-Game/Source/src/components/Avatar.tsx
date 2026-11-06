import { useState } from "react";
import { Check, Shuffle } from "lucide-react";
import { sfx } from "../lib/audio";
import { AVATARS, avatarById, type AccessoryId, type AvatarDef } from "../lib/avatars";
import { cn } from "../utils/cn";

/* --------------------------- accessory artwork --------------------------- */

function Accessory({ kind, a }: { kind: AccessoryId; a: AvatarDef }) {
  switch (kind) {
    case "antenna":
      return (
        <g>
          <path d="M50 16 C50 6 62 6 62 0" stroke={a.shade} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="63" cy="-1" r="5" fill={a.accent} />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M22 22 C24 6 60 4 68 18 L68 23 C56 17 34 17 22 26 Z" fill={a.shade} />
          <path d="M66 18 C80 18 86 24 84 28 L64 26 Z" fill={a.shade} opacity="0.85" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M26 20 L32 4 L44 16 L52 2 L60 16 L70 6 L72 22 Z" fill="#fbbf24" />
          <circle cx="52" cy="10" r="3.4" fill="#fff3c4" />
        </g>
      );
    case "horns":
      return (
        <g fill="#ff3b5c">
          <path d="M28 20 C20 12 18 2 26 0 C32 -1 34 10 34 18 Z" />
          <path d="M70 20 C78 12 80 2 72 0 C66 -1 64 10 64 18 Z" />
        </g>
      );
    case "halo":
      return <ellipse cx="50" cy="2" rx="24" ry="7" fill="none" stroke="#fde68a" strokeWidth="4" />;
    case "leaf":
      return (
        <g>
          <path d="M50 18 C50 8 52 2 54 -2" stroke="#15803d" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M54 2 C62 -6 74 -4 74 2 C74 8 62 12 54 4 Z" fill="#4ade80" />
        </g>
      );
    case "flame":
      return (
        <path
          d="M50 16 C44 8 50 2 48 -6 C58 -2 64 6 62 14 C60 8 56 8 54 12 Z"
          fill="#fb923c"
        />
      );
    case "bolt":
      return <path d="M54 -4 L38 18 L50 18 L44 34 L64 12 L52 12 Z" fill="#facc15" />;
    case "headphones":
      return (
        <g>
          <path d="M22 36 C22 12 78 12 78 36" stroke="#1f2937" strokeWidth="6" fill="none" />
          <rect x="12" y="32" width="14" height="22" rx="6" fill="#111827" />
          <rect x="74" y="32" width="14" height="22" rx="6" fill="#111827" />
        </g>
      );
    case "bandage":
      return (
        <g>
          <rect x="26" y="26" width="30" height="9" rx="4" fill="#fef3c7" transform="rotate(-14 41 30)" />
          <rect x="34" y="21" width="9" height="20" rx="4" fill="#fde68a" transform="rotate(-14 38 31)" />
        </g>
      );
    case "visorshade":
      return <path d="M20 40 C36 30 68 30 84 40 L84 46 C66 38 38 38 20 46 Z" fill="#0f172a" opacity="0.85" />;
    default:
      return null;
  }
}

/* ------------------------------ the avatar ------------------------------- */

export function PlayerAvatar({
  avatarId,
  size = 44,
  dead,
  className,
  ring,
}: {
  avatarId: number;
  size?: number;
  dead?: boolean;
  className?: string;
  ring?: boolean;
}) {
  const a = avatarById(avatarId);
  const [failedImage, setFailedImage] = useState<string>();
  const image = a.image && failedImage !== a.image ? a.image : undefined;
  const body = dead ? "#4b5160" : a.body;
  const shade = dead ? "#2c3038" : a.shade;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: dead ? "rgba(255,255,255,0.04)" : `${a.body}1f`,
        border: `1.5px solid ${dead ? "rgba(255,255,255,0.1)" : `${a.body}88`}`,
        boxShadow: ring && !dead ? `0 0 18px -4px ${a.body}` : undefined,
      }}
    >
      {image ? (
        <>
          <img
            src={image}
            alt=""
            aria-hidden
            draggable={false}
            onError={() => setFailedImage(image)}
            className={cn("h-full w-full object-cover", dead && "grayscale brightness-50")}
          />
          {dead && (
            <svg className="absolute inset-0" viewBox="-6 -8 112 118" width="100%" height="100%" aria-hidden>
              <path d="M22 26 L82 92" stroke="#ff2d55" strokeWidth="6" strokeLinecap="round" />
            </svg>
          )}
        </>
      ) : (
        <svg viewBox="-6 -8 112 118" width="100%" height="100%" aria-hidden>
          {/* backpack */}
          <rect x="6" y="44" width="18" height="36" rx="9" fill={shade} />
          {/* body */}
          <path
            d="M30 40 C30 20 72 20 72 42 L72 76 C72 88 64 94 52 94 C38 94 30 88 30 76 Z"
            fill={body}
          />
          {/* legs */}
          <path d="M34 90 L34 104 C34 108 46 108 46 104 L46 92 Z" fill={body} />
          <path d="M58 92 L58 104 C58 108 70 108 70 104 L70 90 Z" fill={shade} />
          {/* visor */}
          <path
            d="M44 34 C62 30 80 36 80 46 C80 56 62 60 46 55 C38 52 36 37 44 34 Z"
            fill={dead ? "#6b7280" : "#bfe6ff"}
          />
          <path
            d="M48 36 C58 33 70 36 72 41 C64 38 54 38 48 41 Z"
            fill="#ffffff"
            opacity="0.75"
          />
          {/* shading */}
          <path
            d="M30 60 C36 66 40 80 38 94 C33 92 30 86 30 76 Z"
            fill={shade}
            opacity="0.55"
          />
          <Accessory kind={a.accessory} a={{ ...a, body, shade }} />
          {dead && (
            <g stroke="#ff2d55" strokeWidth="6" strokeLinecap="round">
              <path d="M22 26 L82 92" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

/* ------------------------------- the picker ------------------------------ */

export function AvatarPicker({
  name,
  current,
  taken = [],
  onPick,
  onClose,
}: {
  name: string;
  current: number;
  taken?: number[];
  onPick: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-[#050409]/85 p-4 backdrop-blur-xl sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass anim-card-in max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <PlayerAvatar avatarId={current} size={46} ring />
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-black tracking-wide">
              {name.trim() ? name.toUpperCase() : "PICK A CREW"}
            </div>
            <p className="text-[11px] text-dim">Saved to this device — it sticks to the name.</p>
          </div>
          <button
            onClick={() => {
              const free = AVATARS.filter((a) => !taken.includes(a.id) || a.id === current);
              const pick = free[Math.floor(Math.random() * free.length)] ?? AVATARS[0];
              sfx.coin();
              onPick(pick.id);
            }}
            aria-label="Random avatar"
            className="btn-press hairline grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-dim hover:text-ink"
          >
            <Shuffle size={14} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {AVATARS.map((a) => {
            const isTaken = taken.includes(a.id) && a.id !== current;
            const active = a.id === current;
            return (
              <button
                key={a.id}
                disabled={isTaken}
                onClick={() => {
                  sfx.pop();
                  onPick(a.id);
                }}
                className={cn(
                  "btn-press relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-all disabled:opacity-25",
                  active ? "bg-white/[0.1]" : "bg-white/[0.03] hover:bg-white/[0.07]"
                )}
                style={{ border: `1.5px solid ${active ? a.body : "rgba(244,241,255,0.07)"}` }}
              >
                <PlayerAvatar avatarId={a.id} size={42} />
                <span className="text-[9px] font-bold tracking-wider text-dim">{a.name.toUpperCase()}</span>
                {active && (
                  <span
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full"
                    style={{ background: a.body }}
                  >
                    <Check size={12} className="text-night" strokeWidth={3.5} />
                  </span>
                )}
                {isTaken && (
                  <span className="absolute inset-0 grid place-items-center rounded-2xl bg-night/60 text-[8px] font-black tracking-widest text-dim">
                    TAKEN
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          data-primary
          onClick={() => {
            sfx.click();
            onClose();
          }}
          className="btn-press mt-4 w-full rounded-2xl bg-blood py-3 text-sm font-bold tracking-wide text-white shadow-[0_10px_36px_-8px_rgba(255,45,85,0.75)]"
        >
          DONE
        </button>
      </div>
    </div>
  );
}
