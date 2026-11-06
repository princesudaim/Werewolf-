import {
  Crosshair,
  Dices,
  Fingerprint,
  Ghost,
  Target,
  Eye,
  EyeOff,
  Hourglass,
  RotateCcw,
  Skull,
  Users,
  VenetianMask,
  Vibrate,
  Volume2,
} from "lucide-react";
import { sfx } from "../lib/audio";
import { defaultSettings, MAX_ROLE_COUNT } from "../lib/engine";
import type { Settings } from "../lib/types";
import { Btn, Card, RoleConfigRow, SectionLabel, SettingRow, Switch, TopBar } from "./ui";
import { cn } from "../utils/cn";

export default function SettingsScreen({
  settings,
  onSettings,
  onBack,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
  onBack: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    onSettings({ ...settings, [k]: v });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col pb-8">
      <TopBar title="CONTROL ROOM" onBack={onBack} />

      <div className="flex-1 space-y-7 overflow-y-auto px-5 pt-2">
        {/* town powers */}
        <section>
          <SectionLabel>TOWN POWERS</SectionLabel>
          <Card className="mt-3 divide-y divide-white/[0.05]">
            <RoleConfigRow
              role="doctor"
              count={settings.doctorCount}
              chance={settings.doctorChance}
              onCount={(v) => set("doctorCount", v)}
              onChance={(v) => set("doctorChance", v)}
              maxCount={MAX_ROLE_COUNT}
            />
            <RoleConfigRow
              role="detective"
              count={settings.detectiveCount}
              chance={settings.detectiveChance}
              onCount={(v) => set("detectiveCount", v)}
              onChance={(v) => set("detectiveChance", v)}
              maxCount={MAX_ROLE_COUNT}
            />
            <RoleConfigRow
              role="sheriff"
              count={settings.sheriffCount}
              chance={settings.sheriffChance}
              onCount={(v) => set("sheriffCount", v)}
              onChance={(v) => set("sheriffChance", v)}
              maxCount={MAX_ROLE_COUNT}
            />
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]">
                <Dices size={17} className="text-violet-neon" />
              </div>
              <p className="text-[11px] leading-relaxed text-dim">
                Counts are capped by available town seats. Set a role to <span className="font-bold text-ink">0</span> to
                remove it entirely, or drop the odds below 100% to make its appearance a gamble.
              </p>
            </div>
          </Card>
        </section>

        {/* role mechanics */}
        <section>
          <SectionLabel>ROLE MECHANICS</SectionLabel>
          <Card className="mt-3 divide-y divide-white/[0.05]">
            <SettingRow
              icon={<Eye size={17} className="text-emerald-neon" />}
              title="Doctor self-heal"
              desc="Doctors may protect themselves."
              control={
                <Switch
                  on={settings.doctorSelfHeal}
                  disabled={settings.doctorCount === 0}
                  onChange={(v) => set("doctorSelfHeal", v)}
                />
              }
            />
            <SettingRow
              icon={<Hourglass size={17} className="text-emerald-neon" />}
              title="Self-heal: once per game"
              desc="ON = a single self-heal all game. OFF = every night."
              control={
                <Switch
                  on={settings.doctorSelfHealOnce}
                  disabled={settings.doctorCount === 0 || !settings.doctorSelfHeal}
                  onChange={(v) => set("doctorSelfHealOnce", v)}
                />
              }
            />
            <div className={cn("px-4 py-3.5", settings.sheriffCount === 0 && "opacity-30")}>
              <div className="flex items-center gap-2">
                <Crosshair size={15} className="text-amber-neon" />
                <span className="text-sm font-bold">Sheriff ammo</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["one", "1 PER GAME"],
                    ["night", "1 PER NIGHT"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    disabled={settings.sheriffCount === 0}
                    onClick={() => {
                      sfx.pop();
                      set("sheriffShots", v);
                    }}
                    className={cn(
                      "btn-press rounded-xl py-2.5 font-display text-[10px] font-bold tracking-[0.18em]",
                      settings.sheriffShots === v
                        ? "bg-amber-neon text-[#171205]"
                        : "bg-white/[0.05] text-dim hover:bg-white/[0.09]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* syndicate */}
        <section>
          <SectionLabel>SYNDICATE PROTOCOL</SectionLabel>
          <Card className="mt-3 divide-y divide-white/[0.05]">
            <SettingRow
              icon={<Users size={17} className="text-blood" />}
              title="Imposters know each other"
              desc="Partner names appear on the role card at the start."
              control={
                <Switch on={settings.imposterSeesPartner} onChange={(v) => set("imposterSeesPartner", v)} />
              }
            />
            <SettingRow
              icon={<Target size={17} className="text-blood" />}
              title="Expose partner's mark"
              desc="OFF (default) = imposters pick blind, pure luck. ON = the 2nd sees the 1st's mark and can match it for a sure kill."
              control={
                <Switch on={settings.revealPartnerChoice} onChange={(v) => set("revealPartnerChoice", v)} />
              }
            />
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]">
                <VenetianMask size={17} className="text-blood" />
              </div>
              <p className="text-xs leading-relaxed text-dim">
                Locked rules: same mark = guaranteed elimination · split marks = fate flips a coin · a solo
                imposter always executes.
              </p>
            </div>
          </Card>
        </section>

        {/* reveals */}
        <section>
          <SectionLabel>INTEL & REVEALS</SectionLabel>
          <Card className="mt-3 divide-y divide-white/[0.05]">
            <SettingRow
              icon={<Ghost size={17} className="text-violet-neon" />}
              title="Stealth night turns"
              desc="ON = every player's turn looks 100% identical — no role name, icon or colour. A phone left on the table gives nothing away."
              control={<Switch on={settings.stealthTurns} onChange={(v) => set("stealthTurns", v)} />}
            />
            <SettingRow
              icon={<Fingerprint size={17} className="text-cyan-neon" />}
              title="Publish investigation verdict"
              desc="Morning report announces a check came back CLEAN or DIRTY — without naming who checked or who was checked."
              control={
                <Switch on={settings.publishInvestigation} onChange={(v) => set("publishInvestigation", v)} />
              }
            />
            <SettingRow
              icon={settings.revealRoleOnEject ? <Eye size={17} className="text-violet-neon" /> : <EyeOff size={17} className="text-dim" />}
              title="Reveal role on ejection"
              desc="OFF = “their role remains unknown.” ON = full expose when voted out."
              control={<Switch on={settings.revealRoleOnEject} onChange={(v) => set("revealRoleOnEject", v)} />}
            />
            <SettingRow
              icon={settings.revealRoleOnDeath ? <Eye size={17} className="text-violet-neon" /> : <EyeOff size={17} className="text-dim" />}
              title="Reveal role on night death"
              desc="Show the victim's true identity in the morning report."
              control={<Switch on={settings.revealRoleOnDeath} onChange={(v) => set("revealRoleOnDeath", v)} />}
            />
          </Card>
        </section>

        {/* day phase */}
        <section>
          <SectionLabel>DAY PHASE</SectionLabel>
          <Card className="mt-3 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05]">
                <Hourglass size={17} className="text-cyan-neon" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Deliberation timer</div>
                <div className="text-[11px] text-dim">How long the town argues before the Host's verdict.</div>
              </div>
              <span className="font-display text-xl font-black text-cyan-neon tabular-nums" style={{ textShadow: "0 0 18px rgba(34,211,238,0.5)" }}>
                {fmt(settings.daySeconds)}
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={300}
              step={30}
              value={settings.daySeconds}
              onChange={(e) => set("daySeconds", Number(e.target.value))}
              className="mt-4 w-full accent-[#22d3ee]"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold tracking-widest text-dim/70">
              <span>1:00</span>
              <span>3:00</span>
              <span>5:00</span>
            </div>
          </Card>
        </section>

        {/* experience */}
        <section>
          <SectionLabel>EXPERIENCE</SectionLabel>
          <Card className="mt-3 divide-y divide-white/[0.05]">
            <SettingRow
              icon={<Volume2 size={17} className="text-violet-neon" />}
              title="Synth sound FX"
              desc="Generated live — zero audio files."
              control={<Switch on={settings.sound} onChange={(v) => set("sound", v)} />}
            />
            <div className={cn("px-4 py-3.5", !settings.sound && "opacity-30")}>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05]">
                  <Volume2 size={17} className="text-violet-neon" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">Master volume</div>
                  <div className="text-[11px] text-dim">Crank it for a loud room.</div>
                </div>
                <span className="font-display text-lg font-black text-violet-neon tabular-nums">
                  {Math.round(settings.volume * 100)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={!settings.sound}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => set("volume", Number(e.target.value) / 100)}
                onPointerUp={() => sfx.pop()}
                className="mt-3 w-full accent-[#a78bfa]"
              />
            </div>
            <SettingRow
              icon={<Vibrate size={17} className="text-violet-neon" />}
              title="Haptics"
              desc="Vibration on reveals and eliminations (mobile)."
              control={<Switch on={settings.haptics} onChange={(v) => set("haptics", v)} />}
            />
          </Card>
        </section>

        <Btn
          variant="ghost"
          block
          onClick={() => {
            sfx.deny();
            onSettings(defaultSettings());
          }}
        >
          <RotateCcw size={15} /> RESET TO DEFAULTS
        </Btn>

        <div className="flex items-center justify-center gap-2 pb-2 text-[10px] tracking-[0.24em] text-dim/50">
          <Skull size={11} /> EVERYTHING SAVES INSTANTLY TO THIS DEVICE
        </div>
      </div>
    </div>
  );
}
