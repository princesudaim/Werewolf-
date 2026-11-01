import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,roles,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {DESCRIPTION_LIMITS,SMART_DESCRIPTION_ROLES,descriptionFits,smartRoleDescription} from '../src/smart-role-descriptions.ts';
const text=(role,matchRoles,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles,...context});

test('first batch contains exactly five roles; the other thirty retain the existing writer',()=>{
  assert.deepEqual(SMART_DESCRIPTION_ROLES,['werewolf','hypnowolf','rabidwolf','lonewolf','wolfpup']);
  for(const role of Object.keys(roles))if(!SMART_DESCRIPTION_ROLES.includes(role))assert.equal(smartRoleDescription(role,defaults),undefined);
});

test('Werewolf ties explain only the enabled result and do not promise nobody can die from other attacks',()=>{
  const standard=text('werewolf',['werewolf','doctor']);
  assert.match(standard,/If votes tie, no one dies from the Werewolves’ vote/);
  assert.doesNotMatch(standard,/random|Wolf Pup/);
  const random=text('werewolf',['werewolf'],{wolfRandomTies:true});
  assert.match(random,/picks a tied player at random/);
  assert.doesNotMatch(random,/no one dies/);
});

test('absent Wolf Pup is never mentioned; present or dead Pup retains its next-night rule',()=>{
  for(const role of ['werewolf','hypnowolf','rabidwolf']){
    assert.doesNotMatch(text(role,[role,'villager']),/Wolf Pup/);
    assert.match(text(role,[role,'wolfpup','villager']),/Wolf Pup/);
  }
  // The input is a stable dealt roster, not an alive-player list.
  const roster=['werewolf','wolfpup','doctor'];
  assert.equal(text('werewolf',roster,{}, {night:2}),text('werewolf',roster,{}, {night:3}));
  assert.doesNotMatch(text('lonewolf',['lonewolf','wolfpup']),/Wolf Pup/,'Pup does not double Lone Wolf attacks');
});

test('Infecting Wolf only explains Lone Wolf when present, and infection when enabled',()=>{
  assert.doesNotMatch(text('rabidwolf',['rabidwolf','villager']),/Lone Werewolf|Wolf Pup/);
  assert.match(text('rabidwolf',['rabidwolf','lonewolf']),/Lone Werewolf keeps their role/);
  const off=text('rabidwolf',['rabidwolf','lonewolf','wolfpup'],{rabidCanInfect:false});
  assert.match(off,/Infection is off/);assert.doesNotMatch(off,/Lone Werewolf|Wolf Pup|turn up to 2/);
  const later=text('rabidwolf',['rabidwolf','villager'],{}, {night:2});
  assert.doesNotMatch(later,/turn 1|Night 1/);assert.match(later,/vote with Werewolves/);
  const bonus=text('rabidwolf',['rabidwolf','wolfpup'],{}, {night:3,enraged:true});
  assert.match(bonus,/Tonight, turn up to 2/);assert.match(bonus,/Tonight you infect, not attack/);
});

test('Hypnotizer Wolf keeps limits, timing and duration; spent hypnosis never promises another use',()=>{
  const full=text('hypnowolf',['hypnowolf'],{hypnoMaxUses:2,hypnoDuration:3});
  assert.match(full,/2 uses per game/);assert.match(full,/From next night/);assert.match(full,/fails or gives wrong info/);assert.match(full,/lasts 3 nights/);
  const unlimited=text('hypnowolf',['hypnowolf'],{hypnoMaxUses:0,hypnoDuration:0});
  assert.match(unlimited,/each night/);assert.match(unlimited,/until the game ends/);
  const spent=text('hypnowolf',['hypnowolf','wolfpup'],{}, {hypnoUsesLeft:0});
  assert.match(spent,/used up/);assert.doesNotMatch(spent,/Pick|Wolf Pup|pick 2/);
  assert.match(text('hypnowolf',['hypnowolf','wolfpup'],{}, {hypnoUsesLeft:1,enraged:true}),/Tonight, you can hypnotize 2 players with 1 use/);
});

test('Lone Wolf filters absent interactions but keeps attack odds and interval without leaking secret blocks',()=>{
  const simple=text('lonewolf',['lonewolf','werewolf','villager'],{loneWolfInterval:2});
  assert.doesNotMatch(simple,/Infecting Wolf|Friends Maker|Wolf Pup/);
  const solo=text('lonewolf',['lonewolf','villager']);
  assert.match(solo,/attack chance is 100%/);assert.doesNotMatch(solo,/25%|other Werewolves/);
  assert.match(simple,/nights 2, 4, 6/);assert.match(simple,/25% chance/);assert.match(simple,/otherwise 100%/);
  assert.match(text('lonewolf',['lonewolf','rabidwolf']),/Infecting Wolf picks you/);
  assert.doesNotMatch(text('lonewolf',['lonewolf','rabidwolf'],{rabidCanInfect:false}),/Infecting Wolf/);
  assert.match(text('lonewolf',['lonewolf','charmer']),/Friends Maker/);
  const joined=text('lonewolf',['lonewolf','rabidwolf'],{}, {joinedPack:true});
  assert.match(joined,/now know the other Werewolves/);assert.doesNotMatch(joined,/do not know|also attack other Werewolves|Infecting Wolf/);
  const friend=text('lonewolf',['lonewolf','charmer'],{}, {hasFriend:true});
  assert.match(friend,/You and your friend win/);assert.match(friend,/cannot attack your friend/);
});

test('Wolf Pup explains only bonuses usable by the roles in the match',()=>{
  const plain=text('wolfpup',['wolfpup','werewolf']);
  assert.match(plain,/wolves’ vote can hit 2 players next night/);assert.doesNotMatch(plain,/Hypnotizer|Infecting/);
  const hypnotizer=text('wolfpup',['wolfpup','hypnowolf']);
  assert.match(hypnotizer,/If you die, Hypnotizer Wolf/);assert.match(hypnotizer,/use left/);assert.doesNotMatch(hypnotizer,/wolves’ vote|Infecting/);
  const infector=text('wolfpup',['wolfpup','rabidwolf']);
  assert.match(infector,/If you die, Infecting Wolf/);assert.doesNotMatch(infector,/wolves’ vote|Hypnotizer/);
  assert.match(text('wolfpup',['wolfpup','rabidwolf'],{rabidCanInfect:false}),/wolves’ vote/);
  assert.match(text('wolfpup',['wolfpup','lonewolf','strongwolf']),/No wolf here can use your death bonus/);
});

test('automatic whole-line shortening stays within both limits for settings, match combinations and private turns',()=>{
  const optional=['wolfpup','rabidwolf','lonewolf','hypnowolf','charmer','werewolf','whitewolf'];
  let shortened=false;
  for(const role of SMART_DESCRIPTION_ROLES)for(let mask=0;mask<128;mask++)for(const interval of [1,2,3])for(const random of [false,true]){
    const roster=[role,...optional.filter((_,i)=>(mask&(1<<i))!==0)];
    const settings={...defaults,loneWolfInterval:interval,wolfRandomTies:random,hypnoMaxUses:3,hypnoDuration:3,roleWaitSeconds:{[role]:15}};
    for(const context of [{},{night:1},{night:2},{night:3,enraged:true},{night:3,hasFriend:true},{night:3,hypnoUsesLeft:0}]){
      const actual=roleDescription(role,settings,{matchRoles:roster,...context});
      assert.ok(descriptionFits(actual),`${role}: ${actual}`);
      assert.ok(actual.split(/\s+/).length<=DESCRIPTION_LIMITS.words);
      assert.ok(Array.from(actual).length<=DESCRIPTION_LIMITS.characters);
      assert.doesNotMatch(actual,/\.\.\.|…|undefined|NaN/);
      assert.match(actual,/Wait 15 (seconds before ending your turn|seconds to finish)$/);
      if(actual.includes('Infecting Wolf picks you:'))shortened=true;
    }
  }
  assert.equal(shortened,true,'compact wording must actually be exercised');
});

test('private descriptions use public night and own state without changing Strong Wolf logic',()=>{
  assert.match(turnRoleDescription('werewolf',defaults,1,0,{matchRoles:['werewolf']}),/No attacks tonight/);
  assert.match(turnRoleDescription('lonewolf',{...defaults,loneWolfInterval:2},3,0,{matchRoles:['lonewolf']}),/No attack tonight|Wait; attack/);
  assert.match(turnRoleDescription('hypnowolf',defaults,2,0,{matchRoles:['hypnowolf'],hypnoUsesLeft:0}),/used up/);
  assert.equal(turnRoleDescription('strongwolf',defaults,2,0),turnRoleDescription('strongwolf',defaults,2,0,{matchRoles:[]}));
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.match(source,/descriptionRoles\.current=p\.map\(player=>player\.role\)/);
  assert.match(source,/matchRoles:descriptionRoles\.current/);
  assert.doesNotMatch(source,/descriptionRoles\.current=[^;]*filter/);
});
