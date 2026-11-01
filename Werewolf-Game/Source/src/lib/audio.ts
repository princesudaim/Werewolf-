/* NIGHTFALL synth SFX — pure WebAudio oscillators, zero audio files. */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 1.0;

function ctx(): AudioContext | null {
  if (!ac) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = volume;
      master.connect(ac.destination);
    } catch {
      ac = null;
    }
  }
  if (ac && ac.state === "suspended") ac.resume().catch(() => null);
  return ac;
}

export function unlockAudio() {
  ctx();
}

export function setSound(on: boolean) {
  enabled = on;
}

/** 0–1. Applied live to the master bus. */
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

interface ToneOpts {
  f: number;
  f2?: number;
  t?: OscillatorType;
  d: number;
  g?: number;
  delay?: number;
  curve?: "exp" | "lin";
}

function tone(o: ToneOpts) {
  if (!enabled) return;
  const c = ctx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.t ?? "sine";
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.d);
  }
  const g = (o.g ?? 0.22) * 1.9;
  gain.gain.setValueAtTime(0.0001, t0);
  if (o.curve === "lin") {
    gain.gain.linearRampToValueAtTime(g, t0 + 0.012);
  } else {
    gain.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + o.d + 0.05);
}

function noise(d: number, freq = 900, gIn = 0.18, delay = 0) {
  const g = gIn * 1.9;
  if (!enabled) return;
  const c = ctx();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * d));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.value = g;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const sfx = {
  click: () => tone({ f: 340, f2: 260, t: "triangle", d: 0.07, g: 0.12 }),
  pop: () => tone({ f: 520, f2: 720, t: "sine", d: 0.09, g: 0.16 }),
  flip: () => {
    noise(0.12, 2600, 0.1);
    tone({ f: 190, f2: 340, t: "triangle", d: 0.14, g: 0.1 });
  },
  reveal: () => {
    tone({ f: 220, t: "sine", d: 0.12, g: 0.16 });
    tone({ f: 330, t: "sine", d: 0.12, g: 0.16, delay: 0.08 });
    tone({ f: 440, t: "sine", d: 0.2, g: 0.18, delay: 0.16 });
  },
  susReveal: () => {
    tone({ f: 180, t: "sawtooth", d: 0.28, g: 0.1 });
    tone({ f: 190, t: "sawtooth", d: 0.28, g: 0.1, delay: 0.02 });
    tone({ f: 92, f2: 60, t: "sine", d: 0.5, g: 0.24, delay: 0.05 });
  },
  select: () => tone({ f: 620, f2: 540, t: "square", d: 0.05, g: 0.07 }),
  confirm: () => {
    tone({ f: 440, t: "triangle", d: 0.08, g: 0.14 });
    tone({ f: 660, t: "triangle", d: 0.14, g: 0.14, delay: 0.07 });
  },
  deny: () => tone({ f: 160, f2: 110, t: "square", d: 0.16, g: 0.12 }),
  kill: () => {
    tone({ f: 130, f2: 42, t: "sine", d: 0.5, g: 0.34 });
    noise(0.3, 500, 0.16, 0.02);
  },
  gunshot: () => {
    noise(0.18, 3200, 0.4);
    tone({ f: 220, f2: 50, t: "sine", d: 0.42, g: 0.3 });
  },
  save: () => {
    tone({ f: 520, t: "sine", d: 0.16, g: 0.14 });
    tone({ f: 780, t: "sine", d: 0.3, g: 0.14, delay: 0.1 });
  },
  innocent: () => {
    tone({ f: 480, t: "sine", d: 0.12, g: 0.14 });
    tone({ f: 640, t: "sine", d: 0.22, g: 0.14, delay: 0.09 });
  },
  guilty: () => {
    tone({ f: 300, f2: 190, t: "sawtooth", d: 0.24, g: 0.1 });
    tone({ f: 312, f2: 198, t: "sawtooth", d: 0.24, g: 0.1, delay: 0.02 });
  },
  tick: () => tone({ f: 880, t: "square", d: 0.03, g: 0.05 }),
  alarm: () => {
    tone({ f: 700, f2: 500, t: "square", d: 0.2, g: 0.12 });
    tone({ f: 700, f2: 500, t: "square", d: 0.2, g: 0.12, delay: 0.26 });
    tone({ f: 700, f2: 500, t: "square", d: 0.3, g: 0.12, delay: 0.52 });
  },
  eject: () => {
    noise(0.5, 1400, 0.14);
    tone({ f: 400, f2: 90, t: "sawtooth", d: 0.6, g: 0.12 });
  },
  coin: () => {
    tone({ f: 990, t: "square", d: 0.05, g: 0.1 });
    tone({ f: 1320, t: "square", d: 0.05, g: 0.1, delay: 0.07 });
    tone({ f: 990, t: "square", d: 0.05, g: 0.1, delay: 0.14 });
    tone({ f: 1320, t: "square", d: 0.08, g: 0.1, delay: 0.21 });
  },
  gameStart: () => {
    // original 4-note descending sting — evokes the genre without copying it
    [330, 262, 196, 147].forEach((f, i) =>
      tone({ f, t: "sawtooth", d: 0.34, g: 0.12, delay: i * 0.1 })
    );
    tone({ f: 98, f2: 49, t: "sine", d: 1.1, g: 0.3, delay: 0.42 });
    noise(0.5, 700, 0.12, 0.42);
  },
  emergency: () => {
    for (let i = 0; i < 3; i++) {
      tone({ f: 660, f2: 880, t: "square", d: 0.18, g: 0.14, delay: i * 0.22 });
      tone({ f: 880, f2: 660, t: "square", d: 0.18, g: 0.14, delay: i * 0.22 + 0.11 });
    }
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ f, t: "triangle", d: 0.34, g: 0.16, delay: i * 0.11 })
    );
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ f, t: "triangle", d: 0.4, g: 0.15, delay: i * 0.13 })
    );
  },
};
