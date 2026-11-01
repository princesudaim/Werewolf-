import type { Role, Settings } from './werewolf-engine';

/** First batch only. Other roles keep their existing wording until reviewed. */
export const SMART_DESCRIPTION_ROLES: readonly Role[] = ['werewolf','hypnowolf','rabidwolf','lonewolf','wolfpup'];
export const DESCRIPTION_LIMITS = { words: 70, characters: 440 } as const;
export type DescriptionContext = {
  /** The dealt lineup, including dead roles. Never filter by secret deaths/blocks. */
  matchRoles?: readonly Role[];
  night?: number;
  hypnoUsesLeft?: number;
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
  switch(role){
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
      add(n===1 && settings.firstNightSafe ? 'No attacks tonight' : n!==undefined && n%interval!==0 ? `No attack tonight; attack ${when}` : `Attack 1 player on your own ${when}`, n===1 && settings.firstNightSafe ? 'No attacks tonight' : n!==undefined && n%interval!==0 ? `Wait; attack ${when}` : `Attack 1 player ${when}`);
      add(otherAttackers ? '25% chance to hit if another wolf on your team can attack; otherwise 100%' : 'Your attack chance is 100%');
      if(otherWolves && !context.joinedPack)add('You can also attack other Werewolves');
      if(canInfect && !context.joinedPack)add('If Infecting Wolf picks you, you meet the wolves and keep your role', 'Infecting Wolf picks you: meet wolves; keep your role');
      if(has('charmer'))add(context.hasFriend ? 'You cannot attack your friend' : 'If Friends Maker picks you, you cannot attack your friend', 'Friends Maker picks you: never attack your friend');
      break;
    }
    case 'wolfpup':
      win();add('You cannot attack');
      if(has('werewolf') || has('whitewolf') || (!settings.rabidCanInfect && has('rabidwolf')))add('If you die, the wolves’ vote can hit 2 players next night');
      if(has('hypnowolf'))add('If you die, Hypnotizer Wolf may pick 2 next night if they have a use left');
      if(canInfect)add('If you die, Infecting Wolf may turn 2 next night instead of attacking');
      if(lines.length===2)add('No wolf here can use your death bonus');
      break;
  }
  const wait=settings.roleWaitSeconds?.[role] || 0;
  if(wait>0)add(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn`, `Wait ${wait} ${wait===1?'second':'seconds'} to finish`);
  return fitLines(lines);
}
