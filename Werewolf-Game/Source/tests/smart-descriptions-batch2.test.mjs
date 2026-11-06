import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const roster=['doctor','seer','chef','mayor','journalist','werewolf'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Doctor explains only their protection and both configurable limits',()=>{
  for(const self of [false,true])for(const repeat of [false,true]){
    const text=describe('doctor',{doctorSelfProtect:self,doctorRepeatProtect:repeat});
    assert.match(text,/protect 1 player from Werewolf attacks/);
    assert.ok(text.includes(self?'You can pick yourself':'You cannot protect yourself'));
    assert.ok(text.includes(`You ${repeat?'can':'cannot'} pick the same player two nights in a row`));
    assert.doesNotMatch(text,/Sick Man|Hypnotizer|Police|revive/);
    assert.equal(text.split('\n').length,4);
  }
});

test('Seer follows the reading mode and never teaches another role ability',()=>{
  const exact=describe('seer');assert.match(exact,/see their role/);assert.doesNotMatch(exact,/results can be wrong/);
  const team=describe('seer',{seerShowExactRole:false});assert.match(team,/looks like a Werewolf/);assert.doesNotMatch(team,/see their role/);
  for(const hidden of ['whitewolf','serialkiller','hypnowolf']){
    const text=describe('seer',{}, {matchRoles:[...roster,hidden]});
    assert.match(text,/Some results can be wrong/);
    assert.doesNotMatch(text,/White Werewolf|Serial Killer|Hypnotizer Wolf|hypnotize|kill/);
  }
});

test('Chef omits irrelevant neutral and Friends rules without misreporting optional interpretations',()=>{
  for(const together of [false,true]){
    const settings={chefNeutralsTogether:together};
    const plain=describe('chef',settings);assert.match(plain,/pick 2 players/);assert.match(plain,/same team/);
    assert.doesNotMatch(plain,/Neutral|Friends/);
    assert.doesNotMatch(describe('chef',settings,{matchRoles:[...roster,'jester']}),/Neutral/);
    const neutral=describe('chef',settings,{matchRoles:[...roster,'jester','survivor']});
    assert.match(neutral,together?/Neutral roles count as the same team/:/Neutral roles count as different teams/);
    assert.doesNotMatch(neutral,/Friends|Jester|Survivor/);
    const friends=describe('chef',settings,{matchRoles:[...roster,'charmer','jester']});
    assert.match(friends,/Friends are on the same team only with their own friend/);
    assert.doesNotMatch(friends,/Friends Maker|pick.*friend|private message/);
    // Multiple copies of the same neutral role still need the neutral interpretation.
    assert.match(describe('chef',settings,{matchRoles:[...roster,'survivor','survivor']}),/Neutral roles/);
  }
});

test('Mayor keeps protection, once-only use, public reveal timing and the configured vote value',()=>{
  for(const double of [false,true]){
    const text=describe('mayor',{mayorDoubleVote:double});
    assert.match(text,/Once per game/);assert.match(text,/Village players are safe from Werewolf attacks that night/);
    assert.match(text,/Your role is shown to everyone in the morning/);assert.ok(text.includes(`vote counts ${double?'twice':'once'}`));
    assert.match(text,/cannot call a meeting on the first night/);
    assert.doesNotMatch(text,/private turn|Police|blocked|Hypnotizer|everyone completes/);
    assert.doesNotMatch(describe('mayor',{firstNightSafe:false,mayorDoubleVote:double}),/first night/);
    assert.doesNotMatch(turnRoleDescription('mayor',{...defaults,mayorDoubleVote:double},2,0,{matchRoles:roster}),/first night/);
  }
});

test('News Reporter explains the 10-character headline and only enabled drawing',()=>{
  for(const drawing of [false,true]){
    const text=describe('journalist',{journalistDrawing:drawing});
    assert.match(text,/up to 10 characters/);assert.doesNotMatch(text,/10 words/);
    assert.equal(text.includes('draw a picture'),drawing);assert.match(text,/Everyone sees your news in the morning/);
    assert.doesNotMatch(text,/Police|Hypnotizer|next night|send.*message/);
  }
});

test('all five new descriptions stay within the limits, including wait time and own Friends-team goal',()=>{
  for(const role of ['doctor','seer','chef','mayor','journalist'])for(const flag of [false,true])for(const wait of [0,1,15]){
    const settings={doctorSelfProtect:flag,doctorRepeatProtect:flag,seerShowExactRole:flag,chefNeutralsTogether:flag,mayorDoubleVote:flag,journalistDrawing:flag,firstNightSafe:flag,roleWaitSeconds:{[role]:wait}};
    const text=describe(role,settings,{matchRoles:[...roster,'charmer','jester','whitewolf','serialkiller'],hasFriend:flag});
    assert.ok(descriptionFits(text),text);
    assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
    assert.match(text,flag?/You and your friend win/:/You win with the village/);
    if(wait)assert.match(text,new RegExp(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn$`));
    assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
  }
});
