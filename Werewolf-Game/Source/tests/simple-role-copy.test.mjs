import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';

const current=(role,settings,context)=>turnRoleDescription(role,settings,context.night,0,context);
const celebrity='You win with the village\nOne person knows you because of your fame';
test('Celebrity default is exactly the requested two simple lines',()=>{
 assert.equal(roleDescription('celebrity',defaults),celebrity);
 for(const night of [1,2,5])for(const celebrityFameLeft of [0,1]){
  assert.equal(current('celebrity',defaults,{night,celebrityFameLeft,matchRoles:['celebrity','werewolf','villager']}),celebrity);
 }
});
test('Celebrity keeps only necessary audience and two-night or legacy wording',()=>{
 for(const audience of [1,2,3])for(const fame of [1,2,null]){
  const text=roleDescription('celebrity',{...defaults,celebrityAudience:audience,celebrityFameNights:fame});
  assert.equal(text.split('\n').length,2);
  assert.match(text,/because of your fame/);
  assert.match(text,audience===1?/person knows/:new RegExp(`${audience} people know`));
  assert.equal(text.includes('On 2 nights'),fame===2);
  assert.equal(text.includes('Each night'),fame===null);
  assert.doesNotMatch(text,/successful|used up|Blocked|pick anyone|automatically/);
 }
});
test('Thief death-only descriptions need just the goal, non-attacking choice and inheritance rule',()=>{
 for(const mode of ['persistent','replace','cycle']){
  const text=roleDescription('thief',{...defaults,thiefTargetMode:mode});
  assert.equal(text.split('\n').length,3);
  assert.match(text,/Steal a role and win with your new team/);
  assert.match(text,/without attacking them/);
  assert.match(text,/voted out.*you survive, take their role/);
  assert.doesNotMatch(text,/You join their team|Your choice lasts|You can change your target/);
  if(mode==='persistent')assert.match(text,/watch until they die/);
  if(mode==='replace')assert.match(text,/Each night, choose/);
  if(mode==='cycle')assert.match(text,/die tonight or are voted out tomorrow/);
 }
});
test('Thief keeps legacy attacks and the Friends exception without repeating the new-team goal',()=>{
 const legacy=roleDescription('thief',{...defaults,thiefDeathOnly:false});
 assert.match(legacy,/Attack 1 player each night/);
 assert.match(legacy,/take their role/);
 assert.doesNotMatch(legacy,/without attacking|You join their team/);
 const friend=current('thief',defaults,{night:1,hasFriend:true,matchRoles:['thief','charmer','werewolf']});
 assert.match(friend,/You and your friend win/);
 assert.match(friend,/stay on the Friends team/);
 assert.doesNotMatch(friend,/win with your new team/);
});
test('Lone Wolf omits attack odds and targets on nights when it cannot attack',()=>{
 for(const [night,firstNightSafe] of [[1,true],[1,false],[3,false]]){
  const text=current('lonewolf',{...defaults,firstNightSafe,loneWolfInterval:2},{night,matchRoles:['lonewolf','werewolf','villager']});
  assert.doesNotMatch(text,/25%|100%|also attack/);
  assert.match(text,/No attacks? tonight/);
 }
 const active=current('lonewolf',{...defaults,loneWolfInterval:2},{night:2,matchRoles:['lonewolf','werewolf','villager']});
 assert.match(active,/25%.*100% if not/);
 assert.match(active,/also attack other Werewolves/);
});
