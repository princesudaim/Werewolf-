# Role power estimates

Each rating is an approximate **1–10** estimate of a single player's influence under the app's current default rules, not an APK-derived or mathematically proven balance value. It considers reliable information, protection and elimination, frequency and risk, and the difficulty of that role's win condition. Pack coordination, player skill, lineup, number of players and optional settings can change the effective strength considerably. Automatic distribution targets average Villager power of 8.5, 5, or 2.5 for Easy, Balanced, or Hard, respectively, and average Werewolf power of 7, 8, or 9. It chooses the closest achievable scores when role chances or Madmen limit the available roles. It adds no Neutral for 4 players, one for 5–11, two for 12–19, and three for 20–24. Neutral roles target an average of 5 points in every mode. These averages are a heuristic, not measured win rates, and independent Neutral win conditions can alter the outcome. Ratings update with strength-related settings and never change gameplay. They are rounded to whole points and capped at 1 and 10, so small changes or buffs at the maximum can share a score. Role chance, random exclusions, artwork, cosmetic formatting and wait time do not change a role’s strength. Each team has one 10-point role under default rules: Seer, Infecting Wolf and Serial Killer. Other settings can change the highest ratings. Random cards have no fixed rating before the draw: they use current points to favor picks near a balanced team average, taking manually selected roles into account. Chance weights still apply when enabled, and exclusions and no-repeat rules are always respected. This is a heuristic, not a promise of equal winning chances.

## Villagers

| Role | Power | Reasoning |
| --- | ---: | --- |
| Villager | 1 | Ordinary vote and discussion, no night power; baseline. |
| Muter | 4 | Speaks normally and can silence one other living player for the following day each night. Repeatable discussion control, but no kill, vote denial, information or night-power block; weaker than Police. Police/corruption can stop it. |
| Celebrity | 2 | Automatically confirms their identity on one successful fame night by default, with no direct action. Two fame nights add one point; audience size still affects the estimate. |
| Sick Man | 2 | Standard village participation but a survival deadline without Doctor visits. |
| News Reporter | 3 | Public communication tool; its effect depends on the information and players. |
| Mayor | 7 | One emergency assembly protects the village and grants lasting double votes. |
| Doctor | 8 | Repeated protection can prevent key deaths, with repeat-target restrictions. |
| Seer | 10 | Nightly role information strongly directs village voting, despite disguises. |
| Chef | 7 | Recurring two-player team comparison; informative but indirect. |
| Wolf Hunter | 6 | One powerful wolf elimination, with a lethal penalty for a mistaken target. |
| Necromancer | 8 | One revival can restore a valuable role or reverse an important death. |
| Bodyguard | 6 | Repeatedly protects villagers but sacrifices themselves to intercept a death. |
| Sheriff | 6 | One unrestricted shot can remove a threat or accidentally kill an innocent. |
| Visitor | 2 | No direct information or offensive benefit in the implemented rules, with substantial risk. |
| Team Checker | 8 | Nightly team information, less specific than a Seer's exact role reading. |
| Detective | 6 | Repeated visit reports can reveal actions indirectly, and arrive on the next turn. |
| Vote Marker | 6 | Twice can add two votes to a target, affecting a vote without guaranteeing it. |
| Intelligence Chief | 5 | Periodic, potentially inaccurate intelligence provides limited guidance. |
| Police | 8 | Repeated silent action blocking can disrupt strong abilities without alerting targets. |

## Werewolves

| Role | Power | Reasoning |
| --- | ---: | --- |
| Werewolf | 7 | Coordinates with the pack for a nightly attack and shares its team victory. |
| Wolf Pup | 4 | No night attack or vote; its revenge is useful only after it dies and other wolves can still act. |
| Strong Werewolf | 8 | Independent attack on odd nights, or every night when no other allied wolf can attack. |
| Lone Werewolf | 6 | Independent attacks usually have a 25% chance to kill, rising to 100% when no other allied wolf can attack. |
| Infecting Wolf | 10 | First-night conversion can increase the pack, then the role joins pack voting. |
| Hypnotizer Wolf | 6 | Cannot attack; normally has one hypnosis use that may disable or mislead a village ability. |

## Neutrals

| Role | Power | Reasoning |
| --- | ---: | --- |
| Jester | 4 | Wins immediately if executed, but has no direct night ability and needs votes. |
| Serial Killer | 10 | Independent recurring kills and a Seer disguise, offset by a solo win condition. |
| Survivor | 5 | Three self-protective shields and a survival-based win, but no direct control. |
| Raven | 8 | Marks can reflect attackers or be activated together, but victory requires surviving alone. |
| White Werewolf | 7 | Pack information and voting, with betrayal available, but must outlast everyone alone. |
| Gambler | 5 | Betting can provide protection and an independent escape, but wrong predictions bring debt. |
| Mind Flayer | 7 | Secret parasites can produce an independent win; limited initial stock and slow coverage. |
| Thief | 4 | Cannot attack; can change a watched target nightly and inherits only if that target dies while the Thief survives. |
| Friends Maker | 8 | Creates a separate two-player Friends team, but both must eliminate other teams. |


## What changes points

Role settings that improve attacks, information, survival, protection or useful communication change the estimate. For example: a Seer gets 10 with exact roles and 8 with wolf-only results; Wolf Pup gets 4 under default rules, 3 if infection is disabled and 5 when wolf tie-breaking is enabled. The Pup has no night attack and its revenge only matters after death. A Hypnotizer Wolf starts at 6, gains points for extra uses and loses points for shorter effects. A Doctor gains points for repeat protection and loses points without self-protection. Friends Maker messages increase Friends Maker’s points.

Some settings change context or chances rather than a role's ability. Minimum waits, role spawn chance, exclusion from random selection, skins and sound do not raise or lower power. The estimates cannot predict whether a particular teammate, target or interaction will appear, and must not be read as proven win rates.

Madman is estimated at 1 point: its disguised village ability fails or misleads, although it can still vote.

## Thief modes

The new death-only mode is ON by default. Flexible targeting is **4/10**; a fixed-until-death target or a watch lasting one night plus its following vote is **3/10**. The Thief cannot cause a death, so first-night attack safety and attack interval do not change these scores. Switching death-only mode OFF restores the old attacking Thief at **8/10** under default attack settings, with its existing interval/first-night modifiers. These are estimated influence points, not measured win probabilities.

## Celebrity successful-night limit

New matches default to **one successful fame night per Celebrity**, selectable as one or two in that role's settings. Two nights raise the baseline from 2 to 3; audience 2/3 adds 1/2 as before. Fame remains automatic. Police-blocked or hypnosis-suppressed attempts spend nothing. A larger audience spends one night, not one per recipient. Already-saved pre-change matches retain unlimited fame and their previous 3-point baseline (plus audience modifiers), rather than changing rules mid-match. These points remain estimates, not measured win rates.
