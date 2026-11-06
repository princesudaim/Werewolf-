import type { Role, Settings } from './werewolf-engine';

/** All 35 roles reviewed in seven batches of five. */
export const SMART_DESCRIPTION_ROLES: readonly Role[] = ['werewolf','hypnowolf','rabidwolf','lonewolf','wolfpup','doctor','seer','chef','mayor','journalist','sheriff','templar','bodyguard','necromancer','visitor','police','detective','psychic','instigator','celebrity','villager','muted','sickman','survivor','jester','strongwolf','whitewolf','serialkiller','raven','thief','charmer','gambler','mindflayer','intelligence','madman'];
export const DESCRIPTION_LIMITS = { words: 70, characters: 440 } as const;
export type DescriptionContext = {
  /** The dealt lineup, including dead roles. Never filter by secret deaths/blocks. */
  matchRoles?: readonly Role[];
  night?: number;
  hypnoUsesLeft?: number;
  voteMarkerUsesLeft?: number;
  sickNightsLeft?: number;
  shieldsLeft?: number;
  celebrityFameLeft?: number;
  knownWolves?: number;
  ravenMarkedCount?: number;
  friendAlive?: boolean;
  friendMessageSent?: boolean;
  friendCanSend?: boolean;
  friendCanChoose?: boolean;
  gamblerCorrect?: number;
  gamblerReady?: boolean;
  gamblerDebt?: boolean;
  tinyCreaturesLeft?: number;
  enraged?: boolean;
  joinedPack?: boolean;
  hasFriend?: boolean;
};
type Line = { full: string; short: string };
export const descriptionFits = (text: string) => text.trim().split(/\s+/).filter(Boolean).length <= DESCRIPTION_LIMITS.words && Array.from(text).length <= DESCRIPTION_LIMITS.characters;

/** Shorten whole ideas, never slice text, hide an essential rule or add ellipses. */
function fitLines(lines: Line[]): string {
  const result=lines.map(line=>line.full);
  const savings=lines.map((line,index)=>({index,saved:line.full.length-line.short.length})).sort((a,b)=>b.saved-a.saved);
  for(const {index} of savings){
    if(descriptionFits(result.join('\n')))break;
    result[index]=lines[index].short;
  }
  return result.join('\n');
}

/** A deterministic settings/lineup-aware writer, not a text truncator or AI call. */
export function smartRoleDescription(role: Role, settings: Settings, context: DescriptionContext = {}): string | undefined {
  if(!SMART_DESCRIPTION_ROLES.includes(role))return undefined;
  const has=(other:Role)=>context.matchRoles===undefined || context.matchRoles.includes(other);
  const lines:Line[]=[];
  const add=(full:string,short=full)=>lines.push({full,short});
  const tie=()=>add(settings.wolfRandomTies
    ? 'If votes tie, the game picks a tied player at random'
    : 'If votes tie, no one dies from the Werewolves’ vote', settings.wolfRandomTies ? 'Tied votes: pick a tied player at random' : 'Tied votes: no Werewolf vote kill');
  const win=()=>add(context.hasFriend ? 'You and your friend win when everyone else is gone' : 'You win with the Werewolves');
  const pup=has('wolfpup');
  const canInfect=settings.rabidCanInfect && has('rabidwolf');
  const n=context.night;
  const villageWin=()=>add(context.hasFriend ? 'You and your friend win when everyone else is gone' : 'You win with the village');
  const soloWin=()=>add(context.hasFriend ? 'You and your friend win when everyone else is gone' : 'Be the last player alive to win');
  const scheduledAttack=(interval:number)=>{
    if(n===1 && settings.firstNightSafe){add('No attacks tonight');return;}
    if(n!==undefined && n%interval!==0)add('No attack tonight');
    add(interval===1 ? 'Attack 1 player each night' : `Attack 1 player on nights ${interval}, ${interval*2}, ${interval*3}, and so on`);
  };
  switch(role){
    case 'charmer':
      add('Your Friends team wins when everyone else is gone');
      add('Only 1 of you needs to be alive');
      if(context.hasFriend)add('You already have your friend');
      else add(n===undefined ? `From night ${settings.charmerFirstNight}, choose your 1 friend` : n<settings.charmerFirstNight ? `Wait until night ${settings.charmerFirstNight} to choose a friend` : context.friendCanChoose===false ? 'No player is available to be your friend tonight' : 'Choose your 1 friend');
      if(!settings.charmerMessages)add('Private messages are off');
      else if(!context.hasFriend && n!==undefined && (n<settings.charmerFirstNight || context.friendCanChoose===false))break;
      else if(context.hasFriend && context.friendAlive===false)add('No messages: your friend has died');
      else if(context.friendMessageSent)add('You already sent your message or reply tonight');
      else if(context.hasFriend && context.friendCanSend===false)add('You can reply once when a message arrives');
      else add('Send 1 message per night; your friend can reply once');
      if(settings.charmerMessages && !(context.hasFriend && context.friendAlive===false))add('Messages arrive next night');
      break;
    case 'gambler': {
      if(context.hasFriend)add('Your Friends team wins when everyone else is gone');
      else if(context.gamblerReady)add('Survive tonight to win and leave in the morning');
      else {
        const need=Math.max(0,settings.gamblerPredictions-(context.gamblerCorrect ?? 0));
        const more=context.gamblerCorrect===undefined ? '' : 'more ';
        add(`Get ${need} ${more}correct ${need===1?'guess':'guesses'}, then survive the next night to win and leave`, `Get ${need} ${more}right ${need===1?'guess':'guesses'}; survive the next night to win and leave`);
      }
      if(context.gamblerReady && !context.hasFriend){
        add('You can still bet on 1 living player');
        add(settings.gamblerBetProtection ? 'A bet saves you from attacks that night' : 'A bet does not save you from attacks');
        if(context.gamblerDebt){add('Wrong guess: you die tonight');if(has('doctor'))add('A Doctor can save you');}
        break;
      }
      add('At night, bet on 1 living player', 'Bet on 1 living player');
      add('Correct if they die tonight or are voted out tomorrow', 'Win a point: death tonight or vote-out tomorrow');
      if(has('necromancer'))add('Night deaths count only if not revived', 'Revived that night: no death point');
      add(settings.gamblerBetProtection ? 'A bet saves you from attacks that night' : 'A bet does not save you from attacks', settings.gamblerBetProtection ? 'Betting protects you from attacks' : 'Betting gives no attack protection');
      add(context.gamblerDebt ? 'Wrong guess: you die tonight' : 'Wrong guess: you die the next night',context.gamblerDebt ? 'Wrong guess: die tonight' : 'Wrong guess: die next night');
      if(has('doctor'))add('A Doctor can save you');
      break;
    }
    case 'mindflayer': {
      if(context.hasFriend){villageWin();add('Marking everyone will not give you a solo win');}
      else add('Put a tiny creature on every other living player to win');
      const stock=context.tinyCreaturesLeft ?? settings.mindStartingParasites;
      add(context.tinyCreaturesLeft===undefined ? `Start with ${stock} tiny ${stock===1?'creature':'creatures'}` : `${stock} tiny ${stock===1?'creature':'creatures'} left`);
      if(stock>0)add('Each night, put 1 on a player');
      if(settings.mindRegenPercent===0)add('Skipping gives no new creatures');
      else if(settings.mindRegenPercent===100)add('Skip to get 1 more');
      else add(`Skip for a ${settings.mindRegenPercent}% chance to get 1 more`);
      break;
    }
    case 'intelligence':
      villageWin();
      if(n!==undefined && n%settings.intelligenceInterval!==0){
        add('No report tonight');
        add(`Reports come on nights ${settings.intelligenceInterval}, ${settings.intelligenceInterval*2}, ${settings.intelligenceInterval*3}, and so on`);
        break;
      }
      add(n!==undefined ? 'Get names tonight' : settings.intelligenceInterval===1 ? 'Get names each night' : `Get names on nights ${settings.intelligenceInterval}, ${settings.intelligenceInterval*2}, ${settings.intelligenceInterval*3}, and so on`);
      add('One may be a Werewolf or solo player');
      add('The report can be wrong');
      break;
    case 'madman':
      villageWin();
      add('You see a different village role as your own');
      add('Your ability fails or gives wrong info');
      add('You find out you are Madman when the game ends');
      break;
    case 'strongwolf':
      win();
      if(context.knownWolves!==undefined)add(context.knownWolves===0 ? 'You do not know any other Werewolves' : 'You know some other Werewolves');
      if(n===1 && settings.firstNightSafe){add('No attacks tonight');break;}
      if(n===undefined)add(`Attack 1 player on nights ${settings.firstNightSafe ? '3, 5, 7' : '1, 3, 5'}, and so on`);
      else add(n%2===1 ? 'Tonight, attack 1 player' : 'Pick 1 player tonight');
      add(n!==undefined && n%2===0 ? 'Your attack works only if no other teammate can attack' : 'If no other teammate can attack, you can attack every night');
      break;
    case 'whitewolf':
      soloWin();
      if(!context.hasFriend)add('You play alone');
      add('Other wolves think you are on their team');
      if(n===1 && settings.firstNightSafe){add('No attacks tonight');break;}
      add('At night, vote with wolves to attack 1 player', 'Vote with wolves to attack 1 player');
      add(settings.whiteWolfBetrayPack || context.hasFriend ? 'You can target wolves you know' : 'You cannot target wolves you know');
      tie();
      if(pup)add('If Wolf Pup dies, vote for 2 targets next night', 'Wolf Pup dies: vote for 2 next night');
      if(context.hasFriend)add('You cannot attack your friend');
      break;
    case 'serialkiller':
      soloWin();
      scheduledAttack(settings.serialKillerInterval);
      if(has('seer'))add(settings.seerShowExactRole ? 'You look like a Villager when checked' : 'Checks do not show you as a Werewolf');
      if(context.hasFriend)add('You cannot attack your friend');
      break;
    case 'raven': {
      soloWin();
      const marked=context.ravenMarkedCount;
      add(marked===undefined ? 'Each night, mark 1 player or kill everyone you marked' : marked===0 ? 'Mark 1 player tonight' : `Mark 1 player or kill your ${marked} marked ${marked===1?'player':'players'}`);
      add(settings.ravenReflectAttackers ? 'If a marked player attacks you, they die instead' : 'Marked players can still kill you');
      if(context.hasFriend)add('Your friend is safe from your attacks');
      break;
    }
    case 'thief':
      if(context.hasFriend)villageWin();else add('Steal a role and win with your new team');
      if(settings.thiefDeathOnly===true){
        add(settings.thiefTargetMode==='persistent' ? 'Choose 1 living player to watch until they die, without attacking them' : settings.thiefTargetMode==='cycle' ? 'Choose 1 living player without attacking them' : 'Each night, choose 1 living player without attacking them');
        add(settings.thiefTargetMode==='cycle' ? 'If they die tonight or are voted out tomorrow and you survive, take their role' : 'If they die or are voted out and you survive, take their role');
      }else{scheduledAttack(settings.thiefAttackInterval);add('If your target dies and you survive, take their role');}
      if(context.hasFriend)add('You stay on the Friends team');
      break;
    case 'villager':
      villageWin();
      add('You have no action at night');
      add(context.hasFriend ? 'Talk with everyone and vote out your enemies' : 'Talk with everyone and vote out the Werewolves');
      break;
    case 'muted':
      villageWin();
      add('Each night you can mute someone');
      add('They can still vote and use their night ability');
      add('You may skip; repeats on later nights are allowed');
      break;
    case 'sickman': {
      villageWin();
      const left=context.sickNightsLeft;
      add(left===undefined ? `You die after ${settings.sickStartingNights} ${settings.sickStartingNights===1?'night':'nights'} without help` : left<=1 ? 'Without help, you die tonight' : `You have ${left} nights left without help`);
      if(has('doctor'))add(settings.sickDoctorBonus===0 ? 'Doctor visits do not give you more nights' : `A Doctor visit gives you ${settings.sickDoctorBonus} more ${settings.sickDoctorBonus===1?'night':'nights'}`);
      add('You have no action at night');
      break;
    }
    case 'survivor': {
      if(context.hasFriend)villageWin();else add('Stay alive until the game ends to win');
      const left=context.shieldsLeft;
      const count=left ?? settings.survivorShieldCount;
      if(count===0){add('No shields left');break;}
      add(`${count} ${count===1?'shield':'shields'} ${left===undefined?'per game':'left'}`);
      if(settings.firstNightSafe && n===1)add('Save your shields; you cannot use one tonight');
      else{
        add('Use 1 shield to block attacks for 1 night');
        if(settings.firstNightSafe && n===undefined)add('You cannot use a shield on the first night');
      }
      break;
    }
    case 'jester':
      if(context.hasFriend){villageWin();add('Being voted out will not win the game for you');}
      else{add('Get the other players to vote you out');add('If they do, you win and the game ends');}
      add('You have no action at night');
      break;
    case 'police':
      villageWin();
      add("Each night, block 1 player's night ability");
      add(settings.policeNotifyBlocked ? 'Everyone sees who you blocked in the morning report' : 'Your block is not announced');
      add(settings.policeRepeatTarget ? 'You can pick the same player two nights in a row' : 'You cannot pick the same player two nights in a row');
      break;
    case 'detective':
      villageWin();
      add('Each night, pick 1 player to watch');
      add(settings.detectiveShowNames ? 'On your next turn, see who visited them' : 'On your next turn, see how many players visited them');
      break;
    case 'psychic':
      villageWin();
      add('Each night, pick 1 player to see their team');
      if(has('charmer'))add(settings.psychicShowFriends ? 'Friends are shown as the Friends team' : 'Friends are shown as neutral');
      break;
    case 'instigator': {
      villageWin();
      const left=context.voteMarkerUsesLeft;
      if(left===0){add('Your marks are used up');break;}
      add('At night, pick 1 player');
      add('They start the next vote with 2 votes against them');
      const uses=left ?? settings.instigatorMaxUses;
      add(`${uses} ${uses===1?'use':'uses'} ${left===undefined?'per game':'left'}`);
      break;
    }
    case 'celebrity': {
      villageWin();
      const audience=settings.celebrityAudience;
      const who=audience===1?'One person':`${audience} people`;
      const knows=audience===1?'knows':'know';
      const when=settings.celebrityFameNights===2?'On 2 nights, ':settings.celebrityFameNights===1?'':'Each night, ';
      add(`${when}${when?who.toLowerCase():who} ${knows} you because of your fame`);
      break;
    }
    case 'sheriff':
      villageWin();
      add('At night, you can shoot 1 player');
      add(settings.sheriffEveryNight ? 'You can shoot once each night' : 'You have 1 bullet for the whole game');
      add('Be careful: you can kill a village player');
      break;
    case 'templar':
      villageWin();
      add('Use water on 1 player at night');
      add(`${settings.templarUses} ${settings.templarUses===1?'use':'uses'} per game`);
      add('If they are a Werewolf, they die');
      add('If not, you die');
      break;
    case 'bodyguard':
      villageWin();
      add(`Each night, pick ${settings.bodyguardProtectAll ? 'a player from any team' : 'a village player'} to protect`);
      add('If they would die, you die instead');
      add('Choosing a player does not show their team');
      break;
    case 'necromancer':
      villageWin();
      add('At night, bring 1 dead player back to life');
      add(`${settings.necromancerUses} ${settings.necromancerUses===1?'use':'uses'} per game`);
      break;
    case 'visitor':
      villageWin();
      add('Each night, visit 1 player');
      if(n===1 && settings.firstNightSafe){add('Visiting cannot kill you tonight');break;}
      if(settings.visitorDangerousRoles)add(has('serialkiller') ? 'You die if you visit a Werewolf or Serial Killer' : 'You die if you visit a Werewolf');
      if(settings.visitorAttackedTarget)add('You die if the player you visit is attacked');
      add('You can still die if someone attacks you');
      if(settings.firstNightSafe && n===undefined)add('On the first night, visiting cannot kill you');
      break;
    case 'doctor':
      villageWin();
      add('Each night, protect 1 player from Werewolf attacks');
      add(settings.doctorSelfProtect ? 'You can pick yourself' : 'You cannot protect yourself');
      add(settings.doctorRepeatProtect ? 'You can pick the same player two nights in a row' : 'You cannot pick the same player two nights in a row');
      break;
    case 'seer':
      villageWin();
      add(settings.seerShowExactRole ? 'Each night, pick 1 player to see their role' : 'Each night, check if 1 player looks like a Werewolf');
      if(['whitewolf','serialkiller','hypnowolf'].some(other=>has(other as Role)))add('Some results can be wrong');
      break;
    case 'chef': {
      villageWin();
      add('Each night, pick 2 players');
      add('See if they are on the same team');
      const neutralRoles: readonly Role[]=['charmer','gambler','whitewolf','raven','serialkiller','survivor','jester','mindflayer','thief'];
      const neutrals=context.matchRoles?.filter(other=>neutralRoles.includes(other)).length;
      if(neutrals===undefined || neutrals>=2)add(settings.chefNeutralsTogether ? 'Neutral roles count as the same team' : 'Neutral roles count as different teams');
      if(has('charmer'))add('Friends are on the same team only with their own friend');
      break;
    }
    case 'mayor':
      villageWin();
      add('Once per game, call a meeting at night');
      add('Village players are safe from Werewolf attacks that night');
      add('Your role is shown to everyone in the morning');
      add(`After your meeting, your vote counts ${settings.mayorDoubleVote ? 'twice' : 'once'}`);
      if(settings.firstNightSafe && (n===undefined || n===1))add('You cannot call a meeting on the first night');
      break;
    case 'journalist':
      villageWin();
      add('At night, write a headline of up to 10 characters');
      if(settings.journalistDrawing)add('You can also draw a picture');
      add('Everyone sees your news in the morning');
      break;
    case 'werewolf':
      win();
      add(n===1 && settings.firstNightSafe ? 'No attacks tonight; vote to attack from night 2' : 'At night, vote with the Werewolves to attack 1 player');
      tie();
      if(pup)add('If Wolf Pup dies, your team can attack 2 players next night');
      break;
    case 'hypnowolf': {
      win();add('You cannot vote to attack');
      const left=context.hypnoUsesLeft;
      if(left===0){add('Your hypnosis is used up');break;}
      const uses=settings.hypnoMaxUses===0 ? 'each night' : left!==undefined ? `${left} ${left===1?'use':'uses'} left` : `${settings.hypnoMaxUses} ${settings.hypnoMaxUses===1?'use':'uses'} per game`;
      add(`Pick 1 Villager to hypnotize (${uses})`);
      add('From next night, their ability fails or gives wrong info');
      add(settings.hypnoDuration===0 ? 'The effect lasts until the game ends' : `The effect lasts ${settings.hypnoDuration} ${settings.hypnoDuration===1?'night':'nights'}`);
      if(pup)add(context.enraged ? 'Tonight, you can hypnotize 2 players with 1 use' : 'If Wolf Pup dies, pick 2 next night with 1 use');
      break;
    }
    case 'rabidwolf':
      win();
      if(settings.rabidCanInfect){
        if(n===undefined || n===1 || context.enraged){
          add(n===undefined ? 'Night 1: turn 1 player into a Werewolf' : context.enraged ? 'Tonight, turn up to 2 players into Werewolves' : 'Tonight, turn 1 player into a Werewolf');
          if(has('lonewolf'))add('Lone Werewolf keeps their role but meets the Werewolves');
        }
        if(pup && !context.enraged)add('If Wolf Pup dies, turn up to 2 players next night instead of attacking', 'Wolf Pup dies: turn up to 2 next night, not attack');
      }else add('Infection is off; you cannot turn players into Werewolves');
      add(n===1 ? 'From night 2, vote with Werewolves to attack 1 player' : context.enraged && settings.rabidCanInfect ? 'Tonight you infect, not attack' : 'From night 2, vote with Werewolves to attack 1 player');
      tie();break;
    case 'lonewolf': {
      win();
      const otherWolves=context.matchRoles===undefined || context.matchRoles.some(r=>['werewolf','strongwolf','rabidwolf','wolfpup','hypnowolf','whitewolf'].includes(r)) || context.matchRoles.filter(r=>r==='lonewolf').length>1;
      const otherAttackers=context.matchRoles===undefined || context.matchRoles.some(r=>['werewolf','strongwolf','rabidwolf'].includes(r)) || context.matchRoles.filter(r=>r==='lonewolf').length>1;
      if(otherWolves)add(context.joinedPack ? 'You now know the other Werewolves' : 'You and the other Werewolves do not know each other');
      const interval=settings.loneWolfInterval;
      const when=interval===1 ? 'each night' : `on nights ${interval}, ${interval*2}, ${interval*3}, and so on`;
      add(n===1 && settings.firstNightSafe ? 'No attacks tonight' : n!==undefined && n%interval!==0 ? `No attack tonight; attack ${when}` : `Attack 1 player alone ${when}`, n===1 && settings.firstNightSafe ? 'No attacks tonight' : n!==undefined && n%interval!==0 ? `Wait; attack ${when}` : `Attack 1 player ${when}`);
      if(!(n===1 && settings.firstNightSafe) && (n===undefined || n%interval===0)){
        add(otherAttackers ? 'Your attack has a 25% chance if another wolf on your team can attack, or 100% if not' : 'Your attack chance is 100%',otherAttackers ? '25% attack chance if another wolf on your team can attack, 100% if not' : 'Your attack chance is 100%');
        if(otherWolves && !context.joinedPack)add('You can also attack other Werewolves');
      }
      if(canInfect && !context.joinedPack)add('If Infecting Wolf picks you, you meet the wolves and keep your role', 'Infecting Wolf picks you: meet wolves; keep your role');
      if(has('charmer'))add(context.hasFriend ? 'You cannot attack your friend' : 'If Friends Maker picks you, you cannot attack your friend', 'Friends Maker picks you: never attack your friend');
      break;
    }
    case 'wolfpup':
      win();add('You cannot attack');
      add('If you die, you give the other wolves a bonus kill next night');
      break;
  }
  const wait=role==='madman' ? 0 : settings.roleWaitSeconds?.[role] || 0;
  if(wait>0)add(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn`, `Wait ${wait} ${wait===1?'second':'seconds'} to finish`);
  return fitLines(lines);
}
