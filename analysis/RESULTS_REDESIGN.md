# Results-screen redesign — 2026-11-01

Requested: improve the voted-out reveal and end screen using the two supplied mobile screenshots as visual references.

## Changes

- Added `Source/src/MatchResults.tsx`, with separate voted-out and final-results presentations.
- Voted-out screen: red chamfered report frame, gavel, player/avatar death overlay, optional role artwork, voted-out badge, and aggregate vote count. Count comes from the final existing ballots, including existing Mayor/marker weights. Hidden death roles are not added to text, alt attributes, or image URLs. Tie/skip outcomes have a separate no-elimination presentation.
- Retained the existing two-second hold to continue and original match-transition callbacks.
- End screen: team-themed winner banner, separate player cards, actual WON/LOST outcomes from the existing `winningPlayers` function, role and Madman disclosure, distinct eliminated/survived/escaped state, and menu action. A dead faction winner can correctly show WON and Eliminated simultaneously; an escaped Gambler is not marked dead.
- Night Rankings toggles winner-first ordering of this match's cards; it does not invent scores, alter saved standings, or award extra wins.
- Changed these two screens to the village/day background and removed their redundant night header. Added responsive layouts, safe-area spacing, and reduced-motion-aware entrance effects.
- Rebuilt `Website/index.html` and `Website/sw.js`; updated the existing live preview.
- No changes to engine, vote resolution, win conditions, or ranking persistence. The earlier removal of Download Game is retained.

## Verification

- TypeScript checking passed.
- Production build and downloadable archive generation passed.
- All 173 non-main-UI tests passed (the original 167 plus six new results-component tests).
- Six selected existing UI regressions passed, covering role reveal, ranking persistence/winners, shared wolf/Friends wins, and dead Madman disclosure.
- Real Chromium mobile flow passed: four-player night, elimination, voting, aggregate vote count, hold-to-continue, wolf victory, result cards, ranking toggle, and menu layout. No JavaScript runtime errors; no horizontal overflow at 320px and 390px widths.
- Reviewed actual rendered 390px screenshots of both new screens.
- Added portable optional browser regression `Source/tests/browser-results.mjs`. Run against a server with `CHROMIUM_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3000/ node tests/browser-results.mjs`. It creates isolated browser data and writes screenshots to `.cache/results/` by default.
- This is focused verification, not a claim that the known-stale full main UI suite is clean. See the original review for its pre-existing failures/stall.

No Drive upload was requested or performed.
