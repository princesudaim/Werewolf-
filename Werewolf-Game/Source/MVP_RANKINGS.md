# MVP Rankings & Instant Replay

The final screen is one ranked list. Each player has a portrait, role, WON/LOST result, ALIVE/DEAD/ESCAPED state, match points and a short recorded-play summary. Exactly one MVP is shown first, even if that player died or lost. Remaining tiers: winning alive/escaped, winning dead, losing alive, losing dead. Each tier is ordered by performance.

## Scoring

| Recorded fact | Points |
| --- | ---: |
| Correct vote for an opponent | 2 |
| Actual useful Doctor, Bodyguard or Mayor save | 5 |
| Good attack choice | 1 |
| Successful opponent kill, in addition to the attack choice | 2 |
| Fresh truthful Seer/Team Checker/Detective check or Chef comparison | 2 |
| Police blocks an opponent's attempted action | 3 |
| Muter successfully silences a surviving opponent for that day | 2 |
| Successful friendly revival | 4 |
| Successful infection or hypnosis | 3 |
| Thief inherits a role | 3 |
| Correct Gambler prediction | 4 |
| Fresh Raven mark / Mind Flayer goal step | 1 |
| Survivor shield actually stops an attack | 3 |
| Doctor improves an ally's Sick Man health | 2 |
| Confirmed wrong vote / harmful scored decision | -2 |
| Match win | 2 |
| Dead at the end (not escaped) | -2 |

Choices use roles and alliances when made, not the final inherited/infected role. Night choices use the bonds that existed before new Friends bonds are committed at dawn. Village players are not rewarded for eliminating harmless neutrals, and voting an unpaired Jester is a mistake for factions it defeats. Solo roles and Friends use their own goals. Mayor vote weighting never duplicates MVP credit. Skips, blocked/corrupted abilities, random misses and unjudgeable decisions are not mistakes. Repeated checks/marks on the same target cannot farm points. A Chef comparison earns one check, not two.

Combat observations are read-only: no re-simulated combat or extra random draws. Kill credit requires an actual landed attack and a combat death that remains dead after revival. A blocked wolf attack cannot claim a separate Sheriff's kill or an illness death. Saves need actual prevention and a living target; a Bodyguard can earn credit after sacrificing themselves.

MVP selection: highest match score, then scored-choice accuracy, match win, number of good decisions and original player order. Kill bonuses do not count as a second correct decision. Survival alone earns no bonus points. A player who is dead at the end loses 2 points, once, before MVP selection and within-tier ordering. This is not a scored mistake and does not lower decision accuracy. Escaped and revived/living players are not penalized. Rerenders and recovery do not stack the deduction; no death-history ledger or save-schema change is needed. A dead player can still be MVP if their adjusted score wins. Unrecorded discussion, bluffing, message quality and newspaper quality are not judged. With no scored choices, the result honestly says so and uses the deterministic tie-breaker. This is a transparent heuristic, not a claim to know who played best in real life.

## Replay and recovery

START AGAIN waits for standings to save, then reuses names, photos, settings and the original role selection. Fixed roles are freshly shuffled; selected Random cards are drawn again. Every registered match-state/ref field is reset except setup and newly dealt players: votes, effects, health/resources, messages, deadlines, pending results, winner flags and MVP facts all start fresh. Local all-time win totals are not reset or credited twice.

Recovery remains opt-in. A recovering replay gets a new match ID and 24-hour window, not the old match's expiry. Existing active saves without the performance ledger still load with an explicit partial-history note, unchanged rules and unchanged original expiry. The strict ledger validator rejects malformed, duplicate or foreign-player facts. No new saved setup is forced on existing matches.

Background sounds were not changed in this step. The three audio modules and existing production assets are unchanged.

Muter scoring uses the existing `mute` ledger event: +2 for an effective opponent silence, -2 for silencing an ally, and no credit/penalty for skips, blocked/corrupted/Madman actions or targets dead/escaped by morning. Each actor/target/night is recorded once, even across recovery. Harmless neutral choices are unjudgeable, not mistakes. A shared target is announced once; distinct Muters may each receive credit for their own effective decision. Role power (4/10) is a separate setup estimate, not a per-action MVP reward.
