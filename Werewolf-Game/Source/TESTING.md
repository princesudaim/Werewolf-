# Werewolf reconstruction: test coverage and limits

Run `npm ci`, `npm run build`, `npx tsc --noEmit` and `npm test` with Node 22+.

The automated suite checks that every currently implemented role can be selected, dealt, take a first-night turn and reach morning in a simulated interface. It checks that the role lineup starts empty and the start-button count updates, opens every role-detail view, verifies artwork and offline-cache entries, and exercises the implemented global settings (first-night safety, death-role reveal, secret voting, skip votes, point-based distribution for all player counts, all difficulty modes, weighted chance exclusions and Madman cards, random player assignment, passive-role wait, optional game sounds and the discussion timer). It also tests selected multi-night flows, including silent Police detentions in different turn orders, delayed investigation reports, Hypnotist, Madman, Lovers, the Gambler’s next-morning escape, and a Chef with insufficient guests, plus individual engine interactions and player-avatar assignment, bottom-sheet navigation, and explicit delete mode. Disguised and Police-detained News Reporter tests check that the newspaper is silently suppressed in either turn order. The discussion timer is tested against elapsed wall time, adding a minute and returning from the background. Simulated service-worker tests exercise cache installation, update cleanup, offline navigation and GitHub Pages subdirectory paths. Ranking tests cover faction and independent winners and saving a completed game once.

This is not exhaustive validation of every role interaction, action order or win condition, nor a comparison against the running original APK. Most UI tests use a simulated DOM. A Chromium mobile-emulation smoke test additionally checks 320px and 390px phone layouts, 44px role controls, scrolling with the fixed bar, screen/turn scroll reset, role details, game start, offline reload and artwork, avatar transfer, a gallery file upload, a touch-drawn News Reporter newspaper, direct voting, and offline audio phase playback attempts. Physical-device touch/camera, browser installation and broader offline gameplay still need testing. Run the optional smoke test against a production preview with `CHROMIUM_PATH=/path/to/chromium npm run test:browser`. All roles have an optional minimum wait, and roles with configurable active abilities have additional settings; their defaults retain the existing rules. Mechanics noted as provisional in `APK_INSPECTION.md` remain provisional even when tests pass.

The per-role and option audit is in `ROLE_AUDIT.md`. `tests/game-audit.test.mjs` checks the roles under contrasting settings, infection outcomes, Friends interactions, direct partner protection and team visibility. `tests/friend-wolf.test.mjs` and `tests/wolf-nerf.test.mjs` cover secret betrayal, Lone Wolf recruitment, joint wins and the Lone/Strong Wolf attack exceptions. A UI regression covers infection of a Friends-team player and checks that their private notice says they remain on the Friends team. Passing these checks does not establish the original APK's rules or prove every multi-role combination.

Madman card tests check the village card and artwork, hidden disguises, multiple separate slots and failed or misleading disguised abilities. The old saved Madman count is no longer applied. The full UI suite was not rerun for this change.


## Mayor timing and Gambler death predictions (2026-11-01)

New regressions test Mayor declarations both first and last in the night queue, including later selections, Seer results, Celebrity private messages, News Reporter publication, Police cancellation/refunds, and the acknowledgement-only public announcement at dawn. Existing safe-first-night and double-vote tests remain relevant.

Gambler bets now cover a living target dying during the chosen night OR being voted out the following day. A target revived before dawn is not a night-death success. Night successes are removed before the day vote, so they cannot score twice or become false debts. Surviving-target bets stay open through voting. New threshold successes require survival through the following night; no immediate escape is awarded at the successful dawn. `tests/gambler-deaths.test.mjs` exercises deaths from different causes, protection, revival, escapes, conversions, Friends, debts and multiple Gamblers.

Optional real-browser regression: start a production server, then run `CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3000/ node --experimental-strip-types tests/browser-mayor-gambler.mjs`. This uses fresh browser data and checks the dawn popup, full private queue, mobile widths, and a night-success-to-next-night-escape flow. Screenshots are saved in `.cache/results/` by default.


## Friends send-once messaging (2026-11-01)

Each player can queue at most one Friends message or reply per night. A synchronous per-player night guard rejects repeated sends, resets at the next night, and hides the Friends Maker composer after sending. Replying hides only the reply controls: the received message stays readable until acknowledged. The reply box also guards rapid repeat taps and focuses the OK button after sending.

`tests/friend-reply.test.mjs` checks single send, empty replies, non-replyable messages and later-message reset. The existing two-order, three-night Friends Maker UI flows now assert composer disappearance, continued reading after replying, delivery, and next-night allowance restoration; option-off and Police blocking regressions remain in place.


## News Reporter limit correction (2026-11-01)

The owner clarified that the intended headline limit is **10 characters**, not 10 words (example: `helloooooo`). The editor, counter and role descriptions now use characters, including spaces and punctuation. Typing/pasting is capped and submission is checked again; Unicode code points are counted without splitting emoji surrogate pairs. The News Reporter tests were replaced accordingly, and other newspaper test fixtures were shortened to remain valid headlines. The Mayor browser regression also checks real sequential typing and a multiword paste before publishing. This supersedes the earlier ten-word implementation.


## Sound & Feel foundation and reliable verification (2026-11-01)

Use the named commands to distinguish the fast suite from the deliberately thorough full UI matrix:

```sh
npx tsc --noEmit
npm run test:unit
npm run test:ui
npm run build
CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3000/ npm run test:browser-feedback
```

`test:unit` discovers all non-main-UI test files without shell-specific exclusion syntax. `test:ui` includes both 35-role matrices, every Madman disguise and multi-night flows; it can take several minutes, with quiet periods inside nested groups. It has a ten-minute whole-file deadline, not a two-minute deadline that would cut off a healthy run. Do not start duplicate runs just because a nested group has not printed yet. A timeout/partial result is not a pass.

The feedback tests cover saved device-only volumes, legacy-toggle compatibility, identical private cues, two-voice/single-fallback bounds, ambience blending/reuse, gesture recovery, stale-resume cancellation, mute/background/unmount cleanup, React StrictMode listener cleanup, isolated category previews and unsupported APIs. The production-browser feedback flow checks native modal focus/Escape/Tab wrapping, 320/390/768 px layouts, persistence, current-turn preservation, handoff removal, quiet voting, synthetic visibility changes and actual browser audio API behavior. These do not certify physical speaker quality, iPhone/Android vibration feel, installation or every operating-system interruption.

The UI audit replaced obsolete global-Madman-count and Download-link assertions with the approved Madman-card/private-disguise behavior and absence of Download controls. Power checks compare effective settings (the shared older-flow fixture disables Police notifications), not a mismatched default score. The safe-night matrix never expects a private Madman label, and the Vote Marker verdict check selects the semantic heading instead of an ambiguous repeated sentence. These are test corrections, not gameplay changes.

The detailed audit/event map and completed milestone results are in the repository's `analysis` folder. Earlier paragraphs that record a change without a full rerun are historical; use the latest verification report for current results.

Latest first-feedback-milestone results: **272 non-main-UI tests and 278 complete UI tests passed**, along with all seven smart-description browser batches (79 cards), the new feedback browser flow and Friends/Mayor-Gambler/results/offline regressions. Detailed limits and preservation checks are in `analysis/EXPERIENCE_MILESTONE_1.md` at the repository root.


## Shared privacy-safe motion (2026-11-01)

`npm run test:browser-motion` runs the optional production Chromium checks (same `CHROMIUM_PATH`/`BASE_URL` setup as the feedback browser command). It checks normal, OS-reduced and manually reduced modes; live OS changes; saved device preference on reload; fixed start controls at 320/390px; Madman’s apparent card; private results and immediate outgoing-node disconnection; role-hidden public verdicts; public entrances; decorative progress; interrupted holds and the unchanged two-second completion. OS reduction cannot be overridden by the app. Turn All Off now reduces animations as well as silencing sound/vibration; the separate switch does not change audio preferences.

`tests/motion-hold.test.mjs` adds 20 fast cases, including safe preference normalization, pointer/key ownership, repeat suppression, exact 2000ms threshold, cancellation on release/leave/capture loss/blur/pagehide/hidden, unsupported capture, unmount and current callbacks after a rerender. Three new UI cases exercise persistence, all-off and private-turn preservation.

Latest complete results: **292 non-main-UI tests plus 281 full UI tests (573 total), zero failures/skips/cancellations**. The full UI run took approximately 407 seconds while browser checks also ran. All 79 smart-description browser cases and feedback, Friends, Mayor/Gambler, results and offline regressions passed again. The motion browser adds 12 private cards across the three modes. Detailed scope and limitations are in `analysis/EXPERIENCE_MILESTONE_2.md` at the repository root.

This is entry-only shared motion, not delayed screen disposal or card-back flips. No private content is kept mounted for an exit animation. Reduced mode removes movement/progress animation but never shortens the required hold or strips essential layout transforms. Background checks use synthetic lifecycle events; physical phones, real OS interruptions, subjective animation quality and real-device frame rate still need human testing. Refresh still loses an active match.


## Mobile accessibility batch 1 — setup and shared dialogs (2026-11-01)

Run `npm run test:browser-accessibility` against a production server with `CHROMIUM_PATH` and `BASE_URL` as above. `axe-core` 4.14.0 is pinned as a **development-only** dependency; it is injected by the test and is not shipped in the game bundle.

The browser checks 16 screens/states at four configurations (64 audits): 320×568 and 390×844 default text, 320×568 and 568×320 with a 200% root font. The 390px case also applies 0.12em letter spacing, 0.16em word spacing, 1.5 line height and 2em paragraph spacing. Chromium safe-area insets are overridden to top 24px, left/right 12px and bottom 34px. Native forced-color focus/state borders are checked separately in the default-text configurations.

Coverage: home, Sound & Feel, role rulebook, roster, library, empty rankings, delete mode, player form/error, photo options, avatar picker, role selection, distribution, Doctor details/settings and random details. Checks include resizable meaningful text, 44px controls in the sampled selectors, actual device-width reflow (not just `scrollWidth <= innerWidth`), clipped role-frame content, visible focused settings/search, Tab boundaries, Escape/opener restoration, sheet-content focus and last-control clearance above fixed bars. Nine fast hook tests cover modal/StrictMode cleanup, Tab filtering, content switches, removed openers, footer observation/cleanup and ResizeObserver fallback. Three additional UI regressions cover public-dialog focus, avatar-sheet focus and the named power badge.

Latest complete verification: **301 non-main-UI tests and 284 full UI tests (585 total)** passed with zero failures/skips/cancellations. Full UI took approximately 430 seconds. All 79 smart-description browser cases and the feedback, motion, Friends, Mayor/Gambler, results and offline browser flows passed again. Existing role rules, descriptions, distribution/power and private-action/voting/results branches were preserved.

No detected violations in the configured automated WCAG A/AA rules is **not** full WCAG conformance. Axe still reports contrast items needing manual review (including image/transparency/visibility contexts); sampled authored color pairs are recorded separately. Real Android/iPhone font scaling, camera/file pickers, real safe areas, VoiceOver/TalkBack, all screen-reader announcements and physical-device usability are unverified. Large-text gameplay screens outside setup/shared dialogs are a later batch. Detailed results are in `analysis/EXPERIENCE_MILESTONE_3.md` at the repository root. Refresh still loses an active match.


## Mobile accessibility batch 2 — gameplay and private acknowledgement (2026-11-01)

`npm run test:browser-gameplay-accessibility` checks 72 real game states across 320/390px default text, 320px/landscape 200% root text, spacing, synthetic safe-area insets, reveal on/off and secret-vote on/off. It checks long names, native private-modal isolation/acknowledgement, target pressed state, neutral handoff focus, immediate old-node disconnection, discussion, voting, verdict, winners and rankings. Device client width is used so a widened mobile layout cannot falsely pass.

The existing seven smart-description browser commands accept optional `TEXT_SCALE=2`. All 79 cases passed at both normal and 200% root text (158 cards across all 35 roles). Their width checks now use the document client width rather than overflow-expanded `innerWidth`. `browser-friend-messages.mjs` accepts `TEXT_SCALE`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT`, and optional `A11Y=1`; its complete three-night flow passed at 200% on 320×568 and 568×320, adding eight composer/message audits in each configuration. `browser-mayor-gambler.mjs` and `browser-results.mjs` accept `TEXT_SCALE`; results also accepts `A11Y=1` for five unsafe-night/verdict/wolf-victory/rankings audits. The additional Friends/results audits wait for finite CSS entrance animations to finish before measuring settled contrast. They do not insert delays into the game itself or certify every animation frame.

Latest verification: **305 fast/non-main-UI tests and 286 complete UI tests (591 total)**, zero failures/skips/cancellations. Full UI finished in approximately 525 seconds while browser checks ran. Four new PrivateInfo tests cover native opening, required acknowledgement/Escape, changing Tab boundaries, StrictMode and removal without implicit acknowledgement; two new UI tests cover neutral handoff focus/repeat keys and target pressed state. All 64 setup/shared-dialog audits and feedback, motion, Friends, Mayor/Gambler, results and offline regressions passed again, including enlarged-text Mayor/Gambler and unsafe-night results flows.

Private information now uses the shared native-dialog focus helper; background controls are inert while it is open. Escape does not dismiss/acknowledge private reports or messages. Reply allowance, draft reset, send guards, delivery timing and close callbacks are unchanged. Handoff/voter focus moves to non-actionable headings, never an automatic reveal/vote button. The public Mayor announcement uses the shared focus helper without changing dawn timing. Public results/rankings use a supported named group rather than a generic labelled div; the existing results unit cases assert both group names. No extra game delay or live secret announcement is added.

All 113 additional changes in existing werewolf.css are default-16px-equivalent font conversions. Responsive gameplay overrides are isolated in gameplay-accessibility.css. Engine, descriptions, distribution, scoring and feedback/motion controllers are unchanged. Real-device font scaling, physical keyboard/OS interruptions, VoiceOver/TalkBack, drawing/camera/file-picker accessibility, continuous-hold assistive interaction and remaining manual contrast review are not certified. See `analysis/EXPERIENCE_MILESTONE_4.md` at the repository root. Refresh still resets an active match.


## Setup and learning clarity — first batch (2026-11-01)

The production setup audit now checks **96 screen/states** (the former 64 plus How to Play/reference, keyboard-open optional setup guidance, Random uniqueness, matching/invalid/excess/corrected lineup states in every configuration). Run `npm run test:browser-accessibility` with the browser environment above. It verifies that an invalid all-Villager lineup still fails the existing engine check, then corrects it through real pointer clicks at normal/200% text and portrait/landscape sizes. Opening guidance or distribution options does not change counts; choosing a distribution mode still uses the unchanged generator.

The Start bar keeps a visible action label and public count reason without claiming that matching counts guarantee a valid game. Long lineup errors have a keyboard-focusable scrolling region; native End/Home are checked after the browser's keyboard-scroll animation settles. At short viewport heights the setup header scrolls away, and controls account for the fixed footer when scrolled into view. Roster count guidance is inline so it cannot make the roster footer cover add/edit controls. These are layout changes only; start/disabled conditions, validation, adjustments, profiles and persistence are unchanged.

Latest totals: **317 fast tests + 291 full UI tests = 608 passed**, zero failures/skips/cancellations. The complete UI run finished in about 530 seconds, within its existing ten-minute limit. Twelve new stateless-help tests and five new app scenarios cover missing/excess counts, count-not-validity, random/library scope, uniqueness-setting copy, public-reference focus return and non-mutating guidance. Two existing notice assertions now target their specific notice because setup also has a count status.

All 158 private-card browser cases (79 normal + 79 at 200% root text), all 72 gameplay accessibility audits, sound/motion/three-night Friends/Mayor-Gambler/results/offline regressions, typecheck and production build passed. The enlarged Mayor/Gambler and unsafe-night results checks passed too. All previously protected game source remains byte-identical apart from public setup rendering in Werewolf and helper labels in PlayerSetup; see `analysis/setup-clarity-source-preservation.log`.

This completes only the first setup/learning batch, not the whole settings/flow roadmap. No secret-state recovery, new storage or consent flow was added. Physical-device text scaling, touch feel, assistive technologies and remaining manual contrast contexts are still not certified. See `analysis/EXPERIENCE_MILESTONE_5.md`.


## Settings organization — second setup batch (2026-11-01)

Public GAME SETTINGS now has five named groups: lineup tools, voting/reveals, night safety, turn timing, and sound/animations. Each duration appears directly after its switch. Turning a wait off hides its slider, not its saved duration. Shared timing help explains that the longest applicable wait wins; no new timing implementation is introduced. Main settings remain controlled by the existing Werewolf state, changeSetting, save effects and distribution callback. SetupSettings has no state/effects/storage/RNG or dealt-player access.

Latest verification: **331 fast + 295 complete UI tests = 626 passed**, zero failures/skips/cancellations. The complete UI run took approximately 479 seconds within its unchanged ten-minute limit. Fourteen new component cases verify the existing nine boolean keys, two durations/bounds/fallbacks, discussion bounds, exact distribution modes/independent flags, controlled defaults, non-mutating render and navigation-only callbacks. Four new app scenarios cover retained saved role settings/durations, the actual longest-wait behavior through grouped controls, Sound & Feel state/focus/lineup preservation and in-memory settings when storage writes fail.

`npm run test:browser-accessibility` now performs **124 audits**. Seven new states per configuration cover both waits enabled, one disabled, restored values, both disabled, setup-to-feedback modal navigation, shared applied values, and real reload/reopening. Test seeding occurs once per isolated context rather than overwriting settings on each navigation, so persistence checks exercise actual saved values. Both sliders use real keyboard input and have at least 44px targets. The earlier 96 states, error scrolling/correction, focus, 320/390px/200% portrait/landscape, spacing and synthetic safe-area checks remain included. Snapshots/audit records retain manual-review items; this is not full WCAG certification.

The 72 gameplay accessibility audits, all 158 normal/enlarged private-card cases, feedback/motion, three-night Friends, enlarged Mayor/Gambler and unsafe-night results, and offline smoke passed. A final wording-only refinement to role-minimum help was rechecked with the fast suite and the expanded production setup audit. Existing default values, storage keys/schema, engine, descriptions, private UI and prior styles are untouched. See `analysis/settings-organization-source-preservation.log` and `analysis/EXPERIENCE_MILESTONE_6.md`.

No reset control, new default, migration or recovery feature was added. Changes apply in memory even when saving is unavailable; the help deliberately qualifies device persistence instead of claiming a successful save. Physical-device/assistive-technology and remaining manual checks still apply.


## Night/day turn-flow clarity — first batch (2026-11-01)

`npm run test:browser-turn-flow` adds **48 resource-state audits** across eight full three-night flows: Sheriff shot, Necromancer revival, Vote Marker use and Mind Flayer stock, with 0%/100% regeneration. Configurations cover 320/390px, spacing, 200% root text in portrait/landscape and synthetic safe areas. Hint text doubles with the root font; old nodes disappear at handoff; no hint appears while the action is available. The help is plain text, not a new control/live region/focus target. Morning progress uses the same callback and Mayor guard and describes its actual next destination.

Latest verification: **337 fast + 300 complete UI tests = 637 passed**, no failures/skips/cancellations. The final full UI run took approximately 366 seconds. Five new UI scenarios cover single-shot/every-night Sheriff, the same apparent-role hint for a disguised Madman, and terminal/nonterminal morning destinations. Existing resource/refund scenarios check unavailable versus retained-use hints. Two old multiple-death test variants initially expected the previous visible OK label; their expectations now match the intentional CONTINUE → label and destination association, retaining death/reveal/transition assertions. The subsequent whole-file rerun passed, not just the focused cases.

All **124 setup**, **72 gameplay** and **158 normal/enlarged private-card** checks passed again, plus feedback, motion, Friends, enlarged Mayor/Gambler, enlarged unsafe-night results and offline/drawing regressions. No detected configured automated violations, new runtime errors or sampled overflow. Manual-review contexts and physical-device/AT checks remain separate. See `analysis/EXPERIENCE_MILESTONE_7.md` and `analysis/turn-flow-source-preservation.log`.

The existing Werewolf module is byte-identical to milestone 6 after removing the exact help/copy/footer presentation changes; all other existing source files remain identical. No action guard, target, counter, hidden outcome, queue, callback, timer, description, engine, scoring, storage, motion or feedback implementation changed. Hidden blocks/protections are deliberately not explained. This is not a full unavailable-action rewrite, real-device certification, or secret-state recovery. Remaining voting/results/reference/reset polish and reliability/update/performance work stay open.


## Voting guidance and queue progress (2026-11-01; historical, superseded below)

Voting now shows Voter N of M from the existing queue, not ballot length. Brief guidance explains selecting then confirming, the public secret-vote setting and whether skipping is enabled. Guidance never receives ballots, selected names, roles or vote weights, and has no interactive/live/status content, state, effects, storage or feedback. The same voter heading retains focus and all existing target/confirmation/skip conditions and callbacks remain unchanged.

Latest verification: **342 fast + 304 complete UI tests = 646 passed**, no failures/skips/cancellations. Full UI took about 450 seconds within the unchanged ten-minute deadline. Five new component tests cover the four option combinations and progress replacement. Four new app cases cover complete secret/public and skip/no-skip queues, confirmation/selection reset and guidance removal. Existing Mayor double-vote and multi-night Vote Marker tests now verify queue progress while retaining their mechanics assertions.

`npm run test:browser-gameplay-accessibility` now checks **144 states** (the prior 72, each with skip enabled and disabled). All eight viewport/skip configurations cover actual voting through verdict/winners/rankings: 320/390px normal, 200% portrait/landscape, spacing and synthetic safe areas, secret/reveal variations, plain guidance, root text scaling, voter focus and fresh selections. A wolf casts an ordinary vote rather than skipping in no-skip fixtures; the unchanged final village outcome/reveal/hold checks still pass. Font comparisons pair the same skip configuration.

All **48 resource-state**, **124 setup/settings** and **158 normal/enlarged private-card** browser cases passed, along with feedback, motion, three-night Friends, enlarged Mayor/Gambler/results and offline/drawing regressions. Typecheck and production build passed. Source preservation is whole-module byte equality after removing only the helper import/insertion and handoff string; every other existing source file, including engine, descriptions, verdict/results, hold and earlier CSS, remains identical to milestone 7. Package/dependencies are unchanged.

See `analysis/EXPERIENCE_MILESTONE_8.md`, `analysis/voting-clarity-source-preservation.log` and `analysis/voting-clarity-final-parity.log`. Two sample voting layouts were visually reviewed, not tested on physical phones. Automated results do not certify complete WCAG compliance, OS scaling, physical touch/keyboard, VoiceOver/TalkBack or remaining manual contrast contexts. Refresh still loses the active match.

The owner's requested save was completed **before** this batch: milestone 7 is verified on Drive, with earlier backups retained. This subsequent batch is local and is not being represented as already saved to Drive.


## Offline cache isolation — first reliability batch (2026-11-01)

Only the production worker changes. Its cache family now includes the encoded registration-scope path with a raw colon separator, preventing root/Pages/sibling/nested (including hyphen-led) scopes from sharing or evicting each other's caches. Navigation fallback and static reads use the current worker's own cache, not global CacheStorage matching. Activation removes only its exact scoped family. Unknown-owner unscoped legacy caches remain: this avoids deleting another installation but can retain old static data; migration/quota review remains open. CORE, install/addAll, skipWaiting/claim, guards and network-first policy are unchanged.

**347 fast + 304 full UI tests = 651 passed**, no failures/skips/cancellations; UI completed in about 441 seconds. Seven worker tests cover full static assets, stale-cache shadowing, missing own shell/assets failing without foreign fallback, own-revision cleanup, failed install and repeated activation across root/sibling/nested/encoded/hyphen-led paths. Two new regression checks fail against the original worker, with expected-failure evidence retained separately.

After building, optional `CHROMIUM_PATH=/path/to/chromium npm run test:browser-offline-updates` runs the actual production app in an isolated ephemeral HTTP fixture; it does not change the live preview. Three consecutive final runs passed: two installations coexist; one updates while a private card stays open without reload; the old match finishes exactly one turn normally; own cache replaces its old revision without evicting its sibling; stale unrelated entries cannot shadow offline documents/assets; failed atomic precache preserves the working offline build. The fixture waits for the newly installing worker's actual activated state rather than an already-active older worker. Deliberate fixture reload returns to home, not a recovered secret turn.

The root-scope offline/drawing/audio-attempt smoke, 144 gameplay audits, targeted elapsed-time/background/add-minute timer case and all 158 normal/enlarged private-card cases passed. A partial card run during a concurrent build was discarded; the complete matrix passed against a stable final build before documentation rebuilding. All application src files and complete HTML are byte-identical to milestone 8. No rule, role, description, target, vote, timer, scoring, UI, registration or private-state storage code changed.

HTML remains 508,746 bytes (141.28 kB gzip). The unchanged 75 CORE entries sum to 44,368,991 raw response-body bytes (42.31 MiB), not browser disk/quota/transfer/device-performance measurements. No media/dependency was added or removed. Existing automatic activation policy remains; no page reload was added. Per-client asset pinning/coordinated update UX, legacy cleanup/quota failures, range/audio/offline device behavior and measured performance optimization remain open. No physical-device, AT or full WCAG certification. Refresh still loses an active match.

See `analysis/EXPERIENCE_MILESTONE_9.md`, `analysis/offline-isolation-source-preservation.log`, `analysis/offline-isolation-final-parity.log` and `analysis/offline-isolation-asset-measurement.json`. Latest Drive save remains milestone 7, not these subsequent local changes.


## Browser-reopen recovery — historical stage 1 (2026-11-01; superseded below)

The owner requested recovery and chose persistence after closing/reopening the browser, rather than tab-only recovery. The approved direction is an explicit per-match switch, local browser storage, 24-hour validity, neutral recovery/private reveal and clear/discard controls, without PIN/encryption claims. This is now the priority, ahead of remaining cosmetic/offline optimization.

**At the stage-1 checkpoint, recovery was not available and refresh still lost the match.** Stage 1 adds only an unimported, pure storage/codec module and tests. No existing game module changes and no live role/message storage starts. Full snapshot validation, exclusive-tab ownership, ranking-credit idempotence, commit timing, deadline restoration, UI consent and privacy-gated resume remain integration work. See `analysis/RECOVERY_IMPLEMENTATION_STAGE_1.md` and `analysis/RECOVERY_STATE_INVENTORY.json` (79 parent state declarations, 34 model refs; inventory is not a persistence allowlist).

**38 new focused recovery tests and all 385 fast tests passed**, plus typecheck/build. Tests use an in-memory storage fixture: fixed expiry/revisions, typed Sets/undefined/null-prototype/negative-zero round trips, safe user keys, malformed/versioned records, bounded encoding, getters/cycles/unsupported values, pending/commit markers, all three write failure phases, blocked storage and honest failed-deletion reporting. No new browser recovery flow is being claimed tested. The 304 full UI tests last passed in milestone 9 and are not added to this stage's fresh totals.

All existing application source, package/dependencies and worker are unchanged. Entire HTML remains byte-identical to milestone 9 (508,746 bytes); recovery code is not in its import graph. The foundation API is not an encryption or multi-tab transaction protocol. Expired inspection returns no payload but does not delete data without coordinated cleanup. If all storage changes are denied, the API explicitly reports that an older checkpoint might still be usable; integration must not claim the newest action was saved. No Drive upload, push or external deployment.


## Browser-reopen recovery — integrated stage 2 (2026-11-02)

On Choose Roles, **Save this match for recovery** is off by default and applies only to that match. The local plaintext checkpoint expires 24 hours after first save; autosaving does not extend it. Browser reopen first shows a neutral gate, then private turns require a named-holder reveal. Finish/discard removes recovery, not profiles/rankings. Unsupported Web Locks and downloaded file URLs can still play without recovery. No PIN, encryption, cloud backup or guaranteed storage retention is claimed. Unsent child-editor text/drawings may need re-entry.

Run `npm run test:recovery` for the 81 focused tests (38 foundation + 43 integration). `npm run test:unit` discovers them automatically: latest fast total **428**, not 428 plus 81. **304 complete UI tests passed** again in the release run (about 482 seconds); together with fast tests this is **732 passed**, without double-counting the focused subset. Integration tests check strict complete-model validation, all known role shapes, negative Vote Marker sentinel attempts, all 70 state/34 ref registrations, exact timer transitions, explicit consent, unchanged fixed expiry, Sets/resources/results, ownership and rereading, honest storage failures/retry, automatic expiry, unsupported/file contexts, and atomic/idempotent standings with legacy reads.

With a stable production build served on HTTP(S):

```
CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3000/ npm run test:browser-recovery
```

Do not rebuild its served directory during the run. The command executes the recovery/privacy/ranking test, controlled-clock deadlines test and natural all-role night. `npm run test:browser-file` separately verifies the actual downloadable file URL. It uses disposable browser profiles, not user saves. The first test actually closes and relaunches Chromium with the same persistent profile; it does not model restart by manually reinserting storage. Separate controlled fixtures deliberately exercise crash windows and expiry, without production-only test hooks.

Latest browser results: 47 recovery checkpoints; 35 natural role turns with 40 full 104-field reload comparisons; original waits and first-frame disabling; elapsed discussion gate to original first voter/seed ballots; fixed TTL auto-erasure; score-write retry, interruption before scoring, replay of pre-credit end after scoring without duplicate totals, finish/discard cleanup; configured axe/focus/320px/200% text; cross-tab lock/erase refusal. Existing 124 setup, 144 gameplay and 48 resource-state audits, all 158 normal/enlarged private cards, root offline/drawing, Mayor/Gambler, Friends, results, motion and feedback regressions passed again. Physical device/OS/AT, eviction and low-end performance remain manual work, not certified by these runs.

See `analysis/RECOVERY_IMPLEMENTATION_STAGE_2.md` and `analysis/recovery-integration-*` in the repository reports. Existing engine, all smart descriptions, pending-message/action/resolution/vote/target logic, winning-player rules and scoring arithmetic are preserved. Only ranking storage and the parent recovery wiring change among previously existing game source files. No dependencies, roles, balance rules, server save or automatic page reload were added. Latest Drive backup is still milestone 7; this batch is local.


## Offline readiness and waiting updates (2 November 2026)

At the home menu, **OFFLINE & UPDATES** distinguishes a first download that needs reopening, checked file presence, missing files, an unavailable check, downloading/failed updates and a waiting update. **CHECK OFFLINE FILES** only asks the current worker whether its expected cache entries are present. It does not download/repair files, clear profiles/rankings/recovery, activate an update, or reload the page. The control stays mounted/focused while checking; repeat actions are ignored until it finishes.

For the first installation, keep the page online, wait for the download and close/reopen at the menu **before relying on offline play**. Do not refresh an active match merely to install or prepare offline use. Updates wait for all old game tabs and installed-app windows to close; reopen afterward. A waiting update is explained only at the menu, never over a private turn or recovery gate.

The check confirms cache-entry presence, not content digests, audio playback, permanent retention or physical-device support. Browsers can remove files later; graceful repair remains future work. An old worker without the status protocol, a timeout, blocked messaging or a cache error cannot produce a false ready message. Missing MessageChannel does not disable service-worker installation or online gameplay. Recovery is a separate per-match opt-in, fixed 24 hours, local plaintext private state, no PIN/encryption/cloud-sync promise.

Current automated verification: **463 fast + 304 complete UI = 767 passed**, plus three consecutive multi-tab/offline/readiness browser runs, normal/200% mobile home audits, root smoke, actual browser-reopen/deadline/all-role recovery and file:// checks. These are not physical-device/AT certification. See `analysis/OFFLINE_READINESS.md` and the final artifact record for detailed scope and evidence.

The latest independently verified Drive save remains the integrated recovery archive, before subsequent local update work. This continuation restored that archive after the checkout contained only the initial README, then reconstructed and reverified the missing local waiting-worker policy. Earlier backups were not modified; the new changes have not been uploaded to Drive or deployed to GitHub.


## Checksum-pinned missing-file repair

Run `npm run test:browser-cache-repair` with `CHROMIUM_PATH` and any platform library path configured. It serves isolated production alpha/beta installations and checks 12 privacy/integrity/recovery/update scenarios, including same-length corrupt bytes, non-atomic hosting, missing/full cache refill, neutral missing-page fallback, exact saved payload/expiry, rankings/avatar/name/settings retention, native waiting and sibling/unknown-cache retention. It audits the neutral page at 390×844/16px, 320×700/32px and 844×390/32px. Screenshots and JSON are under `.cache/results/`.

The existing `test:browser-offline-updates` fixture recalculates embedded checksums for its deliberately version-injected HTML/manifest. Do not weaken product checksum checks to accommodate fixture transformations. Build-revision coverage checks emitted digest metadata, repair-page-only invalidation, literal dollar-marker embedding and a deliberately lowered staging-budget rejection. Worker VM tests use real Response/crypto validation and simulated failed writes; these do not certify physical-device quota/eviction or media playback.

Release evidence is in `analysis/CACHE_REPAIR.md`. Presence-ready still does not certify the content of every existing cached response. No production private data is needed by these tests.


## Consolidated Settings layout

`npm run test:browser-settings` checks that feedback switches and match-recovery controls exist only inside Settings, that setup has no quick guide or duplicate switches, that nested recovery confirmation traps focus and Escape cancels only that confirmation, and that opening/closing Settings preserves the private turn and checkpoint. It audits the Settings dialog at normal mobile size and enlarged portrait/landscape text. Refresh recovery must retain the exact payload/match ID/original expiry; envelope revisions may legitimately advance during resume. `tests/recovery-settings.test.mjs` keeps ranking retry reachable even when recovery is off. Existing sound/recovery/file/browser suites use the new Settings navigation. No media assets or feedback-engine defaults changed.


## Thief release regression

`npm run test:unit` covers the default death-only mode, three target lifetimes, original dead-target role inheritance, simultaneous Thieves, surviving/dead/escaped/revived actors and targets, blocked/corrupted attempts, Detective-map preservation, policy-specific descriptions and points, and validation of legacy saves without either new setting.

`npm run test:ui` exercises the legacy attacking path explicitly plus five new-mode cases: settings/default power, a safe-night watch followed by last-Werewolf vote inheritance, and the actual next-night UI for all three target policies. Full results: **522 unit + 309 game UI = 831 passed**.

Run `CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3001/ npm run test:browser-thief` against a stable production build (set platform Chromium library paths if required). It uses actual play and recovery, not injected victory results: pending/committed watches, neutral/private gates, all three lifetimes, last-Werewolf night/vote deaths, simultaneous Thief death, pre-change active-save compatibility, original expiry and responsive/enlarged-text Thief settings audits. Verdict continuation deliberately uses the real two-second hold.

The stable release also passes Settings, feedback, root smoke, 49 recovery checkpoints, deadline recovery, 35 natural role turns / 40 complete 104-field snapshot comparisons, file:// smoke, 144 gameplay accessibility audits, missing-cache repair and native/offline-update regressions. No rebuilding is allowed while worker/cache/update checks run. Browser checks do not certify physical audio/haptics, a real screen reader, or measured role balance. Release evidence is in `analysis/THIEF_REWORK.md` and `analysis/THIEF_RELEASE_ARTIFACTS.json` in the repository.


## Compact home menu regression

`npm run test:browser-home-menu` checks six portrait/landscape configurations (320–844px, normal/200% text): equal half-width help links on one row, full-width START GAME, top-right icon-only Settings with a 44px touch target, hidden home offline panel, Settings-only offline controls, keyboard focus return, unchanged local storage, all original navigation destinations, 12 accessibility audits and no horizontal overflow. Screenshots and results are in `.cache/results/home-menu*`.

`browser-cache-repair.mjs` and `browser-offline-updates.mjs` open Settings explicitly when exercising offline status/check/repair/update controls; private-turn/cache/data preservation assertions remain intact. UI suite includes one additional structural/navigation test (310 UI); unit total remains 522. See repository `analysis/HOME_MENU_LAYOUT.md` and `HOME_MENU_RELEASE_ARTIFACTS.json` for current release evidence.

## Celebrity limited-fame regression (2026-11-02)

New matches have automatic **1 or 2 successful fame nights**, default 1, per actor. Audience stays 1–3. Successful assignment spends one night regardless of audience. Police/hypnosis suppression spends nothing. Police-delayed private delivery remains intact, including Police dying with a pending message. Revival does not replenish fame; an inheriting Thief uses its own actor allowance. A new match resets the ledger.

- `npm run test:unit`: **545 passed**, including finite/legacy fame, independent actors, no-recipient/dead actors, settings/power/descriptions, strict malformed-ledger rejection, and additive recovery migration. A finite saved match missing its ledger fails closed, rather than refilling fame.
- `NODE_OPTIONS=--max-old-space-size=1536 npm run test:ui`: **310 passed**, all existing game scenarios; intentionally removed setup copy/Preferences assertions now match the approved compact setup.
- `CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3006/ npm run test:browser-celebrity`: natural multi-night 1/2-night limits; audiences 1/3; independent Celebrities; Police blocking/retry, pending delivery and Police death in both modes; natural Necromancer revival; active hypnosis recovery; old 104-field saves; new-match reset; actual passive Thief inheritance; neutral/private recovery gates, unchanged match ID/expiry and full payload equality; settings and private-turn axe checks.
- Every `tests/browser-*.mjs` safety suite is rerun against the stable production build, including all seven description batches, results, Mayor/Gambler, Friends messaging, sound, motion, turn flow, home/settings layout, all-role recovery, deadlines, file loading, native/offline updates and cache repair. Description batches also run at 200% text. Do not rebuild during native worker/cache tests.

Snapshot schema remains `werewolf-match-1`: 71 state + 34 ref fields (105 total). Pre-change saves without the new setting and ledger migrate with an empty ledger but keep unlimited Celebrity rules and original expiry. No forced worker activation, user-storage clearing or cloud migration is performed. Recovery remains opt-in, local plaintext, 24-hour fixed expiry.

The setup accessibility harness reports viewport-edge target-size findings separately and verifies each affected control after focus/scroll: real 44px dimensions, unobscured hit target, and a fresh target-size audit. This is not a blanket rule suppression. Automated checks do not certify physical-device feedback, screen readers, full WCAG conformance or game balance. Repository evidence: `analysis/CELEBRITY_NERF.md`, `celebrity-browser-suite-results.json` and `CELEBRITY_RELEASE_ARTIFACTS.json`.

## Morning hold and discussion controls (2026-11-02)

Morning Continue now uses the same shared two-second HoldButton and progress animation as the vote-out screen. Tapping, early release, blur/visibility changes and refresh cannot complete a partial hold. The Mayor announcement still disables Continue until acknowledged. Reduced-motion preferences retain the existing static hold behavior.

Game Settings → Turn Timing now has **Manual discussion controls**, ON by default. OFF completely removes both End Discussion and +1 Minute; the original absolute deadline still advances automatically to voting. **Discussion time** is a keyboard-accessible range from 30 to 180 seconds in 30-second steps, default 60 seconds. It is stored as fractional `discussionMinutes` to avoid changing the recovery schema. Fresh setup preferences are bounded; existing active saved deadlines/durations are not rewritten, including legacy 15-minute discussions. Missing legacy toggle means existing manual controls remain available.

Verification: **566 unit + 316 full game UI tests passed**. Every one of the **27 browser suites passed**, plus all seven description batches at 200% text (34 runs). `npm run test:browser-discussion` tests all six slider stops, default ON/add/end behavior, OFF controls absent, real animated hold duration/cancellation, interrupted-hold recovery, original match ID/expiry/deadline and timer-only automatic voting after refresh. Browser flow helpers now deliberately hold report buttons rather than bypassing with clicks; all gameplay assertions remain in place.

Evidence: repository `analysis/discussion-*` logs, `discussion-browser-suite-results.json`, `MORNING_DISCUSSION_RELEASE.json`. Physical-device/screen-reader/full-WCAG certification remains separate.

## Requested randomization defaults

Both Randomizer options and both shared Random-card options now default ON: one player per role and follow role chances. Unversioned old setup preferences are updated once so previously persisted OFF defaults do not hide this correction; later deliberate OFF choices remain saved. The separate `werewolf.random-defaults.v1` marker is written only after preferences are written. Active recovery payloads are never migrated to different randomization rules. Role chance weights, disabled roles, manually chosen counts, generated-role uniqueness and distribution algorithms themselves are unchanged.

`random-default-preferences.test.mjs` checks all four defaults, one-time upgrade and persistence/write failures. Full UI keeps legacy-rule scenarios explicit and adds fresh/old-profile default checks for both controls and all three Random-card teams. `npm run test:browser-random-defaults` checks actual 0%-chance exclusions, unique Randomizer output, exclusion of manually added roles from Random-card picks, duplicate prevention, exact match recovery and later OFF persistence.

Latest correction verification: **577 unit + 318 full UI tests passed**; all **28 browser suites** plus seven 200%-text description batches passed (35 runs). Current release evidence is in repository `analysis/RANDOM_DEFAULTS_RELEASE.json`, `RANDOM_DEFAULTS_QA.md` and `random-defaults-browser-suite-results.json`. Only the existing latest preview (port 3009) is used.

## Plain Celebrity, Lone Wolf and Thief copy (latest description-only correction)

Celebrity uses the requested two-line default, including after its fame allowance is spent. Audience, two-night and legacy unlimited settings use one simple fame sentence. No automatic-action, successful-night, blocked-night or exhausted-fame boilerplate remains. Thief combines its non-attacking choice and timing policy, omits the repeated new-team statement, and retains the survival requirement, voted-out inheritance and Friends exception. Lone Wolf uses plainer attack wording and omits odds/attack-target details on scheduled non-attack nights. Gameplay is unchanged; the other 32 role descriptions are unchanged.

Only description-related tests were run for this correction: **103 description unit tests, seven focused related checks, four selected UI tests, and four browser runs** (the first, fourth and sixth description batches, plus fourth batch at 200% text). Typecheck and production build passed. The full gameplay/unit/UI/browser suites were **not** run. Prior full-suite results above belong to earlier releases, not this correction.

New focused coverage: `tests/simple-role-copy.test.mjs`. UI selection: `--test-name-pattern='smart (first|fourth|sixth)-batch descriptions|plain Thief descriptions'`. Related selections: `Celebrity descriptions` in `celebrity-limited-fame.test.mjs`, and `concise accurate death-only description` in `thief-death-only.test.mjs`. Evidence: repository `analysis/SIMPLE_DESCRIPTIONS_QA.md`, `SIMPLE_DESCRIPTIONS_RELEASE.json` and `simple-descriptions-*.log`. Existing preview port 3009 only; no new preview, storage clearing or recovery migration.


## Cleaner voting screen (latest UI correction)

Removed the requested roster-editing paragraph and the complete voting-help panel, including the voter count. The current voter's name is now 2rem (32px at default text size), on its own line; the portrait is 96px square (80px on narrow phones), up from 50px. The short private-handoff reminder remains. Voting rules, ballot privacy, skip settings, target eligibility, selection confirmation, recovery and scoring are unchanged. The focused heading remains keyboard/programmatic-focus accessible. Obsolete VotingHelp component/styles/tests were removed; identity and queue coverage now lives in the selected app tests.

Targeted verification: **14 setup-help tests + eight selected UI tests passed**, including all secret/open and skip-on/off combinations, successive voter handoffs, Mayor double voting and multi-night Vote Marker behavior. Typecheck/build passed. `npm run test:browser-voting-layout` passed four desktop/phone/200%-text/landscape cases, all 24 voter handoffs, correct loaded portraits, no horizontal overflow and four targeted axe audits. This was not a full regression run. Browser results and screenshots are generated outside packaged Source. Evidence: repository `analysis/VOTING_LAYOUT_QA.md`, `VOTING_LAYOUT_RELEASE.json` and `voting-layout-*.log`. Published on the same sole preview, port 3009.

## MVP rankings and instant replay (current)

See `MVP_RANKINGS.md` for transparent scoring, tie-breakers, limitations, tier order and replay behavior. `match-performance.test.mjs` covers goals, saves, attacks, neutral progress, idempotence, ties, deceased/losing MVPs and malformed ledgers. `replay-match.test.mjs` requires the reset helper to cover every registered match field. Recovery integration covers old saves without performance history and new ledger round-trips. Match-results tests cover a single list/MVP and disabled replay until standings are saved. The selected app cases retain scoring, Madman disclosure, Friends/wolf shared wins, Police, infection, Lone Wolf, Thief and multi-night role behavior, plus a complete immediate replay.

Run `npm run test:browser-mvp` against the stable production preview. It plays a real save/check/vote match, checks the correct Doctor MVP and 9-point explanation, then replays with a fresh deal. Four desktop/phone/200%-text/landscape configurations cover correct tier order, loaded portraits, overflow, result-screen axe checks, original setup retention, empty resources/MVP ledger, a new recovery ID and once-only standings. `browser-results.mjs` now checks the single ranking list instead of obsolete view-switch buttons.

Verification evidence lives in repository `analysis/MVP_RANKINGS_QA.md`, `MVP_RANKINGS_RELEASE.json`, `mvp-unit.log`, `mvp-selected-ui.log`, `mvp-browser-results.json` and `mvp-combat-parity.json`. No complete UI matrix or all-browser-suite run was performed for this change. Only the existing preview on port 3009 is used. Background sound replacement is a separate next step.

## Cached preview delivery fix

An existing offline-controlled Arena iframe can continue showing the old results page even when the server serves the new build. Refreshing `/` intentionally does not activate a waiting worker. The preview server now exposes **`/latest-preview.html`**, a no-store online entry mapped directly to the current `index.html` without redirecting back to the cached root. Start it with `python3 scripts/serve-preview.py --port 3009 --directory ../Website`. In the Arena preview address field replace `/` with `/latest-preview.html`. This entry always follows future published builds without duplicating generated HTML.

This is an online preview route, not a replacement for the canonical offline entry. It preserves the same origin and installation directory (including recovery key), never clears user storage/caches, never sends activation commands and never reloads an open match. The standard `/`/`index.html` offline policy is unchanged. Finish or recover an active match before navigating away; completed old matches have no full action ledger to reconstruct retroactive MVP scores.

Four Python handler tests passed (`PYTHONDONTWRITEBYTECODE=1 python3 tests/test_preview_server.py`), along with a real-browser reproduction using the actual pre-MVP worker/build: cached `/` remained old with a waiting update, while the latest entry loaded the new game, preserved profiles/standings, left the old client/cache untouched and displayed MVP/START AGAIN after a real match. All 78 static assets shared by those builds were byte-identical. The actual port-3009 latest entry also passed the existing full results-flow/browser accessibility test. Evidence: repository `analysis/PREVIEW_CACHE_BYPASS_QA.json`, `preview-cache-bypass-browser.log`, `preview-server-tests.log` and `preview-latest-results-browser.log`.

## Previous audio replacement (NIGHTFALL II — superseded)

The earlier superseded sound set contained 18 original instrumental loops and 30 original short cues, a role-blind private-turn policy, ten separate outcome identities and an independent MVP fanfare. Music is pooled to two media elements; scene cues use one reusable element and sequence from actual `ended` events, with a bounded stall watchdog. The existing Settings mute/volume preferences remain authoritative. The old four audio files and old synth recipes have been retired from current source/build/download, not deleted from historical backups or a user's active offline cache.

Audio checks: `npm run test:unit`; the focused audio/MVP/discussion UI subset; `npm run test:browser-audio` (real media/controller fixture with all ten outcomes, deduplication, replay/mute/visibility cancellation and private confirmation equality); `node --experimental-strip-types tests/browser-feedback.mjs` (current app Settings and phases); `AUDIO=1 node --experimental-strip-types tests/browser-mvp-replay.mjs` (four complete real-match/replay/recovery/accessibility configurations with audio enabled); `node tests/browser-audio-offline.mjs` (canonical offline entry, cached new music/effects, complete match, WAV-only fallback and MVP); `node tests/browser-offline-updates.mjs` (normal conservative update lifecycle); and `node tests/browser-file-smoke.mjs` (portable file game).

Browser commands need `CHROMIUM_PATH`. Set `BASE_URL` to the current preview entry for app tests; offline-audio uses canonical `/`, not the online-only latest-preview alias. Run browsers sequentially. The renderer's NumPy/FFmpeg dependencies are render-time only. Decoded PCM checks verify all 48 assets are finite, non-silent, below clipping and of the expected duration. Exact source/Website ZIP and worker CORE hashes are checked separately. Repository `analysis/AUDIO_REPLACEMENT_QA.md` records actual final outcomes and limits; automated/headless testing is not a physical-device listening certification.

## Current Nature edition: cricket ambience, rooster and short wins

See `AUDIO_DESIGN.md`. The rejected instrumental bank has been removed and replaced with 8 soft nature loops and 29 short cues on fresh v3 paths. The single ambience element stops before phase changes, is not restarted by same-phase renders/private turns, and pauses under scene cues. No winning music loops: ending cues are <=1.2 seconds, MVP <=0.55 seconds, followed by silence. A rooster plays once when each public morning report opens, after an announcement if present, not on recovery/re-renders. Audio-only focus coordinates cooperating new-version game tabs without sharing private data or changing saved preferences.

Current tests: `npm run test:unit`, focused sound/MVP/discussion UI cases, `npm run test:browser-audio` (all ten endings, one rooster, 45 private scene changes without restarting, 8ms audible-stream sampling, two-tab ownership), `tests/browser-feedback.mjs`, `AUDIO=1 node --experimental-strip-types tests/browser-mvp-replay.mjs` (four real game/recovery/replay/accessibility configurations, including no re-crow on recovered morning), `tests/browser-audio-offline.mjs` (37 cached WAV files, offline game/one rooster, short celebration/MVP with WAV-only button fallback), `tests/browser-offline-updates.mjs` and `tests/browser-file-smoke.mjs`. Use the established Chromium/BASE_URL setup above and run browsers sequentially.

Actual final evidence and counts: repository `analysis/NATURE_AUDIO_QA.md`, `NATURE_AUDIO_RELEASE.json`, `nature-audio-quality.json` and `nature-*.log`. Headless playback and spectral/peak measurements are not physical-device listening certification. Use one game copy while listening; old versions cannot participate in the new audio-focus channel. Keep the sole preview on port3009 at `/latest-preview.html`; no user storage/cache clearing or forced activation.

## Compact end-screen ranking layout

Run `npm run test:browser-compact-results` with `CHROMIUM_PATH` set when needed.
This renders the actual `MatchResults` component with production CSS at 390px,
320px, 1064px and landscape widths, including 200% root text sizing. It checks
full-width rows, larger MVP identity, all role/status/score/reason fields and
portraits, no horizontal overflow or clipped fields, and automated WCAG checks.
The fixture includes a dead losing MVP, an escaped winner, dead winners, living
losers, a long name and a Former Madman role suffix. Optional `BEFORE_SOURCE`
points to a pre-change `src` directory to measure unchanged width, shorter normal
rows and enlarged MVP name/role against that baseline. Reports and screenshots
go to `.cache/compact-results-browser` or `RESULT_SCREENSHOT_DIR`.

Also run `npm run test:browser-mvp` against the published preview: it completes
real matches, restores recovery, checks standings and START AGAIN preservation,
and repeats mobile/desktop/200%-text accessibility checks.

## Voted-out role hiding and launch handoff

`npm run test:unit` covers default/off behavior, the new setup toggle callback,
role-redacted verdict announcements, and old/new recovery snapshots. Run:

```sh
node --experimental-strip-types --test --test-name-pattern='voted-out hiding|morning report shows multiple deaths' tests/werewolf-ui.test.mjs
HIDE_VOTED_ROLES=1 npm run test:browser-mvp
```

The selected UI matrix crosses hide on/off with death-role reveal on/off and
checks morning visibility, vote verdict role/markup, and final role disclosure.
The browser run changes the real setup switch, checks local persistence, hidden
vote verdicts before/after recovery, full results, replay and accessibility at
four viewport/text sizes. Add `AUDIO=1` for rooster/winner/MVP checks too.

After build and `python3 scripts/package-final-launch.py`, extract the launch ZIP
to a temporary directory; run `LAUNCH_SITE=/path/to/extracted/site
node tests/browser-launch-package.mjs` with the environment assignment and node
command on the same line. It serves the exact site under a GitHub-style project
subpath, checks every served file, worker scope and offline reopen. It does not
deploy to GitHub or modify the live preview.

## Effects-only audio and Survivor co-win (4 November 2026)

Background music and continuous ambience are removed; the earlier Nature audio
section is historical, not the current audio specification. All 29 short WAV
effects remain unchanged. `npm run test:unit` now omits obsolete ambience-player
tests and checks zero music assets/catalog/cache entries plus effects sequencing.

Run `node tests/browser-audio.mjs` for native effect playback, 10 outcomes,
sequential MVP, once-only rooster, silent private scene changes, cancellation,
visibility and cross-tab ownership. `node tests/browser-feedback.mjs` checks the
effects-only Settings UI and preserved controls. `node
tests/browser-audio-offline.mjs` checks all 29 cached effects and an offline match.
`node tests/browser-effects-survivor.mjs` plays the user's exact four-player
scenario at normal/200% text, verifies the alive Survivor's WON row and statistics
credit under the VILLAGE WINS headline, preserved effects and no music requests
or looping players even with legacy music settings enabled. These browser
commands need `CHROMIUM_PATH` where Chromium is not installed on PATH.

Survivor win rules are unchanged: unpaired living Survivors co-win alongside the
ending faction. Dead Survivors lose; a Friends-bound Survivor uses the Friends
team rules. A faction headline is not the complete list of individual winners.

## Shared headlines / no animal audio — latest 4 November 2026

This supersedes earlier rooster/effects-only expectations: 28 effect WAVs remain,
no music/crickets/rooster files or routing. Run the full unit suite (including
`match-headline.test.mjs`) and the selected four-player Survivor/voted-out hiding
UI scenarios. Browser audio/MVP/offline tests now assert zero rooster playback.

`browser-effects-survivor.mjs` verifies VILLAGE AND SURVIVOR WIN and unchanged
statistics in a real four-player match at normal/200% text. For a deliberately
long heading layout stress fixture use `HEADLINE_TEXT='FRIENDS, WEREWOLVES,
SURVIVOR AND GAMBLER WIN' node tests/browser-compact-results.mjs` (environment
value is a single string; command on one line). It checks full-width fields,
wrapping, MVP prominence and automated accessibility in seven configurations.
The headline matrix includes village/wolf/neutral/Friends/wolf-Friends, escaped
Gamblers, living/dead/bonded Survivors, deduplication and empty/no-faction cases.
Some presentation-only fixtures explicitly supply co-winner IDs; they do not
claim all such combinations can naturally trigger a Friends ending under the
existing winner rules. Winner IDs and engine win conditions are unchanged.


## Avatar-local pack target markers
`tests/browser-pack-targeting.mjs` runs a real 14-player night: three prior teammate choices plus the acting wolf’s choice, select/deselect/switch with identical document-space card/grid dimensions, portrait-contained overlays, distinct Attack/Hypnotize intentions, touch/keyboard dialog with Escape/focus return, Wolf Pup read-only behavior, Lone Werewolf/non-pack privacy and public morning cleanup. Layout/axe audits cover 390px, 320px, 320px at 200% root text, and landscape. A focused component test also verifies 24 teammate choices remain a bounded count with every full name/action available in the dialog; this larger-pack case is not claimed as a full native-browser game. Existing known-wolf UI coverage retains night-to-night reset and hidden White/Lone identities. No rules, saved-state fields, assets or audio are changed.


## Phase-cue startup latency
`phase-cue-controller.test.mjs` covers immediate prepared playback/no startup timer, repeated deterministic requests, cold-load and late-resume suppression, cancelled stale requests, mute/zero/hide/navigation/dispose, gain updates, preloaded HTML fallback and its stalled-start watchdog, and below--60dBFS onset offsets without PCM changes. `browser-phase-cues.mjs` instruments real native buffer sources and GainNodes (not just HTML play calls), timing night CONTINUE and completed morning holds across two offline nights/discussions, once-only natural endings, settings, hide/unmute and replay/recovery. `browser-phase-latency-cold.mjs` deliberately holds both downloads past their requested phases, verifies no delayed catch-up after release, and verifies the next explicit night starts its decoded cue promptly.


## Short Muter description and final dead-player deduction
The Muter description uses the exact approved action line, “Each night you can mute someone”; regression assertions exclude the three removed explanation lines across static text, shared descriptions, rulebook/details and private turns. Targeting, one-day expiry, skip/repeat, votes/night powers and Madman behavior are unchanged.

Final standings subtract 2 once for `!alive && !escaped` before MVP selection and within-tier sorting. Unit/component tests cover dead winners/losers, changed MVP selection, a well-performing dead MVP, negative points, living/revived/escaped exceptions, unchanged accuracy and idempotent rerender/serialized recovery with partial history and no new ledger fields. The native MVP/replay flow checks the eliminated wolf’s actual +1 attack minus2 death = -1 total and displayed deduction, unchanged totals after Settings, four screen/text layouts and clean replay state.


## Supplied transparent claw overlay
The supplied red claw artwork replaces the angular crosshair, with the neutral white/grey backdrop removed and antialiased red edges unmatted to RGBA. `browser-pack-targeting.mjs` now checks real image decode at original 517×591 resolution, transparent-pixel and red-silhouette counts, no opaque white pixels, an embedded PNG data URL, unchanged card/grid dimensions and portrait-contained marker/count/YOU bounds. Existing crowded pack, 24-choice component, no private leakage, focus/keyboard, normal/200%-text/landscape and axe checks remain. The asset is embedded in index.html and therefore covered by the existing offline HTML digest rather than an additional public request.

## Committed ballot confirmations
`ballot-audio.test.mjs` checks the three exact Drive identities and prepared PCM/SHA,
matched active loudness, peak protection, and offline entries. Controller tests cover
ready-only/no catch-up playback, independent nonrepeating choices and one shared
voice/context. The voting component tests distinguish target selection/night SKIP
from committed VOTE/SKIP VOTE and check final elimination priority, including a
last SKIP which still produces an elimination through the earlier votes.

`browser-ballot-audio.mjs` instruments real native WebAudio sources/GainNodes or
real HTML media (`HTML_BALLOT_AUDIO=1`); it does not replace playback with a fake.
Its three scenarios cover every recording, natural completion through voter and
no-elimination screens, rapid replacement without stacking, mute/zero/35% volume,
recovery without replay, and immediate elimination instead of a final confirmation.
WebAudio runs cache the release and repeat the scenarios entirely offline. Tests
can target an extracted release at a Pages-like project subpath with `BASE_URL`.
Browser timing is an API-start check, not a guarantee of physical/Bluetooth output
latency. Floating-point GainNode volume assertions allow native float32 rounding.

## Compact role markers, avatar statuses and button-only level
`role-target-markers.test.mjs` requires a complete35-role/unique-symbol mapping and
verifies exact3x PCM fallback copies without clipping or changing original scene
assets. Component scenarios check actor-vs-target identity, deselection, handoff,
public-vote privacy and nested DEAD/ESCAPED status placement.
`browser-role-target-markers.mjs` plays two nights of a real seven-player match,
including an actual death and a Necromancer choosing that dead player; it checks
fixed square photos, unchanged card/grid dimensions, Doctor/Seer/Chef/Werewolf
markers, no public/handoff leakage, <=26px/32%-width markers, 390/320px,200%-text,
landscape and axe. ESCAPED uses an explicitly labelled alternate-status layout
fixture, not a claim of a native Gambler victory. `browser-pack-targeting.mjs`
retains the private multi-wolf/24-choice/privacy/layout checks, using each actor's
new symbol and checking the original supplied PNG only for the Werewolf.
`browser-button-level.mjs` records real native gain peaks at50%/100% and plays the
actual boosted HTML fallback. Physical speaker loudness still depends on the device.
