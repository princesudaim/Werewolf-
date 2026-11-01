# Smart descriptions — batch 1 (2026-11-01)

## Scope
Reviewed and updated exactly five roles: Werewolf, Hypnotizer Wolf, Infecting Wolf, Lone Werewolf and Wolf Pup. The remaining 30 descriptions are byte-for-byte equal to the saved version for tested default/alternate settings. Gameplay engine code after the description helpers is byte-for-byte unchanged.

## Writer
`Source/src/smart-role-descriptions.ts` provides deterministic whole-line descriptions. Limits: 70 words AND 440 Unicode code points, including role-specific wait instructions. If a complete explanation exceeds either limit, choose shorter complete variants of its lines; never slice text or remove a required rule. Exhaustive settings/roster combinations exercise this shortening and check both limits. The limits apply to these five reviewed roles only; later batches must be reviewed before migrating.

The actual dealt lineup is captured in `descriptionRoles` at match start, after random-role resolution. Private role cards receive that stable lineup, public night/rage state, the player's own hypnosis uses, own joined-pack status and own friendship status. Dead roles remain in the context so a Pup death does not delete the very rule it activates. No hidden blocks, secret deaths, player identities or target roles are fed to the writer. As requested, descriptions can indicate that an interaction role is included in the starting match, but never who has it. The public all-role rulebook and setup detail browser remain generic current-settings references, not mirrors of the secret roster.

- Werewolf: simple vote and tie wording; random ties still explain random selection. Pup bonus appears only when included. Tied votes promise no *Werewolf-vote kill*, not safety from other attackers.
- Hypnotizer Wolf: concise limit, effect, start and duration; actual remaining uses on private cards; no new hypnosis promised when spent; two targets still cost one use when Pup revenge is active.
- Infecting Wolf: omit absent Lone Wolf/Pup interactions; omit all infection rules when disabled; explain current infection/attack turn without repeating its past first-night action.
- Lone Werewolf: omit absent Infecting Wolf/Friends Maker interactions; retain scheduling and conditional 25%/100% odds without inspecting hidden blockers or living attackers. If the roster contains no other possible allied wolf attacker, explain only the 100% chance. No fictitious Pup double-attack rule is added. Joined pack and Friends-team goal wording follows the player's own known state.
- Wolf Pup: only explain bonuses usable by included roles. Hypnotizer still needs a remaining use; Infecting Wolf must have infection enabled. Do not imply that independent Strong/Lone attacks double.

## Verification
- TypeScript and production build passed.
- 208 non-main-UI tests passed, including nine smart-description regression groups and exhaustive length/roster combinations.
- 14 selected UI flows passed, including complete first nights with/without Pup/Friends Maker, role detail consistency, hypnosis, infection, Pup revenge and Lone Wolf behavior.
- New production Chromium test passed nine first-card lineup cases covering all five roles, absent/present Pup, word/character limits and 320/390px layouts; no runtime errors. Proof screenshot is cache-only.
- Production three-night Friends send/reply test and mobile Mayor/Gambler/headline regressions also passed.
- All 30 other descriptions compared directly with the latest saved archive and matched for three settings combinations each.
- Existing aggregate UI runner limitation remains: an attempted all-role matrix stalled and was stopped; no claim that the entire main UI suite passed.
- Built `Website/index.html` and `Website/sw.js` synced; live preview serves the verified new build.

No new Drive save requested for this batch. The latest Drive receipt still records the pre-description backup from the preceding save request. Refresh existing preview tabs only after finishing a live match, since matches are not persisted across reloads.
