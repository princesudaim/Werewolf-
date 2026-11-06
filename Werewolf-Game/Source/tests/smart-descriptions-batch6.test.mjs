import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const batch=['strongwolf','whitewolf','serialkiller','raven','thief'];
const roster=[...batch,'werewolf','villager'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Strong Wolf explains odd nights and conditional even-night attacks without exposing hidden allies or blocks',()=>{
  assert.match(describe('strongwolf'),/nights 3, 5, 7/);
  assert.match(describe('strongwolf',{firstNightSafe:false}),/nights 1, 3, 5/);
  assert.match(turnRoleDescription('strongwolf',defaults,1,0),/No attacks tonight/);
  assert.match(turnRoleDescription('strongwolf',defaults,3,0),/Tonight, attack 1 player/);
  const even=turnRoleDescription('strongwolf',defaults,2,0);
  assert.match(even,/Pick 1 player tonight/);assert.match(even,/works only if no other teammate can attack/);
  assert.match(even,/You do not know any other Werewolves/);
  assert.match(turnRoleDescription('strongwolf',defaults,2,1),/You know some other Werewolves/);
  assert.equal(even,turnRoleDescription('strongwolf',defaults,2,0,{matchRoles:['strongwolf','lonewolf','police']}));
  assert.equal(even,turnRoleDescription('strongwolf',defaults,2,0,{matchRoles:['strongwolf','villager']}));
  assert.doesNotMatch(even,/Lone|Police|blocked|cannot attack tonight/);
});

test('White Wolf explains its own independent goal, disguise, legal targets and enabled vote tie rule',()=>{
  for(const betray of [false,true])for(const random of [false,true]){
    const text=describe('whitewolf',{whiteWolfBetrayPack:betray,wolfRandomTies:random});
    assert.match(text,/Be the last player alive to win/);assert.match(text,/You play alone/);
    assert.match(text,/Other wolves think you are on their team/);
    assert.ok(text.includes(`You ${betray?'can':'cannot'} target wolves you know`));
    assert.match(text,random?/picks a tied player at random/:/no one dies from the Werewolves’ vote/);
    assert.doesNotMatch(text,/Wolf Pup/);
    assert.match(describe('whitewolf',{}, {matchRoles:[...roster,'wolfpup']}),/Wolf Pup dies/);
    const friend=describe('whitewolf',{whiteWolfBetrayPack:betray},{hasFriend:true});
    assert.match(friend,/You and your friend win/);assert.match(friend,/You can target wolves you know/);
    assert.match(friend,/You cannot attack your friend/);assert.doesNotMatch(friend,/last player alive|You play alone/);
  }
  const safe=turnRoleDescription('whitewolf',defaults,1,1,{matchRoles:roster});
  assert.match(safe,/No attacks tonight/);assert.doesNotMatch(safe,/vote with wolves to attack/);
});

test('Serial Killer follows the attack interval and only shows an included check disguise',()=>{
  for(const interval of [1,2,3]){
    const settings={...defaults,firstNightSafe:false,serialKillerInterval:interval};
    const general=describe('serialkiller',settings);
    assert.match(general,/Be the last player alive to win/);assert.doesNotMatch(general,/checked|Seer/);
    assert.match(general,interval===1?/each night/:new RegExp(`nights ${interval}, ${2*interval}, ${3*interval}`));
    for(const night of [1,2,3]){
      const text=turnRoleDescription('serialkiller',settings,night,0,{matchRoles:roster});
      assert.equal(text.includes('No attack tonight'),night%interval!==0);
    }
  }
  assert.match(describe('serialkiller',{}, {matchRoles:[...roster,'seer']}),/You look like a Villager when checked/);
  assert.match(describe('serialkiller',{seerShowExactRole:false},{matchRoles:[...roster,'seer']}),/Checks do not show you as a Werewolf/);
  assert.match(turnRoleDescription('serialkiller',defaults,1,0,{matchRoles:roster}),/No attacks tonight/);
});

test('Raven follows known marks and reflection without teaching another role ability',()=>{
  for(const reflect of [false,true])for(const marked of [undefined,0,1,3]){
    const text=describe('raven',{ravenReflectAttackers:reflect},{ravenMarkedCount:marked});
    assert.match(text,/Be the last player alive to win/);
    assert.match(text,reflect?/If a marked player attacks you, they die instead/:/Marked players can still kill you/);
    if(marked===undefined)assert.match(text,/mark 1 player or kill everyone you marked/);
    else if(marked===0){assert.match(text,/Mark 1 player tonight/);assert.doesNotMatch(text,/or kill/);}
    else assert.ok(text.includes(`kill your ${marked} marked ${marked===1?'player':'players'}`));
    assert.doesNotMatch(text,/Police|Hypnotizer|Infecting|Wolf Pup/);
  }
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.ok(source.includes('ravenMarkedCount:(curses.current[active.id]||[]).filter(id=>id!==lovers.current[active.id] && players.some(p=>p.id===id && p.alive)).length'));
});

test('Thief keeps the survival requirement, scheduled attacks and correct team after stealing',()=>{
  for(const interval of [1,2,3]){
    const settings={...defaults,firstNightSafe:false,thiefDeathOnly:false,thiefAttackInterval:interval};
    const text=describe('thief',settings);
    assert.match(text,/Steal a role and win with your new team/);
    assert.match(text,/If your target dies and you survive, take their role/);assert.doesNotMatch(text,/You join their team/);
    for(const night of [1,2,3])assert.equal(turnRoleDescription('thief',settings,night,0,{matchRoles:roster}).includes('No attack tonight'),night%interval!==0);
    const friend=describe('thief',settings,{hasFriend:true});
    assert.match(friend,/You and your friend win/);assert.match(friend,/You stay on the Friends team/);assert.doesNotMatch(friend,/You join their team/);
  }
  assert.match(turnRoleDescription('thief',{...defaults,thiefDeathOnly:false},1,0),/No attacks tonight/);
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.ok(source.includes("lovers.current[active.id]!==undefined ? 'You stole this role. You stay on the Friends team.'"));
});

test('all five batch-six roles fit both limits with waits, settings, own states and Friends goals',()=>{
  for(const role of batch)for(const flag of [false,true])for(const interval of [1,3])for(const wait of [0,15])for(const night of [undefined,1,2,3])for(const marked of [0,3,23]){
    const text=describe(role,{firstNightSafe:flag,whiteWolfBetrayPack:flag,wolfRandomTies:flag,serialKillerInterval:interval,thiefAttackInterval:interval,ravenReflectAttackers:flag,roleWaitSeconds:{[role]:wait}},{night,hasFriend:flag,ravenMarkedCount:marked,knownWolves:0,matchRoles:[...roster,'seer','wolfpup']});
    assert.ok(descriptionFits(text),`${role}: ${text}`);
    if(flag)assert.match(text,/You and your friend win/);
    if(wait)assert.match(text,/Wait 15 (seconds before ending your turn|seconds to finish)$/);
    assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
  }
});
