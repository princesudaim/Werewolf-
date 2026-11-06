import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,roles,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const batch=['charmer','gambler','mindflayer','intelligence','madman'];
const roster=[...batch,'werewolf','villager'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Friends Maker follows first-choice night, existing partner and per-night messaging state',()=>{
  assert.match(describe('charmer',{charmerFirstNight:3}),/From night 3, choose your 1 friend/);
  const early=describe('charmer',{charmerFirstNight:3,charmerMessages:true},{night:2});
  assert.match(early,/Wait until night 3/);assert.doesNotMatch(early,/Send 1|Messages arrive/);
  const choose=describe('charmer',{charmerFirstNight:3,charmerMessages:true},{night:3,friendCanChoose:true});
  assert.match(choose,/Choose your 1 friend/);assert.match(choose,/Send 1 message per night; your friend can reply once/);assert.match(choose,/Messages arrive next night/);
  assert.match(choose,/Only 1 of you needs to be alive/);
  const unavailable=describe('charmer',{charmerMessages:true},{night:3,friendCanChoose:false});
  assert.match(unavailable,/No player is available/);assert.doesNotMatch(unavailable,/Send 1|Messages arrive/);
  const paired=describe('charmer',{charmerMessages:true},{night:3,hasFriend:true,friendAlive:true,friendCanSend:true});
  assert.match(paired,/already have your friend/);assert.doesNotMatch(paired,/Choose your 1 friend/);
  const reply=describe('charmer',{charmerMessages:true},{hasFriend:true,friendCanSend:false});
  assert.match(reply,/reply once when a message arrives/);assert.doesNotMatch(reply,/Send 1 message/);
  const sent=describe('charmer',{charmerMessages:true},{hasFriend:true,friendMessageSent:true});
  assert.match(sent,/already sent your message or reply tonight/);assert.doesNotMatch(sent,/Send 1 message/);
  const dead=describe('charmer',{charmerMessages:true},{hasFriend:true,friendAlive:false});
  assert.match(dead,/your friend has died/);assert.doesNotMatch(dead,/Send 1|Messages arrive/);
  assert.match(describe('charmer',{charmerMessages:false}),/Private messages are off/);
  assert.doesNotMatch(paired,/Werewolf|Police|attack/);
});

test('Gambler keeps night-death and next-day credit, configured target, protection and relevant rescue caveats',()=>{
  for(const protection of [false,true]){
    const text=describe('gambler',{gamblerPredictions:3,gamblerBetProtection:protection});
    assert.match(text,/Get 3 correct guesses, then survive the next night/);
    assert.match(text,/die tonight or are voted out tomorrow/);
    assert.match(text,protection?/A bet saves you from attacks/:/A bet does not save you from attacks/);
    assert.match(text,/Wrong guess: you die the next night/);
    assert.doesNotMatch(text,/Doctor|revived|Necromancer/);
  }
  const full=describe('gambler',{}, {matchRoles:[...roster,'doctor','necromancer']});
  assert.match(full,/Night deaths count only if not revived/);assert.match(full,/A Doctor can save you/);
  const progress=describe('gambler',{gamblerPredictions:3},{gamblerCorrect:2});
  assert.match(progress,/Get 1 more correct guess/);
  const debt=describe('gambler',{}, {gamblerDebt:true,matchRoles:[...roster,'doctor']});
  assert.match(debt,/Wrong guess: you die tonight/);assert.match(debt,/Doctor can save you/);
});

test('Gambler ready card promises this morning only without Friends and keeps an existing debt warning',()=>{
  const ready=describe('gambler',{}, {gamblerCorrect:2,gamblerReady:true});
  assert.match(ready,/Survive tonight to win and leave in the morning/);assert.match(ready,/still bet on 1 living player/);
  assert.doesNotMatch(ready,/next night|more correct|Wrong guess/);
  assert.match(describe('gambler',{}, {gamblerReady:true,gamblerDebt:true}),/Wrong guess: you die tonight/);
  const friend=describe('gambler',{}, {hasFriend:true,gamblerReady:true});
  assert.match(friend,/Your Friends team wins when everyone else is gone/);
  assert.doesNotMatch(friend,/win and leave|Get \d|in the morning/);assert.match(friend,/Wrong guess/);
  const source=readFileSync('src/Werewolf.tsx','utf8');
  for(const id of ['player','active'])assert.ok(source.includes(`gamblerReady.includes(${id}.id) && lovers.current[${id}.id]===undefined`));
  assert.doesNotMatch(source,/People you owe money to are coming tonight/);
});

test('Mind Flayer uses own remaining creatures and exact configured regeneration, without a Friends solo win',()=>{
  assert.match(describe('mindflayer',{mindStartingParasites:7}),/Start with 7 tiny creatures/);
  for(const stock of [0,1,4])for(const regen of [0,20,100]){
    const text=describe('mindflayer',{mindRegenPercent:regen},{tinyCreaturesLeft:stock});
    assert.ok(text.includes(`${stock} tiny ${stock===1?'creature':'creatures'} left`));
    assert.equal(text.includes('put 1 on a player'),stock>0);
    assert.match(text,regen===0?/Skipping gives no new creatures/:regen===100?/Skip to get 1 more/:/20% chance to get 1 more/);
  }
  const friend=describe('mindflayer',{}, {hasFriend:true,tinyCreaturesLeft:0});
  assert.match(friend,/You and your friend win/);assert.match(friend,/will not give you a solo win/);
  assert.doesNotMatch(friend,/every other living player to win/);
});

test('Intelligence Chief follows each configured report night without suggesting a player action',()=>{
  for(const interval of [1,2,3])for(const night of [1,2,3,4,6]){
    const text=turnRoleDescription('intelligence',{...defaults,intelligenceInterval:interval},night,0,{matchRoles:roster});
    assert.equal(text.includes('No report tonight'),night%interval!==0);
    if(night%interval===0){assert.match(text,/Get names tonight/);assert.match(text,/One may be a Werewolf or solo player/);assert.match(text,/report can be wrong/);}
    else assert.ok(text.includes(`Reports come on nights ${interval}, ${interval*2}, ${interval*3}`));
    assert.doesNotMatch(text,/pick|choose|target|Police|Hypnotizer/i);
  }
  assert.match(describe('intelligence',{intelligenceInterval:1}),/Get names each night/);
  assert.match(describe('intelligence',{}, {hasFriend:true}),/You and your friend win/);
});

test('Madman reference is honest, while real private descriptions continue to use the apparent village role',()=>{
  const reference=describe('madman', {roleWaitSeconds:{madman:15}});
  assert.match(reference,/You win with the village/);assert.match(reference,/different village role/);
  assert.match(reference,/fails or gives wrong info/);assert.match(reference,/when the game ends/);assert.doesNotMatch(reference,/Wait 15/);
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.match(source,/turnRoleDescription\(active\.role,/);
  assert.doesNotMatch(source,/turnRoleDescription\([^,]*madman/i);
  for(const role of ['villager','police','doctor','intelligence'])assert.doesNotMatch(turnRoleDescription(role,defaults,1,0,{matchRoles:['madman','werewolf','villager']}),/Madman|disguise|wrong info/);
});

test('all final-five descriptions retain complete ideas within both budgets across settings and own states',()=>{
  let checked=0;
  for(const role of batch)for(const flag of [false,true])for(const night of [undefined,1,2,3])for(const count of [0,1,23])for(const regen of [0,20,100])for(const wait of [0,15]){
    const text=describe(role,{charmerFirstNight:3,charmerMessages:flag,gamblerPredictions:3,gamblerBetProtection:flag,mindStartingParasites:23,mindRegenPercent:regen,intelligenceInterval:3,roleWaitSeconds:{[role]:wait}},{night,hasFriend:flag,friendAlive:count!==0,friendMessageSent:count===1,friendCanChoose:count>0,friendCanSend:count>0,gamblerCorrect:count,gamblerReady:count>1,gamblerDebt:count===1,tinyCreaturesLeft:count,matchRoles:Object.keys(roles)});
    assert.ok(descriptionFits(text),`${role}: ${text}`);assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
    if(wait && role!=='madman')assert.match(text,/Wait 15 (seconds before ending your turn|seconds to finish)$/);
    checked++;
  }
  assert.equal(checked,720);
});
