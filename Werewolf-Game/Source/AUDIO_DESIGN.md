# Current audio: effects only, no animal sounds — 4 November 2026

This supersedes the Nature/background-music edition. The owner requested removal
of ALL background music/continuous ambience, not removal of sound effects.

## Current behavior

- No looping music, crickets, wind or other ambient bed on any screen.
- All eight former `music-*.wav` files are removed from public assets, the audio
  catalog and the offline CORE list. No runtime ambience player remains.
- Music toggle, volume slider and preview are removed from Settings.
- **Button sounds**, **Effects volume**, effect preview, vibration and reduced
  motion controls remain in Settings. TURN ALL OFF retains its original purpose.
- All **28 retained short WAV effects** retain their exact previous bytes/hashes:
  soft public interactions, uniform private taps, start, announcements,
  discussion/timer/voting, 10 outcome cues and MVP. Those existing effects were not re-rendered.
- Short actual-outcome cue → MVP sequencing is unchanged. No repeating results bed.
- Rooster is also removed. Morning reports and recovery never play animal sounds.

## Implementation

`interaction-feedback.ts` uses `FeedbackController` (bounded Web Audio voice, or
local WAV fallback) and `GameCueController` (one reused non-looping clip element).
It no longer imports or instantiates AmbienceController. The obsolete ambience
controller and its tests are removed rather than leaving a re-enable path.

`game-audio.ts` retains a null-only `musicForScene` compatibility guard. The
catalog has an empty `music` map. Legacy `sounds`/`ambienceVolume` stored fields
remain inert for saved-game/preference compatibility; even true/100 cannot play
background audio. Do not delete/migrate user matches or reset effects preferences.

Existing audio-focus coordination between cooperating same-installation tabs,
visibility cancellation, autoplay handling, no stale overdue MVP after rejection,
sequence watchdogs and optional API failure handling remain. The clip controller's
legacy duck callback is a no-op because there is no ambient voice to duck.
Old non-cooperating windows cannot be remotely silenced: close old game copies
and reopen the current version at the menu; do not refresh an active match.

## Assets and regeneration

28 mono 24 kHz PCM WAV effects, unchanged from the previous edition, under
`public/werewolf/audio/v3/`. `src/audio-catalog.json` retains their exact hashes.
The composer generates effects only and removes legacy music and rooster files on a deliberate
regeneration. Regeneration is not needed for this change and was not performed.
With the 14 reveal assets, two phase one-shots and eight voted-out clips, offline CORE has 123 entries and runtime publication has 128 files.
Conservative worker lifecycle, exact-build digests, deliberate missing-only repair
and the 64 MiB staging budget remain unchanged.

## Survivor example (rules unchanged)

With two Villagers, a Werewolf and an unpaired Survivor, executing the Werewolf
ends the faction contest with VILLAGE WINS. If alive, the Survivor also wins:
its card says WON and local win statistics receive credit. It need not be the
last player standing. A dead Survivor does not win. Headlines now name all actual winning groups using the same IDs as the result
cards. Friends-bound Survivors
use the existing Friends team rules instead. No winner/scoring logic was changed.

## Verification commands

- `npm run test:unit` and `npx tsc --noEmit`
- Selected effects Settings / exact Survivor UI scenarios in `werewolf-ui.test.mjs`
- `node tests/browser-audio.mjs`: native playback of ten endings, sequential MVP,
  silent morning, 45 silent private scene changes, cancellation/mute,
  visibility, one audible clip stream and two-tab focus; no background requests.
- `node tests/browser-feedback.mjs`: effects-only Settings, native modal/focus,
  volume persistence, isolated previews, identical private taps and haptics.
- `node tests/browser-audio-offline.mjs`: all 28 effects cached, offline game,
  victory/MVP and WAV button fallback with Web Audio unavailable.
- `node tests/browser-effects-survivor.mjs`: the exact four-player example at
  normal/200% text, shared win/statistics credit, legacy music enabled but inert,
  no music requests or looping players, and preserved scene effects, but no animal sounds.
- `AUDIO=1 HIDE_VOTED_ROLES=1 npm run test:browser-mvp`: real match/recovery/replay.

Chromium emulation is not physical-phone listening certification. This change
does not overwrite the user's previously saved Drive backups/launch package.

## Shared winners

`match-headline.ts` is presentation-only. It groups authoritative winning player
IDs into the ending faction, Friends and independently winning neutral roles.
It includes escaped Gamblers and living unpaired Survivors, removes duplicate
role labels and excludes losing/dead neutrals. Existing named Jester/Mind Flayer
labels are retained. Friends-bound players count under Friends, not under their
former independent role goal. Multiple winners use WIN; one singular group uses
WINS. A lone escaped winner is not mislabeled NO SURVIVORS. This does not alter
when Friends or other factions can end a match or grant new shared-win rules.


## Random card reveals — 4 November 2026

14 supplied Drive MP3s are used **only** by SHOW YOUR ROLE. The first 4 seconds
are retained (shorter clips stay short), with a 5ms end fade. Original MP3s are
preserved outside the source package. `scripts/prepare-card-reveals.py` produces
stereo 48k PCM WAVs with an oversampled look-ahead safety limiter and verifies
final PCM true peaks below -1 dBTP. `src/card-reveal-catalog.json` records original
hashes, durations, gain, processed hashes and loudness measurements.

Boost-only matching to the loudest clean clip proved impractical without heavy
distortion. The user explicitly selected **clean, consistent loudness** instead:
quieter inputs can be boosted and unusually loud inputs reduced. The previous 3-second edition matched whole-clip
integrated loudness, but the owner reported audible differences. The approved
4-second correction matches active 100ms K-weighted windows (25ms hop), using
the 90th percentile of windows above max(-60, loudest-window minus 25) dB. The
common target is -12 for this custom short-effect metric, NOT standard integrated
400ms LUFS. Quiet tails/silence no longer make sharp clips excessively loud.
Before final active-level matching, gentle stereo-linked 2:1 RMS compression
(8ms attack, 100ms release, soft knee) reduces loud/quiet contrast while keeping
transients. Final oversampled limiting and PCM true-peak checks protect clipping.
Integrated loudness is recorded for diagnosis, not forced to the same value.

This cannot guarantee identical subjective loudness for different timbres or
phone speakers. Short clips retain their decoded lengths; clips over 4 seconds
are cut at 4 seconds without padding or trimming the start. A 5ms end fade avoids
cut clicks. Versioned `/card-reveal/v3/` asset URLs prevent the current preview
from accidentally using 3-second files cached by an older controlling worker.
Old installed builds/caches are not force-activated, erased or interrupted.

`CardRevealController` preloads public audio buffers from the home menu and setup,
then rechecks on night intro/handoff and visibility return. Ordinary control
gestures resume its context without playing any reveal audio. The reveal click
resumes Web Audio inside user activation, provides haptics but **no immediate tap
sound**, and schedules one source 250ms later. No role, action, player or match
RNG enters selection: crypto entropy chooses from all clips except the last
actually audible selection. The deterministic no-crypto fallback uses its own
counter, never Math.random. Playback is non-looping; only one reveal source can
exist. Other control interactions, navigation, recovery gates, Settings, tab
focus loss, page hiding, mute/zero volume and disposal cancel pending/playing
reveals. Returning never replays an expired sound. Only decoded clips enter random selection; the last audible clip remains excluded.
Readiness does not wait for all 14 clips. With no eligible decoded clip the normal
SHOW YOUR ROLE control waits, a public loading/error notice is shown, and an
explicit SHOW ROLE WITHOUT SOUND control always permits progress. Zero volume or
a deliberate disabled reveal preference never waits. Unsupported audio is explicit;
failed downloads expose RETRY REVEAL SOUND (15-second per-fetch timeout). Browser
unlock rejection or an overdue timer reports the playback issue rather than being
silently swallowed. Retry never plays an old reveal. Partial downloads and retry
are role-independent and do not consume gameplay randomness. A blocked context
or timer over 100ms late still never queues stale playback.

Settings exposes **Card reveal sounds** and **Card reveal volume** independently
of other effects. `werewolf.card-reveal.v1` is device-only and never added to match
snapshots. First-use enabled state respects an old deliberate button-sound mute;
after that the toggles are independent. TURN ALL OFF disables both categories.
No reveal preview is provided: these assets remain exclusive to the reveal.

Run `tests/card-reveal.test.mjs`, the selected settings UI cases, and
`tests/browser-card-reveal.mjs` in addition to the prior audio regressions.
Browser source-start timing is not physical-phone speaker-latency certification.


### Cold-load silence regression

The prior browser test waited until all 14 buffers decoded. That hid a real bug:
the first reveal could pick an unloaded clip and silently skip playback. The
cold-load reproduction held audio downloads for 1500ms; with enabled/75% volume,
no source started even after all clips eventually loaded. The correction uses
early preparation, ready-only selection, explicit readiness/failure UI and a
non-blocking, deliberate no-sound path. `browser-card-reveal-loading.mjs` tests
zero-ready, one-ready/thirteen-held, failed download/retry and simulated autoplay
rejection using actual PCM decoding. It never uses a wait-for-all-clips prerequisite
before reveal. The original offline reveal browser test no longer has that
prerequisite either. This is not physical-phone sound or Safari certification.

### Night 1 only

The 14 card-reveal clips are eligible only when the public match round is exactly
1. `Werewolf.tsx` derives `firstNightRevealSounds` from round plus the existing
device toggle, and uses it for both controller configuration and readiness UI.
Night 2+ cancels/disables the reveal controller and shows no reveal loading,
retry or no-sound controls; SHOW YOUR ROLE remains usable even if these audio
files never loaded or Web Audio is unavailable. Other effects and haptics are
unchanged. No device preference or match snapshot is rewritten to implement this
policy. A recovered Night 2 remains silent; START AGAIN's existing round reset
re-enables reveal audio for the new first night. Settings states Night 1 only.
`browser-card-reveal-first-night.mjs` checks native first-night playback, recovered
second-night silence/no preparation, ordinary button feedback, and replay.


### Updated Drive reveal set — 6 November 2026

The current `card reveal sound` folder's complete set of 14 named MP3s replaces
the previously imported set. The folder was re-created with a new Drive ID;
inputs were freshly downloaded and every byte-size/MD5 checked against current
Drive metadata. Thirteen recordings are byte-identical to a previous source;
`woow.mp3` is changed. The original MP3s stay untouched and outside the source
package. The current input names/SHA-256 values are pinned by
`tests/fixtures/card-reveal-source-hashes.json`; the runtime catalog records each
source and processed hash. All 14 are reprocessed through the existing first-up-to-
4s active-loudness/compression/peak-protection pipeline. New `/card-reveal/v3/`
URLs avoid replaying the previous set from an older worker cache. Playback logic,
Night 1 restriction, settings, 250ms delay, random nonrepeat selection and all 28
other effects are unchanged. No forced activation, source-folder edits or Drive
backup writes are part of this replacement.


### Night-start and meeting one-shots — 6 November 2026

The owner explicitly selected **one play, no looping**, not a continuous background
bed. `night starts.mp3` plays once on each new night intro (all nights, including
replay). `meeting.mp3` plays once when discussion begins after the morning report,
not for the Mayor popup. These recordings are about 3.506s and 3.123s respectively;
their entire decoded durations are retained. `scripts/prepare-phase-cues.py` uses
source MD5 verification, gentle linked compression, active-section loudness matching
at -14, end fade and oversampled true-peak protection. Original Drive files remain
untouched; output uses versioned local `/audio/phase/v1/` PCM WAVs and offline CORE.

`phase-audio-catalog.json` is separate from the unchanged 28 original effects.
`gameCueCatalog` combines those 28 with the two supplied cues for the existing
single-voice `GameCueController`. Only the requested night/discussion transition
routing changes: it replaces the old start/handoff/discussion stings rather than
stacking both sounds. All 28 original assets/catalog bytes remain available.
The new cues use existing **Button sounds / Effects volume**, not the independent
card-reveal switch or volume. Settings explains this. No background toggle/loop
or ambience controller has been restored.

The controller sets loop=false, plays each transition once, ends cleanly and cancels
on phase exit, mute/zero volume, hidden page, lost audio focus or disposal. Ordinary
rerenders/timer ticks/Settings close cannot replay it. Recovery entry/initial load
never replays an old phase sound. Reveal sounds remain Night 1-only and otherwise
unchanged. `phase-audio.test.mjs` covers the new assets/routing/lifecycle;
`browser-phase-cues.mjs` checks native offline night 1/night 2/discussion/replay,
full natural completion, mute and visibility cancellation and saved-intro recovery.


### Voted-out recordings — 6 November 2026

The eight current MP3s from the owner's Drive `voted out` folder are processed by
`scripts/prepare-voted-out.py`, with original MD5 verification and pinned source
SHA256 fixture. Each local PCM WAV removes leading dead air (level-compensated -55dBFS onset
detection with a 10ms safety margin), then keeps up to 4 seconds without padding.
A few source recordings had 0.8–1.2s of leading silence; retaining that would have
defeated the requested immediate audible start. Interior gaps are untouched. Active 100ms K-weighted P90 is balanced to -12 (same
short-effect metric as role reveals), with gentle stereo-linked compression, 5ms
end fade and oversampled peak protection. The raw source recordings are unchanged.

On a **real public voted-out victim**, `transitionCues` requests `voted-out` instead
of the old generic elimination sting. The existing single-voice controller selects
one of eight processed clips, excluding its previous selection. Cosmetic crypto
entropy (independent fallback PRNG when unavailable) never advances assignment RNG.
No random sound is selected for a tie, skips/no valid target, morning deaths, private
reveals, recovery or verdict rerenders. The previous ordinary divided-result effect
is unchanged on non-eliminations. All original 28 effect files remain unchanged.

Playback requests are synchronous: **no intentional delay**, particularly no role
reveal's 250ms timer. Browser load/output latency still exists; literal zero physical
audio latency is not promised. The eight immutable assets are offline-pre-cached.
All eight are 48k stereo PCM16; catalog records exact source/output frames, hashes,
measured loudness and true peaks. No loop, replay queue, new audio voice, gameplay
state or recovery schema is introduced. Existing Button sounds/Effects volume,
hiding/focus/mute/phase-exit cancellation apply. First-night-only role reveals and
once-every-night/discussion scene sounds stay unchanged.

`voted-out-audio.test.mjs` checks asset provenance/frames/levels, routing, selection,
synchronous requests and cancellation. `browser-voted-out-audio.mjs` drives an offline
six-player match through all-skipped votes, a real 3–3 tie, and two actual voted-out
victims: distinct random clips with no programmed delay, natural non-looping ends,
no Settings replay and saved-verdict recovery without late playback.

### Playback bug fixes — 6 November 2026 (supersedes trigger/control notes above)

- **Night start:** the intro is silent. Its explicit CONTINUE transition to the
  first handoff plays `night-start` once on every night and replay. Restoring an
  intro remains silent until CONTINUE; restoring an already-started handoff never
  replays a night sound. SHOW YOUR ROLE cancels any remaining night sting before
  the private reveal so they cannot stack.
- **Reveal lifetime:** generic action clicks no longer cancel a private reveal.
  Same-turn action/info/result dialogs and OK buttons preserve its pending 250ms
  request or current voice. Actual next-turn/phase changes, Settings, deliberate
  mute, visibility/audio-focus loss and disposal still cancel it. Nothing is
  restarted after a popup closes. Native mobile/touch tests use Raven/Gambler
  info dialogs (OK before and during playback) and a Seer result, and wait for
  the actual native natural end of all four clips.
- **Voted out:** formerly tied to Button sounds and streamed through HTMLAudio;
  now it has independent device-only `werewolf.voted-out.v1` enabled/volume
  preferences and Settings controls. Defaults preserve existing votes preferences;
  on first use, enable if either card reveals or effects are enabled (retain an
  all-muted device). TURN ALL OFF includes the new switch. It uses a separate
  instance of the same decoded-ready controller as reveals, parameterized with
  the eight existing voted-out URLs and **zero programmed delay**. Normal reveal
  defaults remain 14 files / 250ms; all 52 existing audio assets are unchanged.
- Gesture unlock/preparation begins before voting, uses only decoded non-repeating
  choices and independent cosmetic entropy, and never delays or blocks voting.
  A short context-resume grace (<=100ms) can start only the current valid request;
  late resume, failed/held downloads, hidden page or navigation cannot replay it.
  Failure/loading is explicit on the actual victim's result. Retry prepares audio;
  if loading finishes later, an explicit PLAY button stays available, rather than
  silently disappearing or automatically playing stale audio. No audio/status
  prompt is added to ties/skips. Older browsers without WebAudio retain the
  existing HTMLAudio fallback, controlled by the new voted-out preference.
- Native regression tests cover real skips, a real 3–3 tie, two different actual
  victims **with button effects off**, independent actual gain/persisted volume
  and mute, offline playback and saved-verdict recovery; held/failed downloads
  are also tested with touch emulation and service workers blocked. This is
  browser testing, not physical-phone output/autoplay certification.

### Supplied game-end sounds — 6 November 2026

Five current MP3 recordings from the owner's Drive `game ends` folder replace the
old routed victory-sting/MVP-chime sequence. All original 52 audio files/catalogs
remain byte-identical; only final-results routing changes. MVP presentation,
scoring, rankings, winners, recovery and replay rules are unchanged.

`scripts/prepare-game-end.py` verifies the original MD5s, removes leading dead air
with the same -55dBFS/10ms-safe onset detector, retains up to **7 seconds** without
padding shorter recordings, gently compresses stereo-linked at 2:1 and balances
active 100ms K-weighted P90 to -12 with oversampled true-peak protection. This is a
short-effect loudness metric, not a claim of identical physical-device loudness.
Output is five local stereo48k PCM16 WAVs under `/audio/game-end/v1/`, with exact
frames, source/output hashes and measurements in `game-end-audio-catalog.json`.
Actual prepared lengths: 2.966s, 7s, 7s, 5.0615s and 7s. Sources remain untouched.

The existing decoded-ready one-shot controller is parameterized with these five
URLs, zero programmed delay and explicit loop=false. The single **game-end** cue
is requested only on a legitimate morning/vote-result → final-results transition,
never over the voted-out verdict. It cancels the preceding voted-out/phase voice,
selects randomly without repeating the previous match's selection, and finishes
naturally once. Old victory/MVP audio is not stacked or played afterward. A
re-render, opening a result detail, completed-match reload or recovered scene is
not a new victory. Starting another match, mute/zero volume, Settings, hiding,
losing audio focus or disposal cancel it without deferred/automatic replay.

Separate Settings **Game-end sounds / Game-end volume** persist in device-only
`werewolf.game-end.v1` and work with Button sounds disabled. Defaults enable the new
feature if any existing reveal/voted-out/effect category is enabled; an all-muted
device and explicit saved choice stay muted. TURN ALL OFF includes it. Preparation
and gesture unlock occur well before the ending. Missing/held downloads produce
an explicit retry/ready-Play action on results, never a late automatic sound. The
existing HTMLAudio fallback handles browsers without WebAudio.

Offline CORE adds five immutable files (128 entries / 133 published runtime files,
under the existing 64MiB verified budget). Tests cover all ten result factions,
natural native full-seven-second playback twice across replay, non-repetition,
independent actual gain/persisted mute/volume, no previous victory/MVP overlap,
settings/rerender/reload quietness, offline PCM decoding of all five, held downloads,
audio focus and hiding. The native popup-OK, every-night CONTINUE, Night1-only role
reveal, voted-out skip/tie, cold-loading, unsupported-WebAudio fallback and
MVP/hidden-verdict/replay regressions remain required. Browser testing does not
certify physical-phone output latency or volume. No Drive backup upload, GitHub
push or deployment is part of this change.

### Morning death one-shots — 6 November 2026

The owner's Drive `when die` folder contains three recordings: `among us kill.mp3`,
`bell.mp3`, and `bone crack.mp3`. The original sizes/MD5/SHA256 are verified and
pinned; `scripts/prepare-morning-death.py` creates three versioned stereo48k PCM16
WAVs under `/audio/morning-death/v1/`. Preserve each complete remaining recording
(no arbitrary duration cap or padding), remove leading dead air with the existing
-55dBFS detector/10ms safety margin, gently compress and match active 100ms
K-weighted P90 to -12 with oversampled true-peak protection. Prepared durations are
1.149125s, 1.749479s and .9551875s. All prior 57 audio assets/catalogs are unchanged.

The public morning `hasDeaths` flag requests **one** randomly selected,
non-repeating death sound per visible morning report, not per victim. No-death
mornings remain silent. Do not play over a Mayor announcement: only when the
actual report becomes visible after it closes. Same-report rerenders/fact updates,
settings, old saved-report recovery and return from a hidden tab cannot replay it.
This adds no role/player data to the sound router and changes no death/scoring rule.

Reuse the decoded-ready controller with three URLs, zero programmed delay and
loop=false, along with the same gesture unlock, ready-only selection, early
preparation, cancellation, single-active-voice lifecycle, explicit retry/ready-Play
and unsupported-WebAudio HTMLAudio fallback as the other supplied one-shots.
The retry panel belongs **inside** the morning report, above its fixed footer, so
it remains scrollable/clickable and cannot be covered by the hold-to-continue bar.
Never auto-play a recording when a held/failed download eventually completes.

Separate Settings **Morning death sounds / Morning death volume** persist only on
the device in `werewolf.morning-death.v1`, independent of Button sounds and other
supplied sound categories. Default enabled if any existing sound category is on;
retain an all-muted device and deliberate saved choices. TURN ALL OFF includes it.
No background ambience, rooster or looping music is restored. Original Night1-only
role reveals and popup-OK continuity, every-night CONTINUE cue, discussion,
voted-out skip/tie gating and seven-second once-only game-end audio remain intact.

Offline CORE adds just three files: 131 digest entries / 136 runtime files, still
under the existing 64MiB budget. New native mobile/touch tests drive an eight-player
match through one real no-death morning and two separate **two-death** mornings,
proving zero/one/one sounds (not zero/two/two), native natural completion, no loop,
non-repetition, actual independent gain/persisted mute/volume, no saved-report
replay and TURN ALL OFF. Repeat with held downloads/service workers blocked and
with WebAudio absent to test real offline HTMLAudio fallback. Unit tests also
cover Mayor-announcement deferral and same-report/recovery guards. Browser tests
are not physical-phone sound certification; no Drive write/push/deployment occurs.


### Prompt night-start and meeting cues
Night-start and meeting recordings are preloaded/decoded during home/setup and early report screens in one dedicated interactive-latency context. Pointer and keyboard gestures unlock it before the phase transition (including before the existing two-second morning hold completes). A prepared cue starts synchronously without a reveal timer, HTML media source reset or sequence queue. Browser resume is allowed at most 150ms to start; unready/blocked/late requests are skipped, never played later after downloads, unmute, visibility return or recovery. On browsers without WebAudio, two preloaded media elements are used only when buffered, with the same bounded startup policy. No sound starts during preparation.

The original PCM assets, loudness and full remaining tails stay unchanged. Playback skips only 60ms of leading near-silence for night-start and 20ms for meeting (both discarded regions below -60dBFS). These cues still follow Button sounds/volume, play once after explicit night CONTINUE or discussion entry, and stop on mute/hide/phase exit. Card-reveal’s separate 250ms delay and the approved two-second morning hold are unchanged. A genuinely unavailable/browser-blocked cue may be silent rather than sounding seconds late; physical-device/Bluetooth output latency is not certified.


### Drive vote-confirmation pool
Enderman/notifi/enemy are processed by `scripts/prepare-ballot-cues.py` with strict original MD5 checks, 48kHz stereo PCM, leading dead air removal plus10ms onset margin, full remaining duration and5ms tail taper, active-P90 -14dB alignment, gentle2:1 compression and oversampled peak protection. Their final durations are about0.94s/1.63s/1.34s; existing audio files are untouched. The three extra cues share the prepared phase context/voice, preserving prompt night/meeting playback without another AudioContext. Only an accepted vote callback requests a sound. Final real elimination retains immediate voted-out priority; no-elimination verdict suppresses the old divided chime to avoid layering.
