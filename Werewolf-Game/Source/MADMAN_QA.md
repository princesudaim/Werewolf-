# Madman QA

The card takes one player slot and is replaced with a random eligible village disguise before play. The player sees the disguise, not the Madman card. Their attempted visits remain visible to Detective; their real role is shown at game end. Death reports show the disguise if role reveal is enabled. The implementation is a reconstruction, not verified APK behavior.

## Disguise audit

All 17 eligible disguises were exercised in a simulated first-night UI matrix. A separate multi-night UI test checks the Necromancer when there is a dead target. The table describes the implementation, not confirmed original-game rules.

| Disguise | Madman behavior |
| --- | --- |
| Police | Records an apparent choice and visit, but does not block the target |
| Intelligence Chief | Gets randomly selected names |
| News Maker | Can write, but nothing is published |
| Sick Man | Health counter decreases and can be extended by Doctor visits, but illness cannot kill them |
| Doctor | Apparent target and repeat restriction are recorded, but protection fails |
| Detective | May pick a target, but receives an empty visitor report |
| Vote Marker | Uses a charge without adding votes |
| Team Checker | Gets a random team |
| Celebrity | Does not reveal their identity to other players |
| Visitor | Visits appear in visit records, but the dangerous visit has no effect |
| Bodyguard | Protection fails |
| Sheriff | Uses a shot without killing anyone |
| Seer | Gets a random role result, excluding the hidden Madman role |
| Necromancer | Uses a charge without reviving |
| Mayor | Appears to use the meeting, but does not protect or publicly announce it |
| Wolf Hunter | Uses water without killing anyone |
| Chef | Gets a random same/different-team result |

Villager, Muted, Madman itself and non-village roles are not eligible disguises. Multiple Madman cards each occupy a slot and can independently receive a disguise. A disguise can duplicate another player's role.

## Interaction checks

- A Sheriff cannot shoot a real Madman; a normal player under Hypnosis is **not** a Madman and is not protected from Sheriff shots
- Hypnosis expiring does not remove an existing Madman's condition; infection clears it when their role changes to Werewolf
- A dead Madman remains a Madman for end-game disclosure; the death report shows the disguise instead
- Corrupted Celebrity and Sick Man behavior is covered by unit tests; the latter's fake countdown never kills
- Disguised News Maker and Detective have additional UI tests; Police blocks and limited-use refunds retain the existing common action handling
- Random-card/distribution exclusions and weights use the Madman card like other village roles; a disguise is chosen separately

## Limits

A fake Sick Man can infer something is wrong if they remain alive after the displayed countdown reaches zero. The current Thief implementation steals the target's displayed role, not the hidden Madman condition; original APK behavior for this interaction is unknown. Random misinformation can coincidentally be correct. These are reconstructed rules, and this audit does not prove APK equivalence, every possible simultaneous interaction, or physical-device behavior.
