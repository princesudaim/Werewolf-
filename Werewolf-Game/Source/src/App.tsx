import { Pause } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DayScreen, { EjectScreen } from "./components/DayScreen";
import GameOverScreen from "./components/GameOverScreen";
import LobbyScreen from "./components/LobbyScreen";
import NightScreen, { ReportScreen } from "./components/NightScreen";
import RevealScreen from "./components/RevealScreen";
import SettingsScreen from "./components/SettingsScreen";
import StartScreen from "./components/StartScreen";
import { Backdrop, PauseOverlay, PoweredBy } from "./components/ui";
import { sfx, setSound, setVolume, unlockAudio } from "./lib/audio";
import {
  assignRoles,
  computeScores,
  resolveEject,
  resolveNight,
} from "./lib/engine";
import { burstAt, initFx, shake } from "./lib/fx";
import { loadHighs, loadSettings, pushHighs, saveSettings } from "./lib/storage";
import type { DeathInfo, GameEvent, HighScore, Phase, Player, Settings } from "./lib/types";

const IN_GAME: Phase[] = ["night", "report", "day", "eject"];

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>("start");
  const [returnTo, setReturnTo] = useState<Phase>("start");

  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [deaths, setDeaths] = useState<DeathInfo[]>([]);
  const [selfHealUsed, setSelfHealUsed] = useState<number[]>([]);
  const [pendingWinner, setPendingWinner] = useState<"town" | "imposters" | null>(null);
  const [winner, setWinner] = useState<"town" | "imposters" | null>(null);
  const [ejected, setEjected] = useState<Player | null>(null);
  const [hadFiftyFifty, setHadFiftyFifty] = useState(false);
  const [verdicts, setVerdicts] = useState<("IMPOSTER" | "INNOCENT")[]>([]);
  const [highs, setHighs] = useState<HighScore[]>(loadHighs);
  const [paused, setPaused] = useState(false);

  /* fx + audio bootstrap */
  useEffect(() => {
    initFx();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    saveSettings(settings);
    setSound(settings.sound);
    setVolume(settings.volume);
  }, [settings]);

  /* keyboard: Esc = pause toggle, Enter/Space = primary action */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape" && IN_GAME.includes(phase)) {
        sfx.flip();
        setPaused((p) => !p);
        return;
      }
      if (typing || paused) return;
      if (e.key === "Enter" || e.key === " ") {
        const btn = document.querySelector<HTMLButtonElement>("[data-primary]");
        if (btn && !btn.disabled) {
          e.preventDefault();
          btn.click();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, paused]);

  const shotsUsed = useMemo(() => {
    const map: Record<number, number> = {};
    events.forEach((ev) => {
      if (ev.type === "shot" && ev.actor !== undefined) {
        map[ev.actor] = (map[ev.actor] ?? 0) + 1;
      }
    });
    return map;
  }, [events]);

  /* ------------------------------ game flow ----------------------------- */

  const beginMatch = (names: string[]) => {
    setPlayers(assignRoles(names, settings));
    setRound(1);
    setEvents([]);
    setDeaths([]);
    setSelfHealUsed([]);
    setPendingWinner(null);
    setWinner(null);
    setEjected(null);
    setHadFiftyFifty(false);
    setVerdicts([]);
    setPaused(false);
    sfx.gameStart();
    setPhase("reveal");
  };

  const nightComplete = (night: Parameters<typeof resolveNight>[1]) => {
    const res = resolveNight(players, night, selfHealUsed, round);
    setPlayers(res.players);
    setDeaths(res.deaths);
    setEvents((ev) => [...ev, ...res.events]);
    setSelfHealUsed(res.selfHealUsed);
    setPendingWinner(res.winner);
    setHadFiftyFifty(res.events.some((e) => e.type === "fiftyfifty"));
    setVerdicts(
      night.detectiveChecks.map((c) => c.result).sort(() => Math.random() - 0.5)
    );
    if (res.deaths.length > 0) {
      sfx.kill();
      shake(10, 400);
      burstAt(window.innerWidth / 2, window.innerHeight * 0.32, {
        colors: ["#ff2d55", "#f4f1ff"],
        count: 30,
        power: 400,
      });
    } else if (res.events.some((e) => e.type === "save")) {
      sfx.save();
    }
    setPhase("report");
  };

  const endGame = (w: "town" | "imposters", finalPlayers: Player[], finalEvents: GameEvent[]) => {
    const rows = computeScores(finalPlayers, finalEvents, w);
    const updated = pushHighs(
      rows.map((r) => ({
        name: r.player.name,
        role: r.player.role,
        result:
          (w === "imposters" && r.player.role === "imposter") ||
          (w === "town" && r.player.role !== "imposter")
            ? ("WIN" as const)
            : ("LOSS" as const),
        score: r.score,
      }))
    );
    setHighs(updated);
    setWinner(w);
    setPaused(false);
    setPhase("over");
  };

  const reportContinue = () => {
    sfx.flip();
    if (pendingWinner) endGame(pendingWinner, players, events);
    else setPhase("day");
  };

  const dayVerdict = (ejectId: number | null) => {
    if (ejectId === null) {
      setEvents((ev) => [...ev, { round, type: "skip" }]);
      setRound((r) => r + 1);
      setPhase("night");
      return;
    }
    const res = resolveEject(players, ejectId, round);
    setPlayers(res.players);
    setEvents((ev) => [...ev, ...res.events]);
    setEjected(players.find((p) => p.id === ejectId) ?? null);
    setPendingWinner(res.winner);
    setPhase("eject");
  };

  const ejectContinue = () => {
    sfx.flip();
    if (pendingWinner) endGame(pendingWinner, players, events);
    else {
      setRound((r) => r + 1);
      setPhase("night");
    }
  };

  const openSettings = (from: Phase) => {
    setReturnTo(from);
    setPaused(false);
    setPhase("settings");
  };

  /* -------------------------------- render ------------------------------ */

  return (
    <div id="app-shell" className="relative min-h-dvh">
      <Backdrop />

      {phase === "start" && (
        <StartScreen onStart={() => setPhase("lobby")} onSettings={() => openSettings("start")} />
      )}

      {phase === "lobby" && (
        <LobbyScreen
          settings={settings}
          onSettings={setSettings}
          onBack={() => setPhase("start")}
          onBegin={beginMatch}
        />
      )}

      {phase === "settings" && (
        <SettingsScreen
          settings={settings}
          onSettings={setSettings}
          onBack={() => setPhase(returnTo)}
        />
      )}

      {phase === "reveal" && (
        <RevealScreen
          players={players}
          settings={settings}
          onDone={() => setPhase("night")}
          onQuit={() => setPhase("lobby")}
        />
      )}

      {phase === "night" && (
        <NightScreen
          key={`night-${round}`}
          players={players}
          settings={settings}
          round={round}
          selfHealUsed={selfHealUsed}
          shotsUsed={shotsUsed}
          onComplete={nightComplete}
        />
      )}

      {phase === "report" && (
        <ReportScreen
          players={players}
          deaths={deaths}
          round={round}
          settings={settings}
          hadFiftyFifty={hadFiftyFifty}
          verdicts={verdicts}
          onContinue={reportContinue}
        />
      )}

      {phase === "day" && (
        <DayScreen
          players={players}
          settings={settings}
          round={round}
          paused={paused}
          onVerdict={dayVerdict}
        />
      )}

      {phase === "eject" && ejected && (
        <EjectScreen
          player={ejected}
          reveal={settings.revealRoleOnEject}
          round={round}
          onContinue={ejectContinue}
        />
      )}

      {phase === "over" && winner && (
        <GameOverScreen
          players={players}
          events={events}
          winner={winner}
          rounds={round}
          highs={highs}
          settings={settings}
          onRematch={() => beginMatch(players.map((p) => p.name))}
          onLobby={() => setPhase("lobby")}
          onMenu={() => setPhase("start")}
        />
      )}

      {/* floating pause trigger during live phases */}
      {IN_GAME.includes(phase) && !paused && (
        <button
          onClick={() => {
            sfx.flip();
            setPaused(true);
          }}
          aria-label="Pause"
          className="btn-press fixed top-4 right-4 z-[240] grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-dim backdrop-blur-md transition-colors hover:text-ink hairline"
        >
          <Pause size={17} />
        </button>
      )}

      <PoweredBy />

      {paused && (
        <PauseOverlay
          onResume={() => setPaused(false)}
          onSettings={() => openSettings(phase)}
          onRestart={() => beginMatch(players.map((p) => p.name))}
          onQuit={() => {
            setPaused(false);
            setPhase("start");
          }}
        />
      )}
    </div>
  );
}
