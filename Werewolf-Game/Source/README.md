# Werewolf — offline party game PWA

## Current release handoff (4 November 2026)

Background music, continuous ambience and rooster/animal sounds have been removed. The music
settings/preview are gone; Button sounds and Effects volume still control the
short effects, wins and MVP. Old music preferences remain inert for
backward-compatible saves.

End-screen headlines name all actual winning groups, such as VILLAGE AND
SURVIVOR WIN or FRIENDS, WEREWOLVES AND GAMBLER WIN. They use the same winner IDs
as player cards/statistics; no neutral gets a win simply for being a neutral.
A Friends-bound Survivor counts as Friends.

The latest release includes compact full-width match rankings with larger MVP
identity, setup-preserving START AGAIN, sound effects/short victory cues and shared-winner headlines,
and **Hide voted-out player roles** in role selection → GAME SETTINGS → VOTING &
REVEALS. This new switch starts off, hides the vote verdict's role name/artwork
and accessible announcement when on, and leaves morning-death visibility alone.
The existing Show dead player’s role switch remains the master reveal control.
Final rankings always reveal roles. Preferences survive recovery and replay;
older saved matches retain their prior rule.

After `npm run build`, run `python3 scripts/package-final-launch.py` to produce
a complete editable-source/website backup and a separate prebuilt GitHub Pages
launch ZIP under the repository's ignored `.cache/backups/` directory. Both are
CRC/entry/hash verified and compressed under the Drive tool's 100 MiB limit. The
launch ZIP contains `site/`, a root `.github/workflows/deploy-pages.yml`, a release
manifest, and Copilot instructions. Set GitHub Pages source to GitHub Actions;
copy the ZIP contents to a repository root and deploy only with owner approval.
This packaging command does not upload or deploy anything.

Active-match recovery is an explicit Settings opt-in: local private state with a
fixed 24-hour expiry, not cloud sync/encryption. Without recovery, a reload loses
match progress. Audio/settings/recovery controls are in Settings. Historical
verification counts and dated descriptions below are not current release test
claims; use the final release evidence for exact newly executed checks.


A work-in-progress, free and ad-free, single-phone pass-and-play Werewolf game for 4–24 players. The app runs in the browser with no account or server. After its first successful online load, the PWA caches the game and its artwork for offline play. Names and settings are stored on the device; an in-progress game is not saved if the page is reloaded.

## What is implemented

- Mobile-styled player roster with a delete mode and bottom sheets for game avatars, gallery and camera. Player library with selectable saved names, editing and removal; 15 built-in avatars recovered from the APK; camera/gallery photos (browser support and permission required). Photos are cropped and stored locally. Only one current player can use each avatar; choosing one already in use assigns its previous owner a random unused built-in avatar. If all 15 are occupied, the displaced player uses initials. Browser storage limits apply.
- Local all-time rankings in the player library: completed games and wins are tracked by player name on this device. Renamed players create separate records; the scoring is a reconstruction and is not synced.
- Role selection grouped into Villagers, Werewolves and Neutrals starts with no roles selected. The Start button and selected-player count remain visible while scrolling. Only implemented roles are listed; tap a role to view its description. Team Random cards have their own description and optional no-repeat and follow-chances settings; per-role chance sliders weight Random-card draws when enabled (0% excludes a role; these weights combine with a bias toward balanced power scores). Automatic distribution also has an independent no-repeat option. Manually added roles are unaffected. Automatic distribution can optionally follow these chances. Each role has an optional minimum wait; roles with active abilities also offer role-specific settings. Police detentions resolve silently at the end of the night; when Police is in play, private investigation results appear on the investigator’s next turn.
- Setting-aware 1–10 role power estimates, used by Random cards and point-based Easy, Balanced and Hard automatic lineups including Villagers, Werewolves and Neutrals (no Neutral for 4 players; 1 for 5–11, 2 for 12–19, and 3 for 20–24; 1 Werewolf for 4–8 players, 2 for 9–16, 3 for 17–20, and 4 for 21–24), random assignment to players, configurable role counts and settings for revealing roles on death, secret voting, skip votes, first-night safety, discussion time, optional passive-role wait, and a selectable Madman card. Each Madman takes one player slot and secretly appears as a village role until the game ends. The passive-role wait is provisionally five seconds for Villager, Jester, Celebrity and Sick Man.
- Thirty-four roles: Werewolf, Villager, Doctor, Seer, Chef, Mayor, Wolf Hunter, Muter, Jester, Necromancer, Bodyguard, Sheriff, Serial Killer, Visitor, Survivor, Team Checker, Celebrity, Detective, Vote Marker, Strong Werewolf, Sick Man, Lone Werewolf, Wolf Pup, News Reporter, Raven, Infecting Wolf, White Werewolf, Gambler, Mind Flayer, Intelligence Chief, Thief, Police, Hypnotizer Wolf and Friends Maker. Private pass-the-phone turns, doctor protection, seer investigations, chef team comparison, mayor assembly, Wolf Hunter water, bodyguard protection, sheriff shooting, wolf voting, News Reporter headlines and drawings, morning reports, timed discussion (including time elapsed while the app is backgrounded), individual voting, execution and win conditions. The next voting screen opens immediately after each vote; pass the phone to the named player.
- Button sounds, background music, and short vibrations can be switched off separately in Game Settings. Night and morning audio is cached for offline play; music stays silent during voting. New installs have sound and vibration on; existing music preferences are kept, and button sounds are on unless switched off. Vibration depends on your phone and browser; some devices, including iPhones, may not support it.
- No ads, purchases, accounts or premium gates.

This is **not a complete or verified recreation of the Android game**. The Android release contains many additional roles, settings, languages, artwork, player-library features and interactions that are not implemented here. Video parts are incomplete and the original Dart source is unavailable. The following are explicit reconstruction choices, not verified original rules: wolf vote ties and village vote ties cause no death; wolves win at parity; players cannot vote for themselves; ordinary wolf votes cannot target known packmates (the White Werewolf can betray them), the Necromancer is assigned to the village, and the sheriffs have one bullet, Instigator team assignment and visit-tracking interaction details, Psychic team mapping, celebrity reveal timing, Wolf Pup multi-target voting and ties, Lone Werewolf protection and action precedence, Sick Man revival behavior, Strong Werewolf interactions, serial-killer and Mind Flayer win precedence, the interaction between hypnosis and role conversion, and the timing of simultaneous protection, visits, attacks and revival are reconstructed rather than verified. See [APK_INSPECTION.md](APK_INSPECTION.md) for the inspection and video observations. Do not claim 100% parity.

## Run and test

```sh
npm ci
npm run dev
npm run build
npx tsc --noEmit
npm test
```

Optional browser smoke test: run `npm run preview -- --host 127.0.0.1 --port 5180` in one terminal, then `CHROMIUM_PATH=/path/to/chromium npm run test:browser` in another. The test uses a fresh browser context and checks 320px and 390px mobile layouts, scrolling, touch target sizes, offline loading, drawing and voting.

Requires Node.js 22 or later. GitHub Actions is configured to deploy `dist/` to GitHub Pages when changes reach `main`; enable **Settings → Pages → GitHub Actions**. This branch is not automatically published. Visit the deployed site online first and wait for its service worker to install before going offline. Updates activate after all tabs of the app close. Browser install menus can add the PWA to the home screen.

The original APK's artwork and fonts were supplied by the project owner for the reconstruction. The original Mafia implementation remains in the repository but is no longer the application entry point.


## Offline readiness and waiting updates (2 November 2026)

At the home menu, open the **top-right Settings gear → OFFLINE & UPDATES**. This distinguishes a first download that needs reopening, checked file presence, missing files, an unavailable check, downloading/failed updates and a waiting update. **CHECK OFFLINE FILES** only asks the current worker whether its expected cache entries are present. It does not download/repair files, clear profiles/rankings/recovery, activate an update, or reload the page. The control stays mounted/focused while checking; repeat actions are ignored until it finishes.

For the first installation, keep the page online, wait for the download and close/reopen at the menu **before relying on offline play**. Do not refresh an active match merely to install or prepare offline use. Updates wait for all old game tabs and installed-app windows to close; reopen afterward. A waiting update is explained only at the menu, never over a private turn or recovery gate.

The check confirms cache-entry presence, not content digests, audio playback, permanent retention or physical-device support. Browsers can remove files later; deliberate missing-only repair is described below. Full inspection of damaged-but-present entries remains future work. An old worker without the status protocol, a timeout, blocked messaging or a cache error cannot produce a false ready message. Missing MessageChannel does not disable service-worker installation or online gameplay. Recovery is a separate per-match opt-in, fixed 24 hours, local plaintext private state, no PIN/encryption/cloud-sync promise.

Current automated verification: **463 fast + 304 complete UI = 767 passed**, plus three consecutive multi-tab/offline/readiness browser runs, normal/200% mobile home audits, root smoke, actual browser-reopen/deadline/all-role recovery and file:// checks. These are not physical-device/AT certification. See `analysis/OFFLINE_READINESS.md` and the final artifact record for detailed scope and evidence.

The independently verified pre-UI/audio checkpoint is `Werewolf-Game_2026-11-02_13-35-13_PKT_Cache-Repair_Before-UI-Audio.zip` in Drive. Earlier backups were preserved. This Settings-layout continuation is newer than that checkpoint and is local-only; it has not been deployed to GitHub.


## Explicit missing-file repair

The production build embeds SHA-256 and byte-size metadata for its expected offline files. Installation and deliberately downloaded replacements must match that exact build; an older active game does not accept a newer host's different files. Publish the generated files unchanged (without HTML/image rewriting). The verified staging budget is 64 MiB, enforced by both the build and worker.

When the current worker supports repair and detects missing files, the menu offers a deliberate **DOWNLOAD MISSING FILES** action behind a disclosure. It does not run automatically, navigate, reload, activate an update, reset a match or access profiles/rankings/recovery storage. If the game page itself is missing, the active worker can provide a self-contained neutral 503 page with explicit download, open-game and native update-check actions. Only open the game when ready; its ordinary neutral recovery/private-reveal gates still apply. Updates continue waiting for all old game/fallback tabs to close.

**Scope:** CHECK FILES remains a presence check, not an integrity scan. Repair only fills missing entries; it does not inspect or replace damaged entries that are still present. Newly fetched/reused replacement bytes are checked. Network/version failures are checked before writes; a cache/quota write failure may leave some verified files restored. Existing valid files and unrelated caches are never cleared by repair. An unavailable old version cannot be reconstructed from a newer-only host; use the explicit native update path when appropriate. Legacy workers gain the new capabilities only after normal update adoption. Recovery retains its original 24-hour expiry.


## Settings layout

**SETTINGS** replaces Sound & Feel. Music, button sounds, haptics, their volumes/previews and reduced animations are controlled only there. Role setup links to Settings rather than repeating switches; active screens use a gear button rather than a separate music/mute button. The quick setup guide has been removed.

Match-recovery opt-in (before starting), active status, retry and turn-off actions are inside Settings. The long setup explanation is replaced by one brief local/24-hour/unencrypted consent warning. Resume/private gates and erase confirmation remain unchanged in purpose. Recovery is still opt-in per match and cannot be newly enabled halfway through an unsaved match. Settings does not pause discussion timers.


## Thief rework (2 November 2026)

New games default to **Steal only after death: ON**. The Thief chooses a living player without attacking them, including on the safe first night. If that player dies at night or is voted out while the Thief survives, the Thief takes their role and team (an existing Friends bond still keeps its team). The target’s role is not revealed when selected.

In **View Thief details → ROLE SETTINGS**, choose a target duration:
- **Until death — cannot change:** keep the first valid choice until the target dies.
- **Until death — may change each night (default):** keep a living target or replace them on a later night.
- **That night + next vote only:** the choice expires when the next night begins.

Turning death-only mode OFF restores the old attacking Thief and its attack-interval setting. Night and setup descriptions and estimated power reflect the selected rules: 4 points for flexible death-only targeting, 3 for the other death-only policies, and 8 for default legacy attacks.

Inheritance is settled before night/vote victory checks: a surviving Thief taking the last Werewolf role prevents a premature village win. Other normal victory rules still apply. Police can block a new choice and night inheritance; corruption also blocks inheritance. Dead/escaped Thieves cannot inherit, and a revived or escaped target is not a newly dead target.

Recovery keeps the existing 104-field schema and fixed 24-hour expiry. The watch and pending choice use existing persisted fields. Active saves made before these options existed retain their old attacking rules; new games use the new defaults. No private storage is cleared or worker update forced. The local Website preview is updated; no GitHub deployment or new Drive backup is implied.


## Compact home menu

The home screen keeps START GAME full width, with HOW TO PLAY and ROLE RULEBOOK side by side beneath it. The large Settings row is replaced by an accessible 44-pixel top-right gear. OFFLINE & UPDATES is available only inside Settings at the home menu, not over setup/private gameplay. Offline installation, checks, deliberate repair and native waiting updates still use the existing safety rules. No saved match or game rule changes with this layout.

### Celebrity fame limit

Celebrity remains automatic: new matches allow 1 or 2 successful fame nights, default 1, with a random audience of 1–3 living players. Blocking or hypnosis does not spend fame. Private Police-delayed messages, per-actor quotas and refresh recovery are preserved. Existing pre-change saved matches keep their original unlimited-fame rule. See [TESTING.md](TESTING.md) for the full regression matrix.

### Morning and discussion controls

Hold morning Continue for two seconds, just like the vote-out Continue; the same progress animation is used. In Game Settings → Turn Timing, switch Manual discussion controls off to hide both End Discussion and +1 Minute and let the timer start voting automatically. Discussion time is adjustable from 30 seconds to 3 minutes in 30-second steps, default 1 minute. Existing saved-match timers are preserved.


### Muter (updated role)

The former Muted role is now **Muter**. They can speak normally and choose one
other living player each night (or skip). The selected survivor is announced in
the morning as **“Name was muted.”** and cannot speak for that day. They can still
vote and use their own night ability. Silence expires when the next night starts;
Muter can choose again, including the same player on a later night. Police blocks
and existing ability corruption prevent that night's silence. Multiple Muters
can act; the morning lists a shared target only once. This does not kill anyone
or trigger a morning-death sound. Discussion shows the current day's reminder.
The internal role ID and artwork filename remain `muted` for saved-role, settings,
artwork and match compatibility. Older saves gain empty mute queues/reminders,
without resetting any match progress, local photos or the fixed recovery expiry.
Muter has an estimated power of **4/10**, used consistently in setup, role details, private cards, Random cards and automatic distribution. It is an eligible Madman disguise; a disguised Madman cannot actually silence anyone. Effective opponent silences earn +2 MVP points; silencing an ally is -2. Skips, cancelled attempts and unjudgeable neutral targets earn no points. No new ability toggles or saved-role IDs were added.


### Avatar-local pack target markers
Known wolves’ night target cards use the supplied transparent red claw mark and `# / YOU` tag for the current selection. Teammate choices are a compact count inside the photo, never extra rows below it. **TEAM CHOICES** opens a private, keyboard/touch-accessible list of names, targets and distinct Attack/Hypnotize/Infect intentions. It does not confirm a kill or change any night rule. It includes only choices already visible to the acting wolf; Lone Werewolf and non-pack roles get no pack information. The dialog and markers are not persisted or shown on the pass/morning screens. Player names remain outside the overlay; selection does not change card height, including larger-text layouts.


### Prompt night-start and meeting cues
Night-start and meeting recordings are preloaded/decoded during home/setup and early report screens in one dedicated interactive-latency context. Pointer and keyboard gestures unlock it before the phase transition (including before the existing two-second morning hold completes). A prepared cue starts synchronously without a reveal timer, HTML media source reset or sequence queue. Browser resume is allowed at most 150ms to start; unready/blocked/late requests are skipped, never played later after downloads, unmute, visibility return or recovery. On browsers without WebAudio, two preloaded media elements are used only when buffered, with the same bounded startup policy. No sound starts during preparation.

The original PCM assets, loudness and full remaining tails stay unchanged. Playback skips only 60ms of leading near-silence for night-start and 20ms for meeting (both discarded regions below -60dBFS). These cues still follow Button sounds/volume, play once after explicit night CONTINUE or discussion entry, and stop on mute/hide/phase exit. Card-reveal’s separate 250ms delay and the approved two-second morning hold are unchanged. A genuinely unavailable/browser-blocked cue may be silent rather than sounding seconds late; physical-device/Bluetooth output latency is not certified.


### Short Muter copy and final death penalty
Muter’s action description now says **“Each night you can mute someone”**. The redundant speaking, morning-report and next-night-expiry explanation lines were removed from static/shared rulebook/details/private descriptions; the existing mute rules themselves are unchanged. Final match rankings subtract **2 points once from each dead, non-escaped player**, before MVP selection. Living/revived/escaped players are not penalized, accuracy is unchanged and a dead player can still earn MVP with a sufficiently high adjusted score. The death deduction appears in the row summary; all-time faction win totals are unchanged. Avatar-local target markers and prompt phase-audio playback are unchanged.


### Supplied claw target marker
The selected-player overlay uses the supplied image-11.png red claw silhouette with the white/neutral background removed into real alpha transparency. The original 517×591 resolution is retained; no generated replacement or photo re-encoding is used. The transparent PNG is bundled inline into the single-file HTML, so offline and project-subpath play need no extra asset request. The numbered YOU tag, bounded teammate count and private TEAM CHOICES details remain. No card sizing, targeting, MVP, Muter rules or phase audio changes.


### Vote/skip confirmation sounds
The verified supplied Enderman, Notifi and Enemy recordings form one random, non-immediately-repeating pool for committed **VOTE** and **SKIP VOTE** presses. They are balanced, leading-dead-air-trimmed, gently compressed/peak-protected PCM, preloaded with phase cues in the same single audio context/voice. No target-selection or night-skip trigger, startup delay, autoplay catch-up, queued overlap, gameplay RNG use or recovery replay. A confirmation can finish after the next voter or a no-elimination verdict appears; a new press replaces it instead of stacking. Button sounds and Effects volume control it.

Approved final-ballot policy: when someone is actually eliminated, their existing immediate, independently controlled voted-out sound takes priority—no new confirmation on that press and no waiting for an earlier clip. A final ballot without elimination uses its confirmation instead of the old divided chime. No gameplay, balloting/Mayor weighting, photos, markers, Muter copy, MVP deduction or saved-state fields are changed.

### Compact private target markers and avatar statuses
DEAD and ESCAPED are photo-contained status badges in both voting and night-target
grids, never extra text rows. Photos retain a fixed square aspect ratio. Long names
can still wrap for readability; player numbers keep their existing top strip.
Every role has a unique symbol in `role-target-markers.ts`. Only the acting role's
selected night targets display that symbol (Doctor cross, Seer eye, Werewolf supplied
claw, and distinct symbols for the other roles). Markers are at most26px and32% of
the portrait width; they do not obscure most of the photo or change card dimensions.
No marker reveals a target's hidden role, appears in public voting, invents an action
for a passive role, or exposes the Madman's true identity. Known pack choices retain
their private count, YOU tag and TEAM CHOICES dialog.

Regular button feedback alone is raised3x in amplitude (+9.54dB). Native oscillator
peaks remain below0.27 even at100%; a separate eight-file boosted fallback catalog
avoids modifying scene cues. Existing effects volume/mute/haptics controls remain.
Ballot, reveal, phase, elimination, morning and ending sounds are unchanged.

### Restoring an editable GitHub checkout
To avoid storing all large runtime assets twice, the GitHub checkout keeps the
complete site in `Werewolf-Game/Website/` and an exact checksum-verified source asset
map. Before installing/building/testing Source on a fresh clone, run from repo root:

```sh
node Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs
cd Werewolf-Game/Source
npm ci
npm run build
```

This is also the command used by the deduplicated full Drive backup. Existing local
source assets are verified rather than overwritten if modified. The ready-made
Website does not need restoration, npm or a build to launch.
