import { smartRoleDescription, type DescriptionContext } from './smart-role-descriptions.ts';
export type Role = 'madman' | 'werewolf' | 'villager' | 'doctor' | 'seer' | 'chef' | 'mayor' | 'templar' | 'muted' | 'jester' | 'necromancer' | 'bodyguard' | 'sheriff' | 'serialkiller' | 'survivor' | 'visitor' | 'psychic' | 'celebrity' | 'detective' | 'instigator' | 'strongwolf' | 'sickman' | 'lonewolf' | 'wolfpup' | 'journalist' | 'raven' | 'rabidwolf' | 'whitewolf' | 'gambler' | 'mindflayer' | 'intelligence' | 'thief' | 'police' | 'hypnowolf' | 'charmer';
export type Player = { id: number; name: string; role: Role; alive: boolean; escaped?: boolean; joinedPack?: boolean };
export type Settings = { firstNightSafe: boolean; revealDead: boolean; secretVotes: boolean; allowSkip: boolean; passiveWait: boolean; passiveWaitSeconds: number; allRolesWait: boolean; allRolesWaitSeconds: number; doctorSelfProtect: boolean; doctorRepeatProtect: boolean; sheriffEveryNight: boolean; templarUses: number; necromancerUses: number; instigatorMaxUses: number; celebrityAudience: number; intelligenceInterval: number; detectiveShowNames: boolean; seerShowExactRole: boolean; sickStartingNights: number; sickDoctorBonus: number; mayorDoubleVote: boolean; chefNeutralsTogether: boolean; visitorDangerousRoles: boolean; visitorAttackedTarget: boolean; bodyguardProtectAll: boolean; policeRepeatTarget: boolean; policeNotifyBlocked: boolean; journalistDrawing: boolean; psychicShowFriends: boolean; roleWaitSeconds: Partial<Record<Role, number>>; rabidCanInfect: boolean; hypnoMaxUses: number; hypnoDuration: number; wolfRandomTies: boolean; loneWolfInterval: number; strongWolfInterval: number; survivorShieldCount: number; mindStartingParasites: number; mindRegenPercent: number; gamblerPredictions: number; gamblerBetProtection: boolean; ravenReflectAttackers: boolean; serialKillerInterval: number; thiefAttackInterval: number; whiteWolfBetrayPack: boolean; charmerFirstNight: number; charmerMessages: boolean; randomUniqueRoles: boolean; distributionFollowChances: boolean; distributionUniqueRoles: boolean; randomFollowChances: boolean; roleChances: Partial<Record<Role, number>>; disabledRandomRoles: Role[]; sounds: boolean; buttonSounds: boolean; haptics: boolean; discussionMinutes: number; madmanCount: number };
export const roles: Record<Role, {name: string; description: string; team: 'wolf' | 'village' | 'neutral'}> = {
  madman: { name: 'Madman', team: 'village', description: 'You see a different village role and believe it is yours. Your ability does not work or may give a wrong answer. You learn you were the Madman when the game ends.' },
  charmer: { name: 'Friends Maker', team: 'neutral', description: 'Pick one player to be your friend. You and your friend are the Friends team. Your team wins when everyone else is gone, even if only one of you is still alive.' },
  police: { name: 'Police', team: 'village', description: 'Each night, pick one player to stop their night ability. The morning report says whose ability was blocked. You cannot pick the same player two nights in a row.' },
  hypnowolf: { name: 'Hypnotizer Wolf', team: 'wolf', description: 'You cannot vote for an attack. Once per game, you can hypnotize a Villager. Their next ability will fail or give a wrong answer.' },
  thief: { name: 'Thief', team: 'neutral', description: 'At night, attack one player. If you kill them, you take their role and join their team.' },
  intelligence: { name: 'Intelligence Chief', team: 'village', description: 'Every two nights, you get names of players. One of them may be a Werewolf or a player on their own team. The information may be wrong.' },
  mindflayer: { name: 'Mind Flayer', team: 'neutral', description: 'Each night, put a secret parasite (a tiny creature) on another player. You win when every other living player has one. You start with three. If you skip a turn, you have a 20% chance to get one more.' },
  gambler: { name: 'Gambler', team: 'neutral', description: 'Bet on one living player dying tonight or being voted out the following day. You are protected at night while you have a guess. After two correct guesses, stay alive through the next night to win and leave. If you guess wrong, people you owe money to will come for you the next night. A Doctor can save you.' },
  whitewolf: { name: 'White Werewolf', team: 'neutral', description: 'The other Werewolves think you are on their team, and you vote with them at night. But you play alone. You must be the last player alive to win. If the Werewolves win, you lose.' },
  rabidwolf: { name: 'Infecting Wolf', team: 'wolf', description: 'On the first night, choose a player to turn into a Werewolf. From the next night, vote with the other Werewolves to choose someone to attack.' },
  raven: { name: 'Raven', team: 'neutral', description: 'Each night, mark a player or use your curse to kill everyone you have marked. If a marked player attacks you, they die instead. Be the last player alive to win.' },
  journalist: { name: 'News Maker', team: 'village', description: 'At night, write a headline of up to 10 characters and draw a picture. Everyone sees your newspaper in the morning.' },
  wolfpup: { name: 'Wolf Pup', team: 'wolf', description: 'You cannot vote for an attack. If you die, the other Werewolves can attack two players in the next night.' },
  lonewolf: { name: 'Lone Werewolf', team: 'wolf', description: 'You win with the Werewolves, but you do not know who they are and they do not know you. Attack one player on your own each night, before the other Werewolves attack.' },
  sickman: { name: 'Sick Man', team: 'village', description: 'You will die after three nights unless a Doctor helps you. Each time a Doctor protects you, you get two more nights.' },
  strongwolf: { name: 'Strong Werewolf', team: 'wolf', description: 'You know the other Werewolves and win with them. Each night, attack one player on your own.' },
  werewolf: { name: 'Werewolf', team: 'wolf', description: 'At night, vote with the other Werewolves to choose a player to attack. Try to defeat the village without being found out.' },
  villager: { name: 'Villager', team: 'village', description: 'You have no special action at night. Talk with the other players, find the Werewolves, and vote them out.' },
  doctor: { name: 'Doctor', team: 'village', description: 'Each night, pick one player to protect from Werewolf attacks. You can pick yourself, but you cannot pick the same player two nights in a row.' },
  detective: { name: 'Detective', team: 'village', description: 'Each night, pick a player to watch. On your next turn, you will learn who visited that player the night before.' },
  instigator: { name: 'Vote Marker', team: 'village', description: 'Up to twice per game, pick a player at night. In the next vote, that player starts with two votes against them.' },
  psychic: { name: 'Team Checker', team: 'village', description: 'Each night, pick one player. Your crystal ball will tell you which team they are on.' },
  celebrity: { name: 'Celebrity', team: 'village', description: 'You are famous! Each night, one other living player learns that you are the Celebrity.' },
  serialkiller: { name: 'Serial Killer', team: 'neutral', description: 'Attack one player each night. You win if you are the last player alive. If the Seer checks you, you look like a Villager.' },
  survivor: { name: 'Survivor', team: 'neutral', description: 'Stay alive until the game ends to win. You have three shields you can use to protect yourself at night.' },
  visitor: { name: 'Visitor', team: 'village', description: 'Each night, visit one player. You can die if that player is attacked, or if you visit a Werewolf or Serial Killer. If the first night is safe, visiting will not kill you that night.' },
  bodyguard: { name: 'Bodyguard', team: 'village', description: 'Each night, pick a Villager to protect. If that player would die, you die instead.' },
  sheriff: { name: 'Sheriff', team: 'village', description: 'You have one bullet for the whole game. At night, you can use it to shoot another player. Be careful: you might shoot a Villager.' },
  seer: { name: 'Seer', team: 'village', description: 'Each night, pick one player to learn their role. Some roles can look like a different role.' },
  jester: { name: 'Jester', team: 'neutral', description: 'Make the other players vote you out. If they do, you win right away and the game ends.' },
  necromancer: { name: 'Necromancer', team: 'village', description: 'Once per game, bring one dead player back to life.' },
  mayor: { name: 'Mayor', team: 'village', description: 'Once per game, call an emergency meeting at night. This protects village players from Werewolf attacks that night. All players still finish their private turns before your Mayoralty is announced at dawn. After that, your vote counts twice.' },
  templar: { name: 'Wolf Hunter', team: 'village', description: 'Once per game, use water on one player. If they are a Werewolf, they die. If they are not a Werewolf, you die instead.' },
  muted: { name: 'Muted', team: 'village', description: 'You cannot talk during the game. Use hand signs to communicate, and vote with the village.' },
  chef: { name: 'Chef', team: 'village', description: 'Each night, pick two players for dinner. You will learn if they are on the same team.' },
};
export const defaults: Settings = {firstNightSafe: true, revealDead: true, secretVotes: true, allowSkip: true, passiveWait: false, passiveWaitSeconds: 5, allRolesWait: false, allRolesWaitSeconds: 5, doctorSelfProtect: true, doctorRepeatProtect: false, sheriffEveryNight: false, templarUses: 1, necromancerUses: 1, instigatorMaxUses: 2, celebrityAudience: 1, intelligenceInterval: 2, detectiveShowNames: true, seerShowExactRole: true, sickStartingNights: 3, sickDoctorBonus: 2, mayorDoubleVote: true, chefNeutralsTogether: true, visitorDangerousRoles: true, visitorAttackedTarget: true, bodyguardProtectAll: false, policeRepeatTarget: false, policeNotifyBlocked: true, journalistDrawing: true, psychicShowFriends: true, roleWaitSeconds: {}, rabidCanInfect: true, hypnoMaxUses: 1, hypnoDuration: 0, wolfRandomTies: false, loneWolfInterval: 1, strongWolfInterval: 1, survivorShieldCount: 3, mindStartingParasites: 3, mindRegenPercent: 20, gamblerPredictions: 2, gamblerBetProtection: true, ravenReflectAttackers: true, serialKillerInterval: 1, thiefAttackInterval: 1, whiteWolfBetrayPack: true, charmerFirstNight: 1, charmerMessages: false, randomUniqueRoles: false, distributionFollowChances: false, distributionUniqueRoles: false, randomFollowChances: true, roleChances: {}, disabledRandomRoles: [], sounds: true, buttonSounds: true, haptics: true, discussionMinutes: 3, madmanCount: 0};
/** One source of role instructions for both the role card and the night turn. */
export function roleDescription(role: Role, settings: Settings, context?: DescriptionContext): string {
  const smart=smartRoleDescription(role,settings,context);
  if(smart!==undefined)return smart;
  const times = (n: number) => n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
  const every = (n: number) => n === 1 ? 'each night' : `every ${n} nights (night ${n}, ${n * 2}, and so on)`;
  const vote = 'Vote with the other Werewolves to pick someone to attack.';
  const tie = settings.wolfRandomTies
    ? 'If the votes are tied, the game picks at random from the tied players.'
    : 'If the votes are tied, the tied players are not attacked.';
  let text: string;
  switch (role) {
    case 'madman': text = 'You are on the Villagers team. You see a different village role and think it is yours. Your ability does not work or may give a wrong answer. You find out you are the Madman when the game ends.'; break;
    case 'whitewolf': text = `${vote} You play alone, not with the Werewolves. ${settings.whiteWolfBetrayPack ? 'You can vote to attack other Werewolves.' : 'You cannot vote to attack Werewolves you know.'} ${tie} You win only if you are the last player alive.`; break;
    case 'strongwolf': text = `You win with the Werewolves. Attack one player on nights ${settings.firstNightSafe ? '3, 5, 7' : '1, 3, 5'} and so on. ${settings.firstNightSafe ? 'From night 2, if' : 'If'} you are the only Werewolf on your team who can attack, you can attack every night.`; break;
    case 'villager': text = 'You have no action at night. Talk with everyone and vote out the Werewolves.'; break;
    case 'doctor': text = `Each night, pick one player to save from Werewolf attacks. ${settings.doctorSelfProtect ? 'You can pick yourself.' : 'You cannot protect yourself.'} ${settings.doctorRepeatProtect ? 'You can pick the same player two nights in a row.' : 'You cannot pick the same player two nights in a row.'}`; break;
    case 'seer': text = `Each night, pick one player. ${settings.seerShowExactRole ? 'The game tells you their role.' : 'The game tells you if they look like a Werewolf.'} Some roles can look like a different role.`; break;
    case 'chef': text = `Each night, pick two players. The game tells you if they are on the same team. ${settings.chefNeutralsTogether ? 'Players with neutral roles count as one team, unless they are Friends.' : 'Players with neutral roles count as different teams, unless they are Friends.'}`; break;
    case 'mayor': text = `At night, you can call a meeting once per game. This saves village players from Werewolf attacks that night. Everyone still takes their private turn. Only after all night turns finish, everyone is told you are the Mayor in the morning. After this, your vote counts ${settings.mayorDoubleVote ? 'twice' : 'once'}.`; break;
    case 'templar': text = `Use water on a player ${times(settings.templarUses)} per game. If they are a Werewolf, they die. If not, you die.`; break;
    case 'muted': text = 'You cannot talk during the game. Use hand signs to talk and vote with the village.'; break;
    case 'jester': text = 'Make the other players vote you out. If they do, you win and the game ends.'; break;
    case 'necromancer': text = `Bring a dead player back to life. You can do this ${times(settings.necromancerUses)} per game.`; break;
    case 'bodyguard': text = `Each night, pick ${settings.bodyguardProtectAll ? 'a player from any team' : 'a village player'} to protect. If they would die, you die instead. Picking a player does not tell you their team.`; break;
    case 'sheriff': text = `At night, you can shoot a player. ${settings.sheriffEveryNight ? 'You can shoot once each night.' : 'You have one bullet for the whole game.'} Be careful: you can shoot a Villager.`; break;
    case 'serialkiller': text = `Attack one player ${every(settings.serialKillerInterval)}. Be the last player alive to win. The Seer sees you as a Villager.`; break;
    case 'survivor': text = `Stay alive until the game ends to win. You have up to ${settings.survivorShieldCount} ${settings.survivorShieldCount === 1 ? 'shield' : 'shields'} to save yourself at night.`; break;
    case 'visitor': {
      const dangers = settings.visitorDangerousRoles && settings.visitorAttackedTarget
        ? 'You die if you visit a Werewolf or Serial Killer, or if the player you visit is attacked.'
        : settings.visitorDangerousRoles
          ? 'You die if you visit a Werewolf or Serial Killer, but not just because the player you visit is attacked.'
          : settings.visitorAttackedTarget
            ? 'Visiting a Werewolf or Serial Killer will not kill you, but you die if the player you visit is attacked.'
            : 'Visiting a Werewolf or Serial Killer will not kill you, and neither will an attack on the player you visit.';
      text = `Each night, visit one player. ${dangers} You can still die if someone attacks you.`; break;
    }
    case 'psychic': text = `Each night, pick one player. The game tells you their team. ${settings.psychicShowFriends ? 'Friends are shown as the Friends team.' : 'Friends are shown as neutral.'}`; break;
    case 'celebrity': text = `Each night, up to ${settings.celebrityAudience} other ${settings.celebrityAudience === 1 ? 'player is told' : 'players are told'} that you are the Celebrity.`; break;
    case 'detective': text = `Each night, pick a player to watch. On your next turn, the game tells you ${settings.detectiveShowNames ? 'who visited them' : 'how many players visited them'} that night.`; break;
    case 'instigator': text = `Pick a player at night. They start the next vote with two votes against them. You can do this ${times(settings.instigatorMaxUses)} per game.`; break;
    case 'sickman': text = `You will die after ${settings.sickStartingNights} ${settings.sickStartingNights === 1 ? 'night' : 'nights'} without help. ${settings.sickDoctorBonus===0 ? 'A Doctor cannot give you more nights' : `Each time a Doctor picks you, you get ${settings.sickDoctorBonus} more ${settings.sickDoctorBonus === 1 ? 'night' : 'nights'}`}.`; break;
    case 'journalist': text = `At night, write a headline of up to 10 characters${settings.journalistDrawing ? ' and draw a picture' : ''}. Everyone sees it in the morning.`; break;
    case 'raven': text = `Each night, pick a player to mark, or kill everyone you marked. ${settings.ravenReflectAttackers ? 'If a marked player attacks you, they die instead.' : 'A marked player can still kill you by attacking you.'} Be the last player alive to win.`; break;
    case 'gambler': text = `At night, bet on a living player. Your guess is correct if they die that night or are voted out the following day. A player who survives or is revived that night is not a correct night guess. ${settings.gamblerBetProtection ? 'Making a guess saves you from attacks that night.' : 'Making a guess does not save you from attacks.'} After ${settings.gamblerPredictions} correct ${settings.gamblerPredictions === 1 ? 'guess' : 'guesses'}, stay alive through the next night to win and leave. If you guess wrong, you will die the next night unless a Doctor saves you.`; break;
    case 'mindflayer': text = `Put a tiny creature on one player each night. You start with ${settings.mindStartingParasites} ${settings.mindStartingParasites===1 ? 'tiny creature' : 'tiny creatures'}. Get one onto every other living player to win. If you skip, you have a ${settings.mindRegenPercent}% chance to get one more.`; break;
    case 'intelligence': text = `${settings.intelligenceInterval === 1 ? 'Each night' : `Every ${settings.intelligenceInterval} nights`}, the game gives you names. One may be a Werewolf or someone who plays alone. The game can be wrong.`; break;
    case 'thief': text = `Attack one player ${every(settings.thiefAttackInterval)}. If they die and you stay alive, you take their role and join their team.`; break;
    case 'police': text = `Each night, pick a player. Their night action will not work. ${settings.policeNotifyBlocked ? 'In the morning report, everyone sees which player was blocked.' : 'They are not told.'} ${settings.policeRepeatTarget ? 'You can pick the same player two nights in a row.' : 'You cannot pick the same player two nights in a row.'}`; break;
    case 'charmer': text = `From night ${settings.charmerFirstNight}, pick one player to be your friend. You are the Friends team. Your team wins when everyone else is gone, even if only one friend is alive. A friend who can attack as a Werewolf can secretly attack Werewolves they know.${settings.charmerMessages ? ' You can send your friend one private message per night. They can reply once on their next turn. After sending, the message or reply box disappears for that night. Messages arrive on the next night.' : ' You cannot send private messages to your friend.'}`; break;
    default: throw new Error(`Missing role description: ${role}`);
  }
  if (settings.firstNightSafe) {
    if (role === 'visitor') text += ' On the first night, visiting cannot kill you.';
    if (role === 'mayor') text += ' You cannot call a meeting on the first night.';
    if (role === 'survivor') text += ' Save your shields for later: you cannot use one on the first night.';
  }
  const wait = role==='madman' ? 0 : settings.roleWaitSeconds?.[role] || 0;
  if (wait > 0) text += ` Wait ${wait} ${wait === 1 ? 'second' : 'seconds'} before ending your turn.`;
  // Put each idea on its own line so it is easier to read.
  return text.replace(/\.\s+/g,'\n').replace(/\.$/,'');
}
/** Only use information already visible to the current Strong Werewolf. */
export function turnRoleDescription(role:Role, settings:Settings, night:number, knownWolves:number, context?: DescriptionContext):string {
  if(role!=='strongwolf')return roleDescription(role,settings,{...context,night});
  const known=knownWolves===0 ? 'You do not know any other Werewolves' : 'You know some other Werewolves';
  const tonight=night===1 && settings.firstNightSafe
    ? 'Wait until the next night to attack'
    : night%2===1
      ? 'Tonight you can pick one player to attack'
      : 'Pick one player tonight';
  const rule=night%2===0 && !(night===1 && settings.firstNightSafe)
    ? 'You can attack every night if you are the only Werewolf on your team who can attack'
    : 'If you are the only Werewolf on your team who can attack, you can attack every night';
  const wait=settings.roleWaitSeconds?.[role] || 0;
  return `${known}\nYou win with the Werewolves\n${tonight}\n${rule}${wait ? `\nWait ${wait} ${wait===1?'second':'seconds'} before ending your turn` : ''}`;
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// The neutral White Werewolf appears to be a wolf for abilities that detect wolves.
export function appearsWerewolf(role: Role): boolean {
  return role === 'whitewolf' || roles[role].team === 'wolf';
}
/** The Seer's view preserves special disguises in either reporting mode. */
export function seerReading(role: Role, showExactRole = true): string {
  const apparentRole: Role = role === 'serialkiller' ? 'villager' : role === 'whitewolf' ? 'werewolf' : role;
  return showExactRole ? roles[apparentRole].name : appearsWerewolf(apparentRole) ? 'a Werewolf' : 'not a Werewolf';
}
// Lone wolves are on the wolf team but are hidden from the known pack.
export function knownPackmate(a: Role, b: Role): boolean {
  return (['werewolf','strongwolf','wolfpup','rabidwolf','whitewolf','hypnowolf'].includes(a)) && (['werewolf','strongwolf','wolfpup','rabidwolf','whitewolf','hypnowolf'].includes(b));
}
/** A recruited Lone Wolf keeps their role but is known to the pack. */
export function packIdentity(player: Player): Role {
  return player.role==='lonewolf' && player.joinedPack ? 'werewolf' : player.role;
}
export function knownPlayerPackmates(a:Player,b:Player):boolean {
  return knownPackmate(packIdentity(a),packIdentity(b));
}
// A White Werewolf can betray known packmates when casting a pack vote.
export function canWolfTarget(actor: Role, target: Role, whiteCanBetray = true, friendsCanBetray = false): boolean {
  return friendsCanBetray || (actor === 'whitewolf' && whiteCanBetray) || !knownPackmate(actor, target);
}
/** Other living, unblocked allied wolves who can actually attack this night. */
export function otherWolfCanAttack(actor:Player, players:Player[], round:number, settings:Settings, enraged:boolean, blocked:ReadonlySet<number>, friends:Record<number,number>={}):boolean {
  if(round===1 && settings.firstNightSafe)return false;
  const allied=(p:Player)=>friends[actor.id]!==undefined ? friends[actor.id]===p.id : friends[p.id]===undefined && roles[p.role].team==='wolf';
  const canHit=(p:Player)=>players.some(t=>t.alive && t.id!==p.id && friends[p.id]!==t.id && canWolfTarget(packIdentity(p),packIdentity(t),settings.whiteWolfBetrayPack,friends[p.id]!==undefined));
  const capable=(p:Player)=>{
    if(!p.alive || blocked.has(p.id) || !allied(p) || !canHit(p))return false;
    if(p.role==='werewolf')return true;
    if(p.role==='rabidwolf')return round>1 && !(settings.rabidCanInfect && enraged);
    if(p.role==='lonewolf')return round % settings.loneWolfInterval===0;
    if(p.role==='strongwolf')return round%2===1;
    return p.role==='whitewolf';
  };
  if(players.some(p=>p.id!==actor.id && capable(p)))return true;
  // On even nights another Strong Wolf can be the fallback attacker too.
  if(round%2===0 && actor.role==='strongwolf')return players.some(p=>p.id!==actor.id && p.role==='strongwolf' && p.alive && !blocked.has(p.id) && allied(p) && canHit(p));
  return false;
}
export function strongWolfAttackAvailable(actor:Player,players:Player[],round:number,settings:Settings,enraged:boolean,blocked:ReadonlySet<number>,friends:Record<number,number>={}):boolean {
  if(!actor.alive || blocked.has(actor.id) || (round===1 && settings.firstNightSafe))return false;
  return round%2===1 || !otherWolfCanAttack(actor,players,round,settings,enraged,blocked,friends);
}
export function loneWolfAttackSucceeds(actor:Player,players:Player[],round:number,settings:Settings,enraged:boolean,blocked:ReadonlySet<number>,friends:Record<number,number>={},random:()=>number=Math.random):boolean {
  return !otherWolfCanAttack(actor,players,round,settings,enraged,blocked,friends) || random()<0.25;
}

export type WinningSide = 'village' | 'wolf' | 'jester' | 'serialkiller' | 'raven' | 'whitewolf' | 'mindflayer' | 'friends' | 'wolf-friends' | 'draw';
/** Paired players retain their roles but belong to an independent Friends team. */
export function teamOfPlayer(player: Player, lovers: Record<number,number> = {}): 'village'|'wolf'|'neutral'|'friends' {
  return lovers[player.id] !== undefined ? 'friends' : roles[player.role].team;
}
export function sameTeamForChef(a: Player, b: Player, lovers: Record<number,number> = {}, neutralsTogether = true): boolean {
  if (lovers[a.id] !== undefined || lovers[b.id] !== undefined) return lovers[a.id] === b.id && lovers[b.id] === a.id;
  if (!neutralsTogether && (roles[a.role].team === 'neutral' || roles[b.role].team === 'neutral')) return false;
  return roles[a.role].team === roles[b.role].team;
}
export function winner(players: Player[], lovers: Record<number,number> = {}): WinningSide | null {
  const alive = players.filter(p => p.alive);
  if (!alive.length) return 'draw';
  // Each pair is a separate team. A surviving partner can still win alone.
  for (const p of alive) {
    const partner=lovers[p.id];
    if (partner !== undefined && alive.every(q=>q.id===p.id || q.id===partner)) return 'friends';
  }
  // A permanent two-player stalemate: the friend cannot attack at all and
  // the other wolf still sees them as a packmate. Both teams share the win.
  if (alive.length===2) {
    const friend=alive.find(p=>lovers[p.id]!==undefined && roles[p.role].team==='wolf');
    const other=alive.find(p=>lovers[p.id]===undefined && roles[p.role].team==='wolf');
    if (friend && other && ['wolfpup','hypnowolf'].includes(friend.role) && knownPlayerPackmates(other,friend)) return 'wolf-friends';
  }
  const unpaired = alive.filter(p=>lovers[p.id]===undefined);
  const livingLovers = alive.length !== unpaired.length;
  const wolves = unpaired.filter(p => roles[p.role].team === 'wolf').length;
  const whiteWolves = unpaired.filter(p => p.role === 'whitewolf').length;
  const killers = unpaired.filter(p => p.role === 'serialkiller').length;
  const thieves = unpaired.filter(p => p.role === 'thief').length;
  const mindFlayers = unpaired.filter(p => p.role === 'mindflayer').length;
  const charmers = unpaired.filter(p => p.role === 'charmer').length;
  const ravens = unpaired.filter(p => p.role === 'raven').length;
  if (alive.length === 1 && whiteWolves) return 'whitewolf';
  if (killers || ravens || thieves || mindFlayers || charmers) return alive.length === 1 ? (killers ? 'serialkiller' : ravens ? 'raven' : thieves || charmers ? 'draw' : null) : null;
  if (!wolves) return whiteWolves || livingLovers ? null : 'village';
  if (livingLovers) return null;
  return wolves >= alive.length - wolves ? 'wolf' : null;
}
export function voteWinner(players: Player[], executedId: number | null, lovers: Record<number,number> = {}): WinningSide | null {
  const executed = players.find(p => p.id === executedId && p.alive);
  if (executed?.role === 'jester' && lovers[executed.id] === undefined) return 'jester';
  return winner(players.map(p => p.id === executedId ? {...p, alive: false} : p),lovers);
}

/** A tie produces no elimination. Skip participates as a normal vote. */
export function tally(votes: (number | null)[]): number | null {
  const counts = new Map<number | null, number>();
  for (const v of votes) counts.set(v, (counts.get(v) || 0) + 1);
  const sorted = [...counts.entries()].sort((a,b) => b[1] - a[1]);
  return !sorted.length || (sorted.length > 1 && sorted[0][1] === sorted[1][1]) ? null : sorted[0][0];
}
/** Pick top pack targets. By default a cutoff tie selects no tied target. */
export function tallyPack(votes: number[], limit: number, randomTies = false, random = Math.random): number[] {
  const counts = new Map<number, number>();
  for (const v of votes) counts.set(v, (counts.get(v) || 0) + 1);
  const levels = [...new Set(counts.values())].sort((a,b)=>b-a);
  const result: number[] = [];
  for (const score of levels) {
    const tied = [...counts].filter(([, n])=>n===score).map(([id])=>id);
    if (tied.length > limit-result.length) { if (randomTies) result.push(...shuffle(tied,random).slice(0,limit-result.length)); break; }
    result.push(...tied);
    if (result.length===limit) break;
  }
  return result;
}
/** Random card chances are relative weights; manually selected counts are untouched. */
export function resolveRandomRoles(counts: Record<Role,number>, randomCounts: Record<'village'|'wolf'|'neutral',number>, order: Role[], chances: Partial<Record<Role,number>> = {}, unique = false, random = Math.random, excluded: readonly Role[] = [], powerWeight?: (role:Role, resolved:Record<Role,number>, remaining:number)=>number): Record<Role,number> {
  const resolved = {...counts};
  for (const team of ['village','wolf','neutral'] as const) {
    for (let i=0; i<randomCounts[team]; i++) {
      const candidates = order.filter(role => roles[role].team===team && !excluded.includes(role) && (!unique || resolved[role]===0)).map(role=>{
        const raw = chances?.[role];
        const weight = typeof raw==='number' && Number.isFinite(raw) ? Math.max(0,Math.min(100,raw)) : 100;
        return {role,weight:weight * (powerWeight ? Math.max(0,powerWeight(role,resolved,randomCounts[team]-i)) : 1)};
      }).filter(candidate=>candidate.weight>0);
      const total=candidates.reduce((sum,candidate)=>sum+candidate.weight,0);
      if (!total) throw new Error(`Not enough eligible ${team} roles for Random cards. Enable more roles, increase role chances, or allow repeated roles.`);
      let draw=Math.max(0,Math.min(0.999999999999,random()))*total;
      let chosen=candidates[candidates.length-1].role;
      for (const candidate of candidates) { if (draw<candidate.weight) { chosen=candidate.role; break; } draw-=candidate.weight; }
      resolved[chosen]++;
    }
  }
  return resolved;
}
export function deal(names: string[], counts: Record<Role, number>): Player[] {
  if (Object.keys(roles).some(r => !Number.isInteger(counts[r as Role]) || counts[r as Role] < 0)) throw new Error('Role counts must be non-negative whole numbers.');
  const deck = shuffle((Object.keys(roles) as Role[]).flatMap(r => Array(counts[r]).fill(r) as Role[]));
  const wolfCount = (Object.keys(roles) as Role[]).filter(r => roles[r].team === 'wolf').reduce((sum,r) => sum + counts[r],0);
  if (names.length !== deck.length || wolfCount < 1 || wolfCount >= names.length / 2) throw new Error('Choose one role per player and keep wolves fewer than half of the players.');
  return names.map((name, id) => ({ id, name, role: deck[id], alive: true }));
}

/** Video-inspired basic lineup. Assignment to individual players is randomized by deal(). */
export function randomLineup(playerCount: number, madmanCount = 0): Record<Role,number> {
  if (!Number.isInteger(playerCount) || playerCount < 4 || playerCount > 24) throw new Error('Automatic distribution needs 4–24 players.');
  if (!Number.isInteger(madmanCount) || madmanCount < 0) throw new Error('Madman count must be a non-negative whole number.');
  // The reference recommends these lineups for 6–16 players. Applying the
  // nearest bracket to 4–5 and 17–24 is an unverified extrapolation.
  const wolves = playerCount <= 8 ? 1 : 2;
  const seers = playerCount <= 8 ? 0 : 1;
  if (madmanCount > seers) throw new Error(`This basic lineup supports at most ${seers} Madmen. Reduce the Madman count, or add eligible village roles manually.`);
  const counts=Object.fromEntries((Object.keys(roles) as Role[]).map(role=>[role,0])) as Record<Role,number>;
  counts.werewolf=wolves;
  counts.seer=seers;
  counts.villager=playerCount-wolves-seers;
  return counts;
}

/** Resolve wolf attack, mayor protection and templar water together. */
export function resolveNight(players: Player[], votes: number[], saves: number[], assembly: boolean, shots: {actor: number; target: number}[], guards: {actor: number; target: number}[] = [], bullets: {actor: number; target: number}[] = [], extra: { serials: {actor:number;target:number}[]; visitors: {actor:number;target:number}[]; shields: number[]; strong?: {actor:number;target:number}[]; lone?: {actor:number;target:number}[]; packVotes?: {actor:number;target:number}[]; enraged?: boolean; curses?: Record<number, number[]>; triggeredCurses?: number[]; thieves?: {actor:number;target:number}[]; successfulThefts?: {actor:number;target:number}[]; lovers?: Record<number,number>; madmen?: number[]; visitorDangerousRoles?: boolean; visitorAttackedTarget?: boolean; bodyguardProtectAll?: boolean; packAttackLimit?: number; randomPackTies?: boolean; ravenReflectAttackers?: boolean } = {serials:[],visitors:[],shields:[]}): Player[] {
  const killed = new Set<number>();
  const usedGuards = new Set<number>();
  const isPartner = (actor: number, target: number) => extra.lovers?.[actor] === target;
  const landedThefts: Visit[] = [];
  // A marked attacker is reflected back by the targeted Raven. Pack ballots identify the attackers.
  const reflected = (actor: number, target: number): boolean => {
    if (extra.ravenReflectAttackers !== false && players.some(p => p.alive && p.id === target && p.role === 'raven') && (extra.curses?.[target] || []).includes(actor)) {
      killed.add(actor); return true;
    }
    return false;
  };
  // Lone Wolf attacks occur before the pack's vote resolves. A wolf killed here cannot vote.
  for (const shot of extra.lone || []) {
    const target = players.find(p => p.alive && p.id === shot.target);
    if (!target || isPartner(shot.actor,shot.target) || killed.has(shot.actor) || reflected(shot.actor,shot.target) || saves.includes(target.id) || extra.shields.includes(target.id) || (assembly && teamOfPlayer(target,extra.lovers) === 'village')) continue;
    const guard = guards.find(g => g.actor !== g.target && g.target === target.id && !usedGuards.has(g.actor) && !killed.has(g.actor) && players.some(p => p.alive && p.id === g.actor) && (extra.bodyguardProtectAll === true || teamOfPlayer(target,extra.lovers) === 'village'));
    if (guard) { killed.add(guard.actor); usedGuards.add(guard.actor); } else killed.add(target.id);
  }
  const packVotes = extra.packVotes ? extra.packVotes.filter(v => !killed.has(v.actor) && !isPartner(v.actor,v.target)).map(v => v.target) : votes;
  const wolfTargets = tallyPack(packVotes, extra.enraged ? Math.max(1,Math.floor(extra.packAttackLimit ?? 2)) : 1,extra.randomPackTies === true);
  for (const id of wolfTargets) {
    const victim = players.find(p => p.alive && p.id === id);
    const voters = (extra.packVotes || []).filter(v=>v.target===id && !killed.has(v.actor) && !isPartner(v.actor,v.target));
    const effectiveVoters = voters.filter(v=>!reflected(v.actor,id));
    if (victim && (!voters.length || effectiveVoters.length > 0) && !saves.includes(victim.id) && !(assembly && teamOfPlayer(victim,extra.lovers) === 'village')) killed.add(victim.id);
  }
  for (const shot of shots) {
    const target = players.find(p => p.alive && p.id === shot.target);
    if (!target || isPartner(shot.actor,shot.target) || reflected(shot.actor,shot.target)) continue;
    killed.add(appearsWerewolf(target.role) ? target.id : shot.actor);
  }
  for (const shot of bullets) {
    if (extra.madmen?.includes(shot.target)) continue;
    if (!isPartner(shot.actor,shot.target) && players.some(p => p.alive && p.id === shot.target) && !reflected(shot.actor,shot.target)) killed.add(shot.target);
  }
  for (const shot of extra.serials) {
    if (!isPartner(shot.actor,shot.target) && players.some(p => p.alive && p.id === shot.target) && !reflected(shot.actor,shot.target)) killed.add(shot.target);
  }
  for (const shot of extra.thieves || []) {
    if (!isPartner(shot.actor,shot.target) && players.some(p => p.alive && p.id === shot.target) && !reflected(shot.actor,shot.target)) { killed.add(shot.target); landedThefts.push(shot); }
  }
  for (const shot of extra.strong || []) {
    if (killed.has(shot.actor) || isPartner(shot.actor,shot.target)) continue;
    const target = players.find(p => p.alive && p.id === shot.target);
    if (target && !reflected(shot.actor,shot.target) && !saves.includes(target.id) && !(assembly && teamOfPlayer(target,extra.lovers) === 'village')) killed.add(target.id);
  }
  // Triggered curses kill marked living players at dawn (protection precedence is provisional).
  for (const raven of extra.triggeredCurses || []) {
    for (const id of extra.curses?.[raven] || []) if (!isPartner(raven,id) && players.some(p=>p.alive && p.id===id)) killed.add(id);
  }
  const attacked = new Set<number>([
    ...wolfTargets,
    ...bullets.filter(s=>!isPartner(s.actor,s.target) && !extra.madmen?.includes(s.target)).map(s => s.target), ...extra.serials.filter(s=>!isPartner(s.actor,s.target)).map(s => s.target), ...(extra.thieves || []).filter(s=>!isPartner(s.actor,s.target)).map(s=>s.target), ...(extra.strong || []).filter(s=>!killed.has(s.actor) && !isPartner(s.actor,s.target)).map(s=>s.target), ...(extra.lone || []).filter(s=>!isPartner(s.actor,s.target)).map(s=>s.target),
    ...shots.filter(s=>!isPartner(s.actor,s.target)).map(s => s.target),
  ]);
  for (const visit of extra.visitors) {
    const target = players.find(p => p.id === visit.target && p.alive);
    if (target && ((extra.visitorDangerousRoles !== false && (appearsWerewolf(target.role) || target.role === 'serialkiller')) || (extra.visitorAttackedTarget !== false && attacked.has(target.id)))) killed.add(visit.actor);
  }
  // Shields stop the attack before a bodyguard needs to intervene.
  for (const id of extra.shields) killed.delete(id);
  // One bodyguard intercepts each attacked target; this precedence is a reconstruction.
  for (const guard of guards) {
    if (!usedGuards.has(guard.actor) && !killed.has(guard.actor) && guard.actor !== guard.target && killed.has(guard.target) && players.some(p => p.id === guard.target && (extra.bodyguardProtectAll === true || teamOfPlayer(p,extra.lovers) === 'village')) && players.some(p => p.alive && p.id === guard.actor)) {
      killed.delete(guard.target);
      killed.add(guard.actor);
    }
  }
  if (extra.successfulThefts) extra.successfulThefts.push(...landedThefts.filter(shot=>killed.has(shot.target)));
  return players.map(p => killed.has(p.id) ? {...p, alive: false} : p);
}

export type Visit = { actor: number; target: number };
/** Visitors are reported once each, even when an action targets the same player repeatedly. */
export function visitorsTo(visits: Visit[], target: number): number[] {
  return [...new Set(visits.filter(v => v.target === target).map(v => v.actor))];
}

/** Apply illness after night actions; each doctor visit extends life by two nights. */
export function applyIllness(players: Player[], doctorSaves: Record<number,number>, remaining: Record<number,number>, corrupted: number[] = [], startingNights = 3, doctorBonus = 2): {players: Player[]; remaining: Record<number,number>} {
  const next = {...remaining};
  const updated = players.map(p => {
    if (!p.alive || p.role !== 'sickman') return p;
    const visits = Object.values(doctorSaves).filter(target => target === p.id).length;
    const remainingNights = (next[p.id] ?? startingNights) + visits * doctorBonus - 1;
    // A false illness still shows a believable countdown, but cannot kill.
    if (corrupted.includes(p.id)) { next[p.id]=Math.max(0,remainingNights); return p; }
    next[p.id] = remainingNights;
    return next[p.id] <= 0 ? {...p, alive:false} : p;
  });
  return {players: updated, remaining: next};
}

/** Convert living non-wolves or let a living Lone Werewolf join the known Werewolves at the end of the night.
 * Protection and simultaneous-action precedence are reconstructed, not verified. */
export function applyInfections(players: Player[], infections: Visit[]): { players: Player[]; converted: number[] } {
  const converted = new Set<number>(), recruited = new Set<number>();
  for (const infection of infections) {
    const actor = players.find(p=>p.id===infection.actor && p.alive && p.role==='rabidwolf');
    const target = players.find(p=>p.id===infection.target && p.alive);
    if (actor && target && target.role==='lonewolf') recruited.add(target.id);
    else if (actor && target && roles[target.role].team !== 'wolf') converted.add(target.id);
  }
  return {players:players.map(p=>converted.has(p.id) ? {...p,role:'werewolf'} : recruited.has(p.id) ? {...p,joinedPack:true} : p),converted:[...converted]};
}

/** Settle still-pending bets at the following day vote. Night successes have already been removed. */
export function settleGamblerBets(players: Player[], executed: number | null, bets: Visit[], previousCorrect: Record<number,number>, lovers: Record<number,number> = {}, requiredCorrect = 2): {players: Player[]; correct: Record<number,number>; indebted: number[]; ready: number[]} {
  const correct = {...previousCorrect}, indebted: number[] = [], ready: number[] = [];
  for (const bet of bets) {
    const gambler = players.find(p=>p.id===bet.actor && p.alive && p.role==='gambler');
    if (!gambler) continue;
    if (executed !== null && bet.target === executed) {
      correct[gambler.id] = (correct[gambler.id] || 0) + 1;
      if (correct[gambler.id] >= requiredCorrect && lovers[gambler.id] === undefined) ready.push(gambler.id);
    } else indebted.push(gambler.id);
  }
  return {players,correct,indebted,ready};
}
/** Credit actual night deaths once, retaining surviving targets until the following vote.
 * Called after protection, revival, conversion and earlier escape eligibility resolve.
 * New threshold successes must survive the NEXT night, never escape at this dawn.
 */
export function settleGamblerNightBets(before: Player[], after: Player[], bets: Visit[], previousCorrect: Record<number,number>, lovers: Record<number,number> = {}, requiredCorrect = 2): {correct: Record<number,number>; ready: number[]; pending: Visit[]} {
  const correct = {...previousCorrect}, ready: number[] = [], pending: Visit[] = [];
  const deaths = new Set(before.filter(p=>p.alive && after.some(q=>q.id===p.id && !q.alive && !q.escaped)).map(p=>p.id));
  for (const bet of bets) {
    const gambler = after.find(p=>p.id===bet.actor && p.alive && p.role==='gambler');
    if (!gambler) continue;
    if (!deaths.has(bet.target)) { pending.push(bet); continue; }
    correct[gambler.id] = (correct[gambler.id] || 0) + 1;
    if (correct[gambler.id] >= requiredCorrect && lovers[gambler.id] === undefined) ready.push(gambler.id);
  }
  return {correct,ready,pending};
}

/** Escape at dawn only if the ready Gambler survived and still belongs to their own team. */
export function resolveGamblerEscapes(players: Player[], ready: number[], lovers: Record<number,number> = {}): {players: Player[]; escaped: number[]} {
  const escaped=players.filter(p=>p.alive && p.role==='gambler' && ready.includes(p.id) && lovers[p.id]===undefined).map(p=>p.id);
  return {players:players.map(p=>escaped.includes(p.id) ? {...p,alive:false,escaped:true} : p),escaped};
}
/** Collect outstanding debt once; doctor protection stops it. */
export function collectGamblerDebts(players: Player[], indebted: number[], doctorSaves: Record<number,number>): Player[] {
  const saved = Object.values(doctorSaves);
  return players.map(p=>p.alive && p.role==='gambler' && indebted.includes(p.id) && !saved.includes(p.id) ? {...p,alive:false} : p);
}

/** Return a living Mind Flayer whose parasites cover every other living player. */
export function mindFlayerWinner(players: Player[], parasites: Record<number,number[]>, lovers: Record<number,number> = {}): number | null {
  const living=players.filter(p=>p.alive);
  return living.find(p=>p.role==='mindflayer' && lovers[p.id]===undefined && living.every(q=>q.id===p.id || (parasites[p.id] || []).includes(q.id)))?.id ?? null;
}
/** Skipping gives one parasite, with a 20% chance by default. */
export function regenerateParasite(stock: number, random = Math.random, chance = 0.2): number {
  return stock + (random() < chance ? 1 : 0);
}

/** Generate two candidates; the chance and first report timing are provisional. */
export function intelligenceReport(players: Player[], actorId: number, random = Math.random): number[] {
  const candidates = players.filter(p=>p.alive && p.id!==actorId);
  if (candidates.length <= 1) return candidates.map(p=>p.id);
  const threats = candidates.filter(p=>roles[p.role].team !== 'village');
  if (threats.length && random() < 0.5) {
    const threat = threats[Math.min(threats.length-1, Math.floor(random()*threats.length))];
    const other = shuffle(candidates.filter(p=>p.id!==threat.id),random)[0];
    return shuffle([threat.id,other.id],random);
  }
  return shuffle(candidates,random).slice(0,2).map(p=>p.id);
}

/** Surviving Thieves take the original role of their dead target after resolution. */
export function applyThefts(before: Player[], after: Player[], thefts: Visit[]): {players: Player[]; stolen: Record<number,Role>} {
  const stolen: Record<number,Role> = {};
  for (const theft of thefts) {
    const actor = after.find(p=>p.id===theft.actor && p.alive && p.role==='thief');
    const original = before.find(p=>p.id===theft.target && p.alive);
    const target = after.find(p=>p.id===theft.target);
    if (actor && original && target && !target.alive && !target.escaped) stolen[actor.id] = original.role;
  }
  return {players:after.map(p=>stolen[p.id] ? {...p,role:stolen[p.id]} : p),stolen};
}

/** A Police player may not detain themselves, dead players, or last night's target. */
export function canDetain(players: Player[], actor: number, target: number, last: Record<number,number>): boolean {
  return actor !== target && last[actor] !== target && players.some(p=>p.id===actor && p.alive && p.role==='police') && players.some(p=>p.id===target && p.alive);
}
/** Hypnosis takes effect at night end and only affects living village roles. */
export function applyHypnosis(players: Player[], attempts: Visit[], already: number[]): number[] {
  // Hypnosis is a village-role effect; conversion to another team clears it.
  const result = new Set(already.filter(id=>players.some(p=>p.id===id && roles[p.role].team==='village')));
  for (const {target} of attempts) {
    const player=players.find(p=>p.id===target && p.alive);
    if (player && roles[player.role].team === 'village') result.add(target);
  }
  return [...result];
}

/** End a night: age old hypnosis, then apply successful new attempts for future nights. */
export function advanceHypnosis(players: Player[], attempts: Visit[], previous: Record<number,number|null>, activeMadmen: number[], round: number, duration: number): { expires: Record<number,number|null>; corrupted: number[] } {
  const expires: Record<number,number|null> = {};
  const valid = new Set(applyHypnosis(players,[],Object.keys(previous).map(Number)));
  for (const [key,end] of Object.entries(previous)) {
    const id=Number(key);
    if (valid.has(id) && (end===null || end>round)) expires[id]=end;
  }
  for (const id of applyHypnosis(players,attempts,[])) {
    const end=duration===0 ? null : round+Math.max(1,Math.min(5,Math.floor(duration)));
    const old=expires[id];
    expires[id]=old===null || end===null ? null : Math.max(old ?? 0,end);
  }
  return {expires,corrupted:[...new Set([...applyHypnosis(players,[],activeMadmen),...Object.keys(expires).map(Number)])]};
}

/** A Chef needs two other living players to invite. */
export function canChefAct(players: Player[], chefId: number): boolean {
  return players.filter(p=>p.alive && p.id!==chefId).length >= 2;
}
/** Privately assign each unblocked Celebrity to one other living player. */
export function celebrityReveals(players: Player[], blocked: number[] = [], corrupted: number[] = [], random = Math.random, audience = 1): Record<number,string[]> {
  const living=players.filter(p=>p.alive);
  const result:Record<number,string[]>={};
  for (const star of living.filter(p=>p.role==='celebrity' && !blocked.includes(p.id) && !corrupted.includes(p.id))) {
    const candidates=living.filter(p=>p.id!==star.id);
    const count=Math.max(0,Math.min(candidates.length,Math.floor(audience)));
    for (let i=0;i<count;i++) {
      const index=Math.min(candidates.length-1,Math.floor(random()*candidates.length));
      const [recipient]=candidates.splice(index,1);
      (result[recipient.id] ||= []).push(star.name);
    }
  }
  return result;
}

/** Madmen use an eligible village role as a disguise; the role itself remains visible. */
export function isEligibleMadmanRole(role: Role): boolean {
  return roles[role].team === 'village' && role !== 'villager' && role !== 'muted' && role !== 'madman';
}
/** Replace each Madman card with a private village disguise before play starts. */
export function disguiseMadmanCards(players:Player[], random = Math.random): {players:Player[]; madmen:number[]} {
  const choices=(Object.keys(roles) as Role[]).filter(isEligibleMadmanRole);
  const madmen:number[]=[];
  const disguised=players.map(player=>{
    if(player.role!=='madman') return player;
    madmen.push(player.id);
    const index=Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)));
    return {...player,role:choices[index]};
  });
  return {players:disguised,madmen};
}
export function selectMadmen(players: Player[], count: number, random = Math.random): number[] {
  if (!Number.isInteger(count) || count < 0) throw new Error('Madman count must be a non-negative whole number.');
  const eligible=players.filter(p=>isEligibleMadmanRole(p.role));
  if (count > eligible.length) throw new Error(`Choose at most ${eligible.length} Madmen: only eligible village roles can be disguised.`);
  return shuffle(eligible,random).slice(0,count).map(p=>p.id);
}

/** Resolve simultaneous detentions. An already-detained Police player cannot detain anyone.
 * Mutual cycles cancel their actions while detaining the officers in the cycle. */
export function resolveDetentions(attempts: Visit[]): { blocked: number[]; effective: Visit[] } {
  const remaining = new Map(attempts.map(a=>[a.actor,a]));
  const blocked = new Set<number>();
  const effective: Visit[] = [];
  while (remaining.size) {
    const incoming = new Set([...remaining.values()].map(a=>a.target));
    const roots = [...remaining.keys()].filter(id=>!incoming.has(id));
    if (!roots.length) {
      // With at most one target per officer, the remaining nodes form cycles.
      for (const id of remaining.keys()) blocked.add(id);
      break;
    }
    for (const id of roots) {
      const action=remaining.get(id)!;
      remaining.delete(id);
      if (!blocked.has(id)) { effective.push(action); blocked.add(action.target); }
    }
    for (const id of blocked) remaining.delete(id);
  }
  return {blocked:[...blocked],effective};
}
