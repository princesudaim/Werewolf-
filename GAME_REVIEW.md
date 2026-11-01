# Werewolf game — original archive review

Reviewed: 2026-11-01. **Analysis only: no game source or supplied website files edited.**

## 1. Version and integrity

The owner selected **Werewolf-Game.zip**, the October 31 archive from Google Drive, rather than the newer November 1 Phase 5 distribution.

- Drive file ID: `19rslyKsCxr27ihiL73Q1PjBLSvX150TQ`.
- Archive size: 92,360,873 bytes.
- Contents: 226 files, 93,340,888 uncompressed bytes.
- Imported without content changes into `Werewolf-Game/`.
- `GAME_ARCHIVE_MANIFEST.json` records the archive SHA-256 and every original file's SHA-256. All imported files were verified against those hashes.
- `Werewolf-Game/Source/` is the editable application and its tests/documentation.
- `Werewolf-Game/Website/` is the original built website and assets.
- The original archive remains unchanged in Drive. No Drive save, overwrite, deletion, publishing, commit, or push was performed.
- Dependencies, generated builds, and the downloaded archive were used in an ignored scratch copy under `.cache/review/`. That directory is temporary, not the durable game baseline. The imported original files and this report are the durable handoff.

The newer Phase 5 README was initially read to identify the versions. Its claims (including its React version and passing-test count) must **not** be attributed to this selected original archive.

## 2. What the game is

An offline-capable, single-phone pass-and-play Werewolf party game for **4–24 players**. Players share the device, reveal their role privately, perform night actions, discuss the morning report, vote, and repeat until a winning condition is reached.

There is no account system, multiplayer server, cloud synchronization, payment system, or advertising integration in the active application. Local browser storage holds player-related data and preferences. Game rules are a reconstruction; the supplied documentation explicitly says this is not a verified recreation of every original Android mechanic.

### Technology actually supplied

- React **19.2.6**, React DOM 19.2.6, TypeScript **5.9.3**.
- Vite **7.3.7**, Tailwind CSS 4.1.17, custom CSS, Lucide icons.
- PWA web manifest and hand-written service worker.
- Single-file build plugin inlines application JavaScript/CSS into `index.html`; artwork, fonts, and music remain separate files.
- Node.js 22 or later for development/testing.
- Node test runner, jsdom, Testing Library, and an optional Playwright browser smoke test.

**Important distinction:** a single HTML bundle is not the entire offline installation. The `werewolf/`, `icons/`, manifest, and service worker files still matter.

## 3. Active code map

| Area | Main files | Responsibility |
| --- | --- | --- |
| Entry point | `Source/src/main.tsx` | Mounts `Werewolf.tsx`, not `App.tsx`; registers service worker |
| Match orchestration | `Source/src/Werewolf.tsx` | Screen transitions, turn queues, state, private information, actions, night-end processing, voting, result recording |
| Game rules | `Source/src/werewolf-engine.ts` | Role/settings definitions, random role resolution, dealing, targeting helpers, attacks, infections, hypnosis, illness, special wins |
| Setup/library | `Source/src/PlayerSetup.tsx` | Roster, profiles, image selection, editing, removal, rankings/share UI |
| Avatar uniqueness | `Source/src/avatar-assignment.ts` | Name keys, avatar allocation and displacement, legacy mapping |
| Automatic lineups | `Source/src/distribution.ts` | Easy/Balanced/Hard power-targeted selection, chance weights, exclusions, optional no repeats |
| Power estimates | `Source/src/role-power.ts` | Settings-aware 1–10 estimates; these are not measured win probabilities |
| Role information | `RoleDetails.tsx`, `RoleRulebook.tsx`, `RoleCard.tsx`, `RandomRoleDetails.tsx` | Role cards, settings, reference book, random-card details |
| Private results | `Source/src/PrivateInfo.tsx` | Investigation messages, role changes, Friends messages and replies |
| Journalist | `Source/src/JournalistEditor.tsx` | Headline and pointer/touch drawing for morning publication |
| Rankings | `Source/src/rankings.ts` | Faction/independent winner mapping and device-local standings |
| Feedback | `Source/src/interaction-feedback.ts`, `HoldButton.tsx` | Optional button sound/vibration, deliberate public-report continuation |
| Appearance | `Source/src/werewolf.css`, `role-skins.ts`, `Source/public/` | Styling, role skin variants, artwork, backgrounds, fonts, audio |
| Offline | `Source/public/sw.js`, `manifest.webmanifest`, `vite.config.ts` | Cache shell/assets, version cache at build time, relative deployment paths |
| Packaging | `Source/scripts/create-download.mjs` | Creates downloadable ZIP containing Website and Source; avoids recursively including itself |

### Legacy code warning

`Source/src/App.tsx`, `Source/src/components/`, and much of `Source/src/lib/` belong to the earlier Mafia implementation. They are retained but are not the mounted Werewolf application. Editing those screens would not generally change the active game. In particular, `src/lib/storage.ts` is not the current Werewolf persistence implementation.

## 4. Actual role roster

There are **35 selectable roles**, including Madman. The README's statement of thirty-four is outdated.

### Village: 20

Madman, Police, Intelligence Chief, Journalist, Sick Man, Villager, Doctor, Detective, Vote Marker, Team Checker, Celebrity, Visitor, Bodyguard, Sheriff, Seer, Necromancer, Mayor, Wolf Hunter, Muted, Chef.

### Werewolves: 6

Hypnosis Wolf, Infecting Wolf, Wolf Pup, Lone Werewolf, Strong Werewolf, Werewolf.

### Neutrals: 9

Charmer, Thief, Mind Flayer, Gambler, White Werewolf, Raven, Serial Killer, Survivor, Jester.

Some internal identifiers differ from visible names: `templar` is Wolf Hunter, `psychic` is Team Checker, `instigator` is Vote Marker, `rabidwolf` is Infecting Wolf, and `intelligence` is Intelligence Chief. These are existing mappings, not accidental missing roles.

### Important interactions understood

- Madman is a selectable card occupying one player slot. Before play, it becomes an eligible village-role disguise; the game separately tracks the hidden Madman condition. Most attempted abilities fail or mislead. Death information can retain the disguise; the end screen reveals the real condition.
- Police actions are resolved after everyone has acted, so blocking is not simply determined by turn order. Blocked limited-use actions have refund handling. Investigation reports are delayed when Police is present.
- Charmer creates a Friends team, not merely an extra village ally. Team tests, friendly-fire restrictions, secret betrayal, messages, and winner calculations account for that bond.
- White Werewolf is neutral despite appearing as an ordinary wolf to packmates and certain investigations.
- Lone Werewolf is initially hidden from the known pack. Infection can recruit it into pack visibility without replacing its role. Its attack probability differs when another allied wolf can attack.
- Strong Werewolf's effective attack availability follows the odd-night/fallback logic documented in the audit, not simply an unconditional nightly extra attack.
- Wolf Pup death empowers the next night; infection/hypnosis and pack choices have special multi-target handling.
- Thief changes role after successful theft and survival. Gambler has prediction, debt, next-night survival, and escape stages. Mind Flayer checks parasite coverage for a special win.
- Sheriff immunity for a real Madman is separate from ordinary temporary hypnosis.
- Doctor, shields, Mayor, Bodyguard, Raven reflection, visits, infection, revival, and role conversion have intentionally ordered processing. Tests of individual examples do not establish correctness of every combination.

## 5. Match flow and storage

### Flow

Home → player roster/library → role selection/settings → night introduction → pass-phone/private action turns → morning report → discussion → individual votes → vote result → next night or final result.

Selected role cards begin empty. The start action resolves random cards, deals roles, disguises Madmen, and resets match-specific bookkeeping. The discussion timer uses a wall-clock deadline so returning from the background includes elapsed time. Public report continuation uses a deliberate two-second hold control.

### Persistence

| Data | Storage |
| --- | --- |
| Current roster | `werewolf.names` |
| Game preferences | `werewolf.settings` |
| Avatars/photos | `werewolf.avatars.v1` |
| Saved player library | `werewolf.library.v1` |
| All-time standings | `werewolf.rankings.v1` |
| Celebrity/Charmer skins | Keys defined in `role-skins.ts` |
| **Active match, roles, turn, outstanding actions** | **React state/refs only; not restored after reload** |

Local storage is device/browser/origin specific. Clearing browser data, switching hosting origins, or changing devices does not transfer these records. A project backup to Drive is different from saving or resuming a live match.

Profiles support gallery/camera image input where the browser permits it. Images are center-cropped to 160×160 JPEGs; input files are limited to 20 MB. Avatar assignment avoids duplicate ownership among current players and can displace a previous owner. Rankings are grouped by normalized player name, not permanent account IDs. Standings are recorded when the final result screen is reached.

## 6. Distribution and settings

Manual roles, faction Random cards, and automatic distribution are distinct paths. Chance sliders are relative weights, not guaranteed independent percentages. Exclusions affect random choices but not manual role selection. Separate no-repeat and follow-chances settings exist for Random cards and automatic distribution.

Automatic distribution uses:

- Wolves: 1 for 4–8 players, 2 for 9–16, 3 for 17–20, 4 for 21–24.
- Neutrals: 0 for 4, 1 for 5–11, 2 for 12–19, 3 for 20–24.
- Village fills the remaining slots.
- Approximate village power targets: Easy 8.5, Balanced 5, Hard 2.5; wolf targets 7, 8, 9; neutral target 5.

Global options cover first-night safety, death-role visibility, secret voting, skips, discussion time, waits, music, button sounds, and haptics. Many roles have individual limits and behavior settings. First-night safety does not mean every nonlethal ability is disabled.

## 7. Offline, assets, deployment

- Service worker pre-caches the game shell, role artwork, avatars, backgrounds, fonts, and audio.
- Navigation is network-first with an offline cached-HTML fallback. Asset requests are cache-first.
- The build computes a content-derived cache revision, including published assets.
- Production offline behavior requires HTTPS or a browser-trusted local origin and a successful initial installation/cache population.
- The complete asset set is tens of megabytes; offline readiness is not instantaneous on a slow connection.
- PWA installation, audio autoplay, vibration, camera, and native sharing depend on device/browser support.
- Download Game expects `Werewolf-Game.zip` alongside the website. The original extracted Website alone does not include that ZIP, because an archive cannot include itself. The build script creates the adjacent download archive in `dist/`.
- The supplied deployment workflow assumes Source is the repository root. It remains preserved at `Werewolf-Game/Source/.github/workflows/deploy.yml`; it is **not active as a root workflow in this repository**. No deployment configuration was changed during review.

## 8. Checks actually performed

Checks ran against a scratch copy of this exact archive, using Node 22.22.3.

| Check | Outcome |
| --- | --- |
| Dependency installation (`npm ci --ignore-scripts --no-audit --no-fund`) | Passed |
| TypeScript (`npx tsc --noEmit`) | Passed |
| Production build and downloadable ZIP (`npm run build`) | Passed |
| Rebuilt vs originally shipped `Website/index.html` | Byte-identical SHA-256 |
| All original imported file hashes | Match archive |
| Eleven non-UI test files, excluding `werewolf-ui.test.mjs` | **167 passed, 0 failed** |
| Original full `npm test` attempt | **Incomplete**; two explicit failures and stalled UI progress; stopped rather than reporting a false successful result |
| Focused UI run: the two Madman failures plus Survivor shield and Neutral wait tests | **2 passed, 2 failed**; both failures reproduce |
| Neutral wait test by itself | Passed |
| Real Chromium mobile/offline smoke test | Not run: no Chromium executable was found |
| Physical phones, camera permissions, installation, original APK equivalence | Not verified |

The partial full-run log contains 264 passing assertions including nested subtests, plus 2 failures. Its last completed top-level test was number 231, Survivor shield tracking. The process continued consuming CPU without further reported progress and was terminated. The next Neutral wait test passes alone and in the focused run; the full-suite stall's cause is **not established**.

Evidence: `analysis/non-ui-tests.log`, `analysis/original-suite-partial.log`, and `analysis/targeted-ui-tests.log`. Partial counts are not a total test-suite pass count.

## 9. Findings and priorities — no fixes applied

### Confirmed: stale Madman UI tests

Two tests in `Source/tests/werewolf-ui.test.mjs` (near lines 344 and 681) fail while trying to find **Madmen (disguised roles)**, the removed count-setting UI. The current app uses a Madman card. `TESTING.md` also acknowledges the full UI suite was not rerun after this change. These failures demonstrate test/UI mismatch; they do not by themselves prove the current Madman mechanic is broken.

**Suggested next action, only with permission:** update obsolete expectations to the card-based design without silently reintroducing the old setting; then rerun the full suite and investigate the stall separately.

### Confirmed limitation: no match recovery

Reloading or closing/reopening the app loses the active match. This is documented existing behavior, not a newly introduced regression. Accidental refresh is particularly costly for a long party game.

**Possible future feature:** versioned local match snapshots and explicit resume/reset controls, with careful handling of secret information and pending action state.

### Confirmed documentation drift

The role count is stale. Some default descriptions differ from the settings-aware descriptions actually used by the UI. The README describes service-worker updates waiting until tabs close, while `sw.js` explicitly uses `skipWaiting()` and `clients.claim()`.

**Risk:** immediate worker activation during an existing match may produce mixed application/cache versions when assets change. This was identified from code, not reproduced as a device failure.

### Hardening opportunity: stored data validation

The main `read<T>` helper catches invalid JSON but casts valid JSON without checking its shape. For example, a parseable non-array value for saved names is not normalized before array operations. Settings are shallow-merged with defaults, not fully schema-validated. Some other storage readers, such as rankings and the library, do perform validation.

**Risk:** corrupted/manually edited/migrated local data can cause setup failures or nonsensical option values. Ordinary UI interactions were not shown to cause this corruption.

### Maintenance risk: centralized match controller

`Werewolf.tsx` combines many states/refs, rule coordination, and very long JSX expressions. Target-selection logic and completion requirements are partially duplicated. This increases regression risk, especially for last-turn actions, blocking, conversion, revival, and multi-night resources.

**Do not perform a broad refactor before a trustworthy regression baseline.** Small, isolated changes and focused tests are safer.

### Verification limits

Passing tests do not prove balance, original-game parity, every simultaneous-action interaction, or physical-device behavior. The full suite is not clean, the aggregate stall remains unresolved, and the real-browser smoke test has not been executed here. The game should not be labeled fully verified or bug-free from this review.

## 10. Working agreement and safe next steps

- **Redo:** undo or revise the last assistant change. If scope is ambiguous, clarify before discarding work. The original imported file hashes provide a baseline; no game fixes have yet been applied.
- **Save:** package the current project into a clearly named, versioned Drive backup, verify the upload, and report its location. Do not overwrite the original archive by default. A Drive backup does not save a live browser match.
- No feature, design, rule, or original Drive file should be changed just because a potential issue was noted in this report.
- Before any requested fix: identify the active files, explain the narrow change, preserve unrelated behavior, and run the relevant checks. Do not alter the retained legacy app by mistake.

**Bottom line:** the supplied original is a substantial working game with source, assets, packaging, documentation, and broad test coverage. It builds reproducibly, but has obsolete UI tests, an unresolved aggregate test stall, no match-resume feature, and device/interaction verification still to do. The original baseline is preserved, and no gameplay changes have been made.
