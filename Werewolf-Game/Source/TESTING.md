# Werewolf reconstruction: test coverage and limits

Run `npm ci`, `npm run build`, `npx tsc --noEmit` and `npm test` with Node 22+.

The automated suite checks that every currently implemented role can be selected, dealt, take a first-night turn and reach morning in a simulated interface. It checks that the role lineup starts empty and the start-button count updates, opens every role-detail view, verifies artwork and offline-cache entries, and exercises the implemented global settings (first-night safety, death-role reveal, secret voting, skip votes, point-based distribution for all player counts, all difficulty modes, weighted chance exclusions and Madman cards, random player assignment, passive-role wait, optional game sounds and the discussion timer). It also tests selected multi-night flows, including silent Police detentions in different turn orders, delayed investigation reports, Hypnotist, Madman, Lovers, the Gambler’s next-morning escape, and a Chef with insufficient guests, plus individual engine interactions and player-avatar assignment, bottom-sheet navigation, and explicit delete mode. Disguised and Police-detained News Maker tests check that the newspaper is silently suppressed in either turn order. The discussion timer is tested against elapsed wall time, adding a minute and returning from the background. Simulated service-worker tests exercise cache installation, update cleanup, offline navigation and GitHub Pages subdirectory paths. Ranking tests cover faction and independent winners and saving a completed game once.

This is not exhaustive validation of every role interaction, action order or win condition, nor a comparison against the running original APK. Most UI tests use a simulated DOM. A Chromium mobile-emulation smoke test additionally checks 320px and 390px phone layouts, 44px role controls, scrolling with the fixed bar, screen/turn scroll reset, role details, game start, offline reload and artwork, avatar transfer, a gallery file upload, a touch-drawn News Maker newspaper, direct voting, and offline audio phase playback attempts. Physical-device touch/camera, browser installation and broader offline gameplay still need testing. Run the optional smoke test against a production preview with `CHROMIUM_PATH=/path/to/chromium npm run test:browser`. All roles have an optional minimum wait, and roles with configurable active abilities have additional settings; their defaults retain the existing rules. Mechanics noted as provisional in `APK_INSPECTION.md` remain provisional even when tests pass.

The per-role and option audit is in `ROLE_AUDIT.md`. `tests/game-audit.test.mjs` checks the roles under contrasting settings, infection outcomes, Friends interactions, direct partner protection and team visibility. `tests/friend-wolf.test.mjs` and `tests/wolf-nerf.test.mjs` cover secret betrayal, Lone Wolf recruitment, joint wins and the Lone/Strong Wolf attack exceptions. A UI regression covers infection of a Friends-team player and checks that their private notice says they remain on the Friends team. Passing these checks does not establish the original APK's rules or prove every multi-role combination.

Madman card tests check the village card and artwork, hidden disguises, multiple separate slots and failed or misleading disguised abilities. The old saved Madman count is no longer applied. The full UI suite was not rerun for this change.


## Mayor timing and Gambler death predictions (2026-11-01)

New regressions test Mayor declarations both first and last in the night queue, including later selections, Seer results, Celebrity private messages, News Maker publication, Police cancellation/refunds, and the acknowledgement-only public announcement at dawn. Existing safe-first-night and double-vote tests remain relevant.

Gambler bets now cover a living target dying during the chosen night OR being voted out the following day. A target revived before dawn is not a night-death success. Night successes are removed before the day vote, so they cannot score twice or become false debts. Surviving-target bets stay open through voting. New threshold successes require survival through the following night; no immediate escape is awarded at the successful dawn. `tests/gambler-deaths.test.mjs` exercises deaths from different causes, protection, revival, escapes, conversions, Friends, debts and multiple Gamblers.

Optional real-browser regression: start a production server, then run `CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3000/ node --experimental-strip-types tests/browser-mayor-gambler.mjs`. This uses fresh browser data and checks the dawn popup, full private queue, mobile widths, and a night-success-to-next-night-escape flow. Screenshots are saved in `.cache/results/` by default.


## Friends send-once messaging (2026-11-01)

Each player can queue at most one Friends message or reply per night. A synchronous per-player night guard rejects repeated sends, resets at the next night, and hides the Friends Maker composer after sending. Replying hides only the reply controls: the received message stays readable until acknowledged. The reply box also guards rapid repeat taps and focuses the OK button after sending.

`tests/friend-reply.test.mjs` checks single send, empty replies, non-replyable messages and later-message reset. The existing two-order, three-night Friends Maker UI flows now assert composer disappearance, continued reading after replying, delivery, and next-night allowance restoration; option-off and Police blocking regressions remain in place.


## News Maker limit correction (2026-11-01)

The owner clarified that the intended headline limit is **10 characters**, not 10 words (example: `helloooooo`). The editor, counter and role descriptions now use characters, including spaces and punctuation. Typing/pasting is capped and submission is checked again; Unicode code points are counted without splitting emoji surrogate pairs. The News Maker tests were replaced accordingly, and other newspaper test fixtures were shortened to remain valid headlines. The Mayor browser regression also checks real sequential typing and a multiword paste before publishing. This supersedes the earlier ten-word implementation.
