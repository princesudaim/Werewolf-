import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const batch=['police','detective','psychic','instigator','celebrity'];
const roster=[...batch,'werewolf','villager'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Police explains its own block, announcement setting and repeat-target limit',()=>{
  for(const notice of [false,true])for(const repeat of [false,true]){
    const text=describe('police',{policeNotifyBlocked:notice,policeRepeatTarget:repeat});
    assert.match(text,/Each night, block 1 player's night ability/);
    assert.match(text,notice?/Everyone sees who you blocked in the morning report/:/Your block is not announced/);
    assert.ok(text.includes(`You ${repeat?'can':'cannot'} pick the same player two nights in a row`));
    assert.doesNotMatch(text,/Hypnotizer|Mayor|Doctor|Wolf Pup|message|revive/);
    assert.equal(text.split('\n').length,4);
  }
});

test('Detective describes the chosen watch target and next-turn names/count report',()=>{
  for(const names of [false,true]){
    const text=describe('detective',{detectiveShowNames:names});
    assert.match(text,/Each night, pick 1 player to watch/);
    assert.match(text,names?/On your next turn, see who visited them/:/On your next turn, see how many players visited them/);
    assert.doesNotMatch(text,/Police|Doctor|Hypnotizer|Celebrity|this turn/);
    assert.equal(text.split('\n').length,3);
  }
});

test('Team Checker only explains relevant result labels, not the Friends Maker ability',()=>{
  for(const showFriends of [false,true]){
    const plain=describe('psychic',{psychicShowFriends:showFriends});
    assert.match(plain,/Each night, pick 1 player to see their team/);assert.doesNotMatch(plain,/Friends|neutral/);
    const friends=describe('psychic',{psychicShowFriends:showFriends},{matchRoles:[...roster,'charmer']});
    assert.match(friends,showFriends?/Friends are shown as the Friends team/:/Friends are shown as neutral/);
    assert.doesNotMatch(friends,/Friends Maker|pick.*friend|private message/);
  }
});

test('Vote Marker follows configured uses and own remaining uses on each night',()=>{
  for(const uses of [1,2,3]){
    const general=describe('instigator',{instigatorMaxUses:uses});
    assert.ok(general.includes(`${uses} ${uses===1?'use':'uses'} per game`));
    assert.match(general,/At night, pick 1 player/);assert.match(general,/next vote with 2 votes against them/);
    for(let left=uses;left>=0;left--){
      const text=turnRoleDescription('instigator',{...defaults,instigatorMaxUses:uses},uses-left+1,0,{matchRoles:roster,voteMarkerUsesLeft:left});
      if(left){assert.ok(text.includes(`${left} ${left===1?'use':'uses'} left`));assert.match(text,/pick 1 player/);}
      else {assert.match(text,/Your marks are used up/);assert.doesNotMatch(text,/pick 1 player|2 votes|uses left/);}
    }
  }
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.ok(source.includes('voteMarkerUsesLeft:Math.max(0,settings.instigatorMaxUses-(instigatorUses[active.id]||0))'));
});

test('Celebrity uses only the win goal and a plain fame sentence, including after fame is spent',()=>{
 for(const count of [1,2,3])for(const left of [undefined,0,1]){
  const text=describe('celebrity',{celebrityAudience:count},{celebrityFameLeft:left});
  assert.equal(text,`You win with the village\n${count===1?'One person knows':`${count} people know`} you because of your fame`);
  assert.doesNotMatch(text,/used up|successful|automatically|pick anyone|blocked|Police|Hypnotizer/i);
 }
 assert.equal(describe('celebrity',{celebrityFameNights:2}),'You win with the village\nOn 2 nights, one person knows you because of your fame');
});

test('all five batch-four cards fit both limits for settings, turns, own friend goal and waits',()=>{
  for(const role of batch)for(const flag of [false,true])for(const uses of [1,3])for(const wait of [0,1,15])for(const left of [undefined,0,1,3]){
    const settings={policeNotifyBlocked:flag,policeRepeatTarget:flag,detectiveShowNames:flag,psychicShowFriends:flag,instigatorMaxUses:uses,celebrityAudience:uses,roleWaitSeconds:{[role]:wait}};
    const text=describe(role,settings,{night:2,hasFriend:flag,voteMarkerUsesLeft:left,matchRoles:[...roster,'charmer']});
    assert.ok(descriptionFits(text),text);
    assert.match(text,flag?/You and your friend win/:/You win with the village/);
    if(wait)assert.match(text,new RegExp(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn$`));
    assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
  }
});
