/* NIGHTFALL juice layer — canvas particles + screen shake. Zero assets, 60fps. */

export const PALETTE = {
  red: "#ff2d55",
  crimson: "#ff5c72",
  cyan: "#22d3ee",
  amber: "#fbbf24",
  emerald: "#34d399",
  violet: "#a78bfa",
  white: "#f4f1ff",
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: "rect" | "circle" | "shard";
  grav: number;
  drag: number;
}

interface Emitter {
  x: number;
  y: number;
  until: number;
  rate: number;
  acc: number;
  spread: number;
  angle: number;
  colors: string[];
  power: [number, number];
  grav: number;
  size: [number, number];
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: Particle[] = [];
let emitters: Emitter[] = [];
let raf = 0;
let last = 0;
let dpr = 1;

function ensureLoop() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
}

function tick(now: number) {
  raf = 0;
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // emit
  emitters = emitters.filter((e) => now < e.until);
  for (const e of emitters) {
    e.acc += e.rate * dt;
    while (e.acc >= 1) {
      e.acc -= 1;
      spawnFromEmitter(e);
    }
  }

  // step
  parts = parts.filter((p) => p.life < p.ttl);
  for (const p of parts) {
    p.life += dt;
    p.vy += p.grav * dt;
    p.vx *= 1 - p.drag * dt;
    p.vy *= 1 - p.drag * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const t = 1 - p.life / p.ttl;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.4));
    ctx.translate(p.x * dpr, p.y * dpr);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    const s = p.size * dpr * (0.6 + 0.4 * t);
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "shard") {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.5, s * 0.6);
      ctx.lineTo(-s * 0.5, s * 0.6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6);
    }
    ctx.restore();
  }

  if (parts.length || emitters.length) ensureLoop();
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function spawnFromEmitter(e: Emitter) {
  const ang = e.angle + (Math.random() - 0.5) * e.spread;
  const pow = e.power[0] + Math.random() * (e.power[1] - e.power[0]);
  parts.push({
    x: e.x + (Math.random() - 0.5) * 24,
    y: e.y,
    vx: Math.cos(ang) * pow,
    vy: Math.sin(ang) * pow,
    life: 0,
    ttl: 1.4 + Math.random() * 1.6,
    size: e.size[0] + Math.random() * (e.size[1] - e.size[0]),
    color: e.colors[Math.floor(Math.random() * e.colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 14,
    shape: Math.random() < 0.55 ? "rect" : Math.random() < 0.5 ? "circle" : "shard",
    grav: e.grav,
    drag: 0.6,
  });
  if (parts.length > 520) parts.splice(0, parts.length - 520);
}

export function initFx() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:400;";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  const resize = () => {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);
}

export interface BurstOpts {
  colors?: string[];
  count?: number;
  power?: number;
  grav?: number;
  size?: number;
}

export function burstAt(x: number, y: number, opts: BurstOpts = {}) {
  if (!ctx) return;
  const colors = opts.colors ?? [PALETTE.red, PALETTE.amber, PALETTE.white];
  const count = opts.count ?? 26;
  const power = opts.power ?? 340;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const pow = power * (0.25 + Math.random() * 0.75);
    parts.push({
      x,
      y,
      vx: Math.cos(ang) * pow,
      vy: Math.sin(ang) * pow - 60,
      life: 0,
      ttl: 0.7 + Math.random() * 0.9,
      size: (opts.size ?? 9) * (0.5 + Math.random() * 0.9),
      color: colors[i % colors.length],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 18,
      shape: Math.random() < 0.6 ? "shard" : "circle",
      grav: opts.grav ?? 620,
      drag: 1.4,
    });
  }
  ensureLoop();
}

export function burstAtEl(el: Element | null, opts: BurstOpts = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burstAt(r.left + r.width / 2, r.top + r.height / 2, opts);
}

/** Celebratory confetti rain for N ms. */
export function confetti(ms = 2600, colors = [PALETTE.red, PALETTE.violet, PALETTE.cyan, PALETTE.amber, PALETTE.white]) {
  if (!ctx) return;
  const w = window.innerWidth;
  emitters.push({
    x: w * 0.2,
    y: -16,
    until: performance.now() + ms,
    rate: 26,
    acc: 0,
    spread: 1.1,
    angle: Math.PI / 2,
    colors,
    power: [140, 320],
    grav: 300,
    size: [7, 13],
  });
  emitters.push({
    x: w * 0.8,
    y: -16,
    until: performance.now() + ms,
    rate: 26,
    acc: 0,
    spread: 1.1,
    angle: Math.PI / 2,
    colors,
    power: [140, 320],
    grav: 300,
    size: [7, 13],
  });
  ensureLoop();
}

/** Element-animate screen shake on the app shell. */
export function shake(power = 9, ms = 380) {
  const el = document.getElementById("app-shell");
  if (!el) return;
  const frames: Keyframe[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const decay = 1 - i / steps;
    frames.push({
      transform: `translate(${(Math.random() - 0.5) * 2 * power * decay}px, ${
        (Math.random() - 0.5) * 2 * power * decay
      }px) rotate(${(Math.random() - 0.5) * 1.2 * decay}deg)`,
    });
  }
  el.animate(frames, { duration: ms, easing: "ease-out" });
}

export function vibrate(pattern: number | number[], on: boolean) {
  if (on && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}
