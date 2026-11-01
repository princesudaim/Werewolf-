# Werewolf APK recovery notes

The Drive archive `were.zip` contains `base.apk`, an arm64 split, language and display-density splits. The arm64 split contains `libapp.so` and `libflutter.so`; unlike the earlier base APK, it includes the compiled Flutter application.

- base.apk SHA-256: `c30e7e48c06efbb9016ccc9494465b1530398b030b5dc72ad5b289eee35dd62a`
- arm64 split SHA-256: `d50e11a75fce64f7448ad9fa9cb8d789049f961c6f1368c765a12c2ce40b457b`
- The base APK includes role illustrations, audio, and other Flutter assets.
- The Flutter Dart application is ahead-of-time compiled into ARM64 native code, not the original Dart source. Strings and asset names can be recovered, but do not by themselves describe complete implementation or interaction rules. A native APK cannot simply be deployed to GitHub Pages as a PWA.
- The repository now has an incomplete Werewolf PWA reconstruction alongside the prior Mafia source. It is not an exact recreation and is not ready to deploy as the recovered full game.

## Role-action names found in compiled code

`bodyguard_action`, `charmer_action`, `chef_action`, `detective_action`, `doctor_action`, `gambler_action`, `hypnotist_wolf_action`, `istihbarat_action`, `journalist_action`, `lone_wolf_action`, `mayor_action`, `medyum_action`, `mind_flayer_action`, `necromancer_action`, `police_action`, `rabid_werewolf_action`, `raven_action`, `seer_action`, `serial_killer_action`, `strong_wolf_action`, `survivor_action`, `tellal_action`, `templar_action`, `thief_action`, `vigilante_action`, `visitor_action`, `werewolf_action`, `white_werewolf_action`, `wolf_pup_action`

## Recoverable English descriptions

These are strings from the binary, not proof of the complete behavior. Some rules may vary by settings or depend on interactions not captured here.

- Each night, bet on who will be executed the next day. On nights you gamble, you protect yourself and cannot be killed. Two correct predictions and you escape the village victorious! But one wrong guess brings your creditors, and you die the following night unless saved.
- Each night, choose one player to learn their true role. Use this information to guide the village, but be careful not to reveal yourself to the werewolves.
- Each night, choose one player to protect from werewolf attacks. You cannot protect the same player two nights in a row, but you can protect yourself.
- Each night, one player can recognize you and learn who you are.
- Each night, visit another player. If you visit a werewolf or serial killer, or if the player you visit is attacked that night, you die. Use visits strategically to gather information.
- Each night, you and your werewolf teammates vote to kill a villager. Your goal is to eliminate all non-werewolves without getting caught.
- Each night, you can detain a player to block their role action for that night. You cannot detain the same player two nights in a row.
- The game consists of three phases: night phase, day phase, and voting phase. Throughout this process, the phone is passed around among players with the app's guidance, and each player performs the required actions on the screen when it comes to them.
- You appear as a werewolf and vote with them, but you are actually playing solo. If the werewolves win, you lose! Your goal is to be the last one alive, betraying everyone.
- You are a simple villager with no special abilities. Use your wits to find the werewolves through discussion and vote to eliminate them before they kill everyone.
- You are a villager who cannot speak during the entire game. You can only communicate through gestures and voting. Use your observations wisely.
- You have holy water. At night, choose a player and use the holy water. If the target is a Werewolf, they die. If the target is a villager or neutral, the target survives but you are killed by fellow templars for misusing the water. You can only use this ability once per game.
- You prepare a feast at night and invite 2 players to your table. If both are from the same team, dinner goes smoothly. If they are from different teams, you sense tension at the table.
- You put your life on the line. Every night you protect a villager. If your protected target is attacked with lethal force that night, they survive, but you sacrifice your life in their place.
- You work alone and kill one player each night. Your goal is to be the last one standing. You appear as a villager to the Seer, making you hard to detect.

## Next steps

Reconstruct game flow and role interactions from the native code and observed game behavior; design and implement equivalent web state, UI, assets, and offline storage; test each role and interaction against the original before publishing. A build signed for Android cannot run directly in a browser. Screenshots, recordings, or access to the original running game would help verify fidelity.

## Video reference observations

Reviewed sampled frames from `game 1.mp4` and `game 4.mp4` through `game 7.mp4`. Parts 2 and 3 exceeded the Drive connector's 100 MiB download limit and were not reviewed. The footage does not show the entire game, so these observations do not establish all rules.

- The rulebook describes a single-phone, offline, pass-and-play game for 4–24 players with night, day, and voting phases. Roles are selected and randomly assigned.
- The home screen uses a moonlit village illustration, orange buttons, a rulebook, and language selection. Adding a player includes a name and options for game avatars, gallery, or camera, with an option to save to a player library.
- At night the phone is passed individually. The private screen shows role artwork and description, a player grid when a target is required, and a complete-action or skip button. A Seer result displays the target's role; a Chef selects two players and sees whether their teams match. A first-night Werewolf screen says the player cannot use their role that night and can meet teammates.
- The footage shows a Doctor description stating the same player cannot be protected on consecutive nights and self-protection is allowed. One role-action screen shows a special madman disclosure, but the footage does not establish its full mechanics.
- The morning screen reports deaths or no deaths; a discussion screen shows a timer, an add-one-minute control, and an end-discussion button. The vote is passed around player by player; a voter may select a living player or skip. A shown result with three skips and three votes for one player reports that skip wins and no one is executed. A later screen shows a village execution with the player's role revealed.
- The original video includes ads; these should not be replicated in the requested free version.

### Additional split clips

Sampled both uploaded `game 2` segments and the second `game 3` segment. These show the player library and role-selection screen: individual counts per role, a selected-role total matching the number of players, and game settings including role reveal on death, secret voting, skip votes, no first-night kill, passive-role wait time, randomized distribution, and madmen. The original marks some options and roles as premium or ad-gated; those gates are not requirements for the requested free game. Some clip timestamps and displayed content don't align neatly, so the complete ordering needs confirmation. The first `game 3` segment remained too large to download and has not been reviewed.

### Detailed frame review

Extracted 50 evenly spaced frames from each accessible video: Game 1, both Game 2 segments, Game 3 New 4, and Games 4–7 (400 frames total). `Game 3 New 3` is still over the download limit; the unsplit Games 2 and 3 are also over it. These frames show player library, avatar picker, game settings, role counts, pass screens, private night actions, discussion and individual voting, but do not demonstrate all premium roles or their interactions. The app labels the tie against a skip as “skip wins” and does not execute anyone. A language picker and all-time rankings are also shown. The language picker remains unimplemented; a local reconstruction of rankings was added later.

### Rechecked compiled role text

The ARM64 library contains English descriptions for additional mechanics, including a Jester that wins when executed, and a Necromancer with one revival. These descriptions do not recover all timing, team assignment, interaction ordering or implementation details. The PWA implements these two roles as a provisional reconstruction; the Necromancer is provisionally assigned to the village. Many original roles still require implementation and verification.

### Raven reconstruction

The binary states that the Raven marks a player or triggers the curse, and that a marked attacker dies instead when attempting to kill the Raven. The web version adds this role with private target selection, dawn curse activation and attacker reflection. Its neutral alignment, lone-survivor victory, pack-attack handling, protection precedence, and timing are provisional; the recovered text alone does not verify them.

### Rabid Werewolf reconstruction

The compiled description says this role infects and converts a player on the first night and votes with the pack afterward. In the PWA, infections resolve after night deaths/revivals; only living non-wolves are converted and the resulting role is Werewolf. The player sees a private notice on their next night turn. Eligibility, protection, timing, and the effects on other neutral roles are provisional.

### White Werewolf reconstruction

The compiled description says the White Werewolf appears as a Werewolf, votes with the pack, loses if the werewolves win, and aims to be the last player alive. The user clarified that White Werewolf is a neutral role, not a Werewolves-section role. The PWA shows this role to the pack as a teammate, presents it as Werewolf to the Seer, allows its pack ballot to target other known wolves, and treats it as a separate threat for victory. These choices, especially betrayal targeting and the exact parity/win precedence, have not been verified against the original game.

### Gambler reconstruction

The compiled description says a Gambler may bet on the next execution, is protected on gambling nights, escapes after two correct predictions, and faces creditors on the next night after a wrong prediction unless saved. The binary also says “If you survive tonight, you'll escape in the morning!” The PWA therefore prepares the Gambler after a second correct prediction and escapes them at the next dawn only if they survive and remain an unpaired Gambler. A tied/skip vote counts as a wrong guess, a Doctor prevents the one-time debt death, and the escape is publicly announced. The prediction threshold and night protection while betting are configurable; the defaults remain two predictions and protection enabled. Escape/conversion precedence, debt interactions and tie handling remain provisional.

### Mind Flayer reconstruction

The compiled role description says the Mind Flayer wins when all other living players are parasitized, and skipping has a 20% chance to generate another parasite. A separate onboarding quote instead mentions controlling a majority, so the exact original victory condition needs verification. The PWA follows the role description, provisionally starts with three parasites, and applies wins after night resolution or voting. Starting stock and skip regeneration chance can be configured, retaining three and 20% by default. Stock, timing, simultaneous wins, and interaction precedence are unverified.

### Intelligence Chief reconstruction

The binary says this villager gets potentially inaccurate intel every two nights, and another string says one of the named players may be a Werewolf or neutral. The PWA gives a private report on even-numbered nights. Its 50% guaranteed-threat selection, random alternative, candidate eligibility, timing, and handling when there are fewer than two candidates are provisional; the source strings do not specify the actual algorithm.

### Thief reconstruction

The recovered English text describes a neutral Thief who kills a player and steals their role to join their team. The PWA resolves the attack with other night kills and, if both Thief survives and target dies, applies the target’s original role after night resolution. The PWA provisionally blocks first-night theft when first-night safety is enabled, resets role-specific resources rather than inheriting the target's usage, treats a lone Thief as a draw, and keeps the game running while a Thief is alive. Protection, simultaneous kills and attribution, resource inheritance, and win precedence remain unverified.

### Police and Hypnotist Werewolf reconstruction

The original descriptions say Police blocks a player and cannot pick the same target on consecutive nights; Hypnotist Werewolf votes with the pack and once per game corrupts a villager at the end of the night. The PWA resolves detentions silently with other night actions, without a preliminary pass or informing the target. When Police is in play, information roles receive their results privately on the next turn so a later detention can cancel the report. Multiple simultaneous police actions and exact block precedence are provisional. Hypnosis preserves the displayed role, causes actions to fail or some information roles to produce random results, and consumes limited uses where applicable. The original madman behaviors, including individual role interactions and probabilities, are not fully recovered or verified.

### Charmer reconstruction

Recovered text says a Charmer chooses a lover and forms an independent Lovers team, which wins when all opponents are eliminated even if only one partner remains. It also says lovers cannot attack or kill each other. The PWA applies these constraints to night attacks and voting, announces the bond privately on each partner's turn, and keeps their original role abilities. Multiple-couple handling, the timing of partner recognition, team-based abilities and competition with other neutral victories are provisional and need original-game verification.

### Madman game setting reconstruction

The compiled strings describe Madmen as a separate game setting rather than normal role selection. They see a disguised role, have ineffective or misleading abilities, and are not informed until game over; villagers and silent roles are ineligible. The PWA selects eligible village players after dealing and reuses the provisional Hypnotist-corruption behaviors. It shows the Madman designation only in the end-game role list. Counts, eligibility of particular village roles, protection from Sheriff bullets, and role-by-role failure behavior require verification against the original.

### Passive-role wait reconstruction

The settings footage describes “Wait time for passive roles”: Villager, Jester and similar roles cannot skip immediately. The PWA adds an optional five-second wait on Villager, Muted, Jester, Celebrity and Sick Man turns. The exact original duration, default and complete list of affected roles are not verified; the default here is off. This setting does not add an extra role reveal or Police check.

### Random Distribution reconstruction

Footage describes “Random Distribution” as “Distribute roles automatically.” The PWA now uses the user-provided Brute Force Lab video (https://www.youtube.com/watch?v=9hKL5cwnM8Q) as its lineup reference: 6–8 players get one Werewolf and no Seer; 9–16 get two Werewolves and a Seer; remaining roles are Villagers. We extrapolate those nearest brackets to 4–5 and 17–24 without assuming equivalent balance. The video models a basic game, not this PWA’s extra roles. Roles can still be edited and are randomly assigned to players. A Madman count above the number of eligible roles requires manual changes. The original APK distribution algorithm remains unknown. The role-selection screen still opens empty unless the player chooses this button.

### All-time rankings reconstruction

The footage shows an empty all-time rankings screen but does not establish its scoring or identity rules. The PWA counts completed games and wins locally by normalized player name, orders by wins then games played, and credits the winning faction, individual neutral winners, escaped Gamblers, surviving Survivors and winning Lovers. Abandoned games are not counted. These details are provisional; renaming a player creates a separate record and no data is synced across devices.

### Recovered phase audio

The base APK contains three MP3 assets named for night, morning and voting. The PWA caches them for offline use and offers an optional sound setting, initially off, plus an in-game mute control. It loops the relevant track during each phase as a provisional reconstruction; the original playback timing and volume have not been verified. Mobile browsers may require a user tap to permit playback.

## Madman card

At the user’s request, the optional Madman count was replaced in the PWA by a selectable village role card. Each card takes one player slot and is assigned a random eligible village disguise before play. Existing hidden-identity and provisional ability-failure rules are preserved. The illustration comes from `assets/flutter_assets/assets/roles/madman.webp` in the original APK. Saved legacy Madman counts are no longer applied.
