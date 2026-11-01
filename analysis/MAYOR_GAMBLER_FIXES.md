# Mayor and Gambler changes — 2026-11-01

Requested: preserve all private turns after a Mayor declaration, announce it publicly only at dawn, style the ability/announcement using supplied screenshots, and let Gambler predictions succeed on night deaths as well as vote-outs.

## Mayor

- Declaration queues an attempt in the existing night action bookkeeping. It no longer sets public Mayor names or consumes the successful ability during the private turn.
- The complete private queue still runs, including target choices, investigation results, Celebrity notices, Journalist submissions, and other private messages.
- After the last turn, Police blocks resolve, valid declarations are committed, and village protection is applied through the existing attack rules. Blocked declarations remain unannounced and can be tried again. Fake Madman declarations do not produce a public popup or protection.
- A native, focus-managed, amber-framed assembly announcement appears on the morning screen with each declaring Mayor's avatar/name and a GOT IT acknowledgement. The underlying report is inert and its continue button is disabled until acknowledgement.
- The new private Mayor ability panel provides START ASSEMBLY TONIGHT and PASS TONIGHT, preserves first-night-safety restrictions, follows the double-vote setting, and includes the Madman explanation.

## Gambler

A night wager still selects a **living** player; it now covers that player's death during the chosen night OR vote-out during the immediately following day. This is not permission to wager retrospectively on an already-dead player.

- `settleGamblerNightBets` compares living-before with dead-after state, after protection, illness, debt, revival, conversion and already-eligible escape resolution.
- A living Gambler's successful night wager earns one correct prediction and is removed from pending bets. It cannot score again at voting or become a false debt.
- If the target survives or is revived before dawn, the wager remains open for that day's vote. Failed bets still become debt only after voting, with the existing Doctor rescue rule.
- A departing/escaped player does not count as a death.
- A newly reached threshold requires survival through the next night; it never triggers an immediate escape on the successful dawn. The day vote preserves this new eligibility.
- Dead/converted Gamblers cannot collect a success. Friends-team Gamblers cannot escape independently.
- Betting protection, configurable thresholds and faction/independent winner calculation are preserved.
- Updated active descriptions and the role/testing documentation.

## Verification

- TypeScript checking and production build passed.
- 185 non-main-UI tests passed, including 12 new Gambler-death tests.
- Selected main UI regressions: 59 assertions passed (24 top-level tests including the all-role first-night matrix). These cover existing Mayor/Gambler behavior, Police resource refunds, safe first night, double votes, and the new cases below.
- New UI cases: Mayor first and last in the queue with Seer/Celebrity messages and Journalist publication; Police cancellation and retry; Gambler night success -> skipped day vote -> correct next-night escape.
- Real Chromium production flow passed at mobile widths 320px and 390px, with no horizontal overflow or JavaScript runtime errors. Screenshots of the actual Mayor ability and dawn announcement were inspected.
- Optional portable browser regression is `Source/tests/browser-mayor-gambler.mjs` (Node 22+ with `--experimental-strip-types`, CHROMIUM_PATH and optional BASE_URL).
- Known unrelated original full-suite failures/stall remain documented in GAME_REVIEW.md; no claim that the entire aggregate suite is clean.

Built Website files and the existing live preview were updated. No Drive save was requested during this change; LAST_DRIVE_SAVE.json still describes the earlier results-screen backup.
