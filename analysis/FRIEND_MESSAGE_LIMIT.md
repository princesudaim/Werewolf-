# Friends send-once messaging — 2026-11-01

Requested and explained before implementation: the Charmer can send one message per night, and the receiving friend can reply once. Sending removes the relevant composer; replying keeps the received message readable until acknowledged. Allowances restore on a later night, not after editing or reopening the UI.

Implemented a synchronous per-player night guard in Werewolf.tsx shared by outgoing messages/replies. It is cleared only when a new night begins. Charmer's composer and Send button disappear after sending; a confirmation remains. PrivateInfo independently guards repeated reply taps, clears the draft, removes the reply textarea/button, keeps the message open, and focuses OK. A distinct later message can have a fresh reply UI, subject to the parent's night allowance. Blank input does not consume an allowance.

Unchanged: next-night delivery, non-replyable reply messages, Police blocking, friendship resolution, no public revelation, role actions, and match/ranking rules.

Verification:
- TypeScript and production build passed.
- 195 non-main-UI tests passed, including four new reply tests and the earlier Journalist word-limit tests.
- Four focused existing Charmer UI flows passed: three-night delivery in both player orders, messages disabled, and Police-blocked friendship/message. Assertions cover removed composers, readable received message after sending, and next-night reset.
- Real Chromium three-night flow passed: two separate nightly letters and replies, exact delivery counts, no repeat composers, restored allowance, and no runtime errors. Optional reproducible browser test: tests/browser-friend-messages.mjs.
- Built Website and live preview updated.

This change and the preceding Journalist 10-word limit have not yet been saved to Drive. LAST_DRIVE_SAVE.json still refers to the earlier Mayor/Gambler backup.
