import {roles,type Player,type WinningSide} from './werewolf-engine.ts';

/** Presentation only: use the SAME winning IDs as the result cards/statistics.
 * A neutral's role is not automatically an independent winning team: a bonded
 * Survivor, for example, wins as Friends rather than earning a second label.
 */
export function winningHeadline(players:readonly Player[],side:WinningSide,winnerIds:readonly number[],friends:Record<number,number>={}):string {
  const winners=new Set(winnerIds),groups=new Set<string>();
  for(const player of players){
    if(!winners.has(player.id))continue;
    if(friends[player.id]!==undefined){groups.add('Friends');continue;}
    if(player.escaped){groups.add(roles[player.role].name);continue;}
    if(player.role==='survivor'){groups.add('Survivor');continue;}
    if(side==='village' && roles[player.role].team==='village'){groups.add('Village');continue;}
    if((side==='wolf'||side==='wolf-friends') && roles[player.role].team==='wolf'){groups.add('Werewolves');continue;}
    if((side==='jester' && player.role==='jester')||(side==='mindflayer' && player.role==='mindflayer')){
      groups.add(`${player.name} the ${roles[player.role].name}`);continue;
    }
    groups.add(roles[player.role].name);
  }
  // Faction first, then shared neutral goals; duplicate roles appear once.
  const primary=side==='village'?['Village']:side==='wolf'?['Werewolves']:side==='friends'?['Friends']:side==='wolf-friends'?['Friends','Werewolves']:players.filter(p=>winners.has(p.id)&&p.role===side&&friends[p.id]===undefined&&!p.escaped).map(p=>(side==='jester'||side==='mindflayer')?`${p.name} the ${roles[p.role].name}`:roles[p.role].name);
  const priority=[...new Set([...primary,'Survivor','Gambler'])];
  const labels=[...priority.filter(name=>groups.has(name)),...[...groups].filter(name=>!priority.includes(name))];
  if(!labels.length)return side==='draw'?'NO SURVIVORS':'NO WINNERS';
  const names=labels.length<3?labels.join(' and '):`${labels.slice(0,-1).join(', ')} and ${labels.at(-1)}`;
  const plural=labels.length>1||labels[0]==='Friends'||labels[0]==='Werewolves';
  return `${names} ${plural?'win':'wins'}`.toUpperCase();
}
