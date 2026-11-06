# Role and settings audit

This records the current PWA rules, not a verified specification of the original APK. Each question is: what can the role do, who can they target or see, what settings change it, and how does it win? Tests cover examples and invariants; they do not prove every possible combination or simultaneous-action precedence.

All roles have a role chance. Roles have an optional minimum wait; a Madman uses the wait for their disguised role so the wait does not reveal them. Waits affect timing, not the ability. Long-hold random exclusions do not stop manual selection. The global first-night-safety rule, Police blocks, Madmen, Friends, and death-reveal setting can affect multiple roles. The rulebook uses the same settings-aware descriptions as gameplay.

| Role | Audit: ability and special interactions | Role-specific options |
| --- | --- | --- |
| Villager | No night action; votes with village | None |
| Muter | Speaks; chooses another living player nightly or skips. Morning names the muted survivor, who cannot speak that day but can vote/use powers. Expires next night; repeat targets allowed. Police/corruption and Madman disguises prevent silence. Active role, power 4/10; effective opponent silence +2 MVP, ally silence -2 | Chance and individual wait; no extra ability switches |
| Doctor | Protects one player from applicable wolf attacks; a block removes protection | Self-protection; repeat target |
| Seer | Checks one player; White Wolf and Serial Killer have disguises | Exact role or wolf appearance |
| Chef | Compares two other living players; cannot act without enough guests | Group neutral roles together or separately |
| Mayor | Queues one emergency meeting without skipping any private turns or messages; an unblocked declaration is announced in a dawn popup after all night turns; first-night safety preserves use | Double vote after meeting |
| Wolf Hunter | Uses water; incorrect target kills the hunter | Uses per game |
| Necromancer | Revives a dead player; a block refunds the use | Uses per game |
| Bodyguard | Protects another player and can die in their place | Protect village only or any team |
| Madman | Occupies one slot and secretly believes a random eligible village role; their ability fails or may mislead | Role chance and random exclusion; disguise role settings apply |
| Sheriff | Shoots; a Madman cannot be shot | One shot per game or one per night |
| Visitor | Visits one player; dangerous hosts or an attacked host may kill them | Dangerous hosts; attacked-host danger |
| Team Checker | Checks a player's team, including Friends when enabled | Identify Friends team |
| Celebrity | Automatic fame on 1 or 2 successful nights; default 1; blocked or Madman celebrities do not reveal or spend fame | Successful fame nights and number of recipients |
| Detective | Watches a player and receives a next-turn visit report | Show names or visitor count |
| Vote Marker | Adds two votes against a target in the next vote | Uses per game |
| Sick Man | Has a limited number of nights; Doctor visits extend time | Starting nights; Doctor bonus |
| News Reporter | Writes a morning newspaper; a block prevents publication | Drawing enabled or disabled |
| Intelligence Chief | Gets potentially wrong intelligence periodically | Report interval |
| Police | Blocks a night action regardless of turn order; report names blocked players when enabled | Repeat target; morning notification |
| Werewolf | Votes with known pack; first-night safety can stop attack | Random tie breaker |
| Wolf Pup | Cannot attack or vote at night; death empowers the next night | No separate action setting |
| Strong Werewolf | Independent attack on odd nights; every night if no other allied wolf can attack | No attack-interval setting |
| Lone Werewolf | Independent attack usually succeeds 25%; 100% if no other allied wolf can attack; unknown to pack until Infecting Wolf finds them | Independent attack interval |
| Infecting Wolf | Converts a non-wolf or brings Lone Wolf into the known team; Pup revenge can permit two targets | Infection enabled or disabled; wolf tie breaker |
| Hypnotizer Wolf | Hypnotizes instead of voting; Pup revenge can permit two targets | Uses and effect duration |
| White Werewolf | Appears to pack as ordinary wolf but wins alone; can betray if enabled | Betray known packmates; wolf tie breaker |
| Jester | Wins if voted out, unless on the Friends team | None |
| Serial Killer | Attacks independently and appears as Villager to Seer | Attack interval |
| Survivor | Wins by surviving and has personal shields | Shield count |
| Raven | Marks players and can trigger a curse; optional reflection of marked attackers | Reflect marked attackers |
| Gambler | Bets on a living player dying that night or being voted out the following day; night successes settle once at dawn and are removed before voting; unresolved bets fail only after the vote; correct guesses prepare escape after surviving the next night and wrong guesses bring debt | Correct guesses needed; betting protection |
| Mind Flayer | Places tiny creatures and wins when every other living player has one | Starting stock; regeneration chance |
| Thief | Default: cannot attack; watches a living target and inherits their role after a night death or vote-out, before victory checks, if the Thief survives. OFF restores legacy attacks. | Death-only mode, three target lifetimes; attack interval only in legacy mode |
| Friends Maker | Creates an independent Friends team; friends cannot attack each other; an attack-capable wolf friend can secretly betray known packmates | First night to choose a friend; optional private messages with replies arriving next night |

## What is tested

- `tests/werewolf-ui.test.mjs`: every role's first-night flow, settings controls, selected multi-night games, public and private information, conversion, betrayal, Lone/Strong Wolf rules and rolebook
- `tests/werewolf-engine.test.mjs`, `tests/friend-wolf.test.mjs`, `tests/wolf-nerf.test.mjs`, `tests/game-audit.test.mjs`: team/win conditions, action resolution, target restrictions, Friends and infection interactions, ability settings and role matrix checks
- `tests/role-description.test.mjs`, `tests/role-power.test.mjs`, `tests/distribution.test.mjs`: settings-aware descriptions and power, random role selection and distribution
- UI tests use a simulated DOM; no physical-device or original-APK equivalence is implied. Some simultaneous effects, police cycles, Gambler debts and role interactions remain reconstructed assumptions, not confirmed rules.
