import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,roleDescription,turnRoleDescription,applyIllness} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const batch=['villager','muted','sickman','survivor','jester'];
const roster=[...batch,'werewolf'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Villager has only their goal, no-night-action instruction and daytime task',()=>{
  assert.equal(describe('villager'),'You win with the village\nYou have no action at night\nTalk with everyone and vote out the Werewolves');
  const friend=describe('villager',{}, {hasFriend:true});
  assert.match(friend,/You and your friend win/);assert.match(friend,/vote out your enemies/);assert.doesNotMatch(friend,/vote out the Werewolves/);
});

test('Muter uses the approved short description without the removed explanation lines',()=>{
  const text=describe('muted');
  assert.equal(text,'You win with the village\nEach night you can mute someone\nThey can still vote and use their night ability\nYou may skip; repeats on later nights are allowed');
  assert.match(text,/They can still vote and use their night ability/);assert.doesNotMatch(text,/You can speak normally|morning report names the muted player|Silence ends at the next night/);
  assert.doesNotMatch(text,/You cannot talk|hand signs|no action at night/);
});

test('Sick Man filters absent Doctor help and follows starting nights and bonus settings',()=>{
  for(const start of [1,3,8])for(const bonus of [0,1,5]){
    const settings={sickStartingNights:start,sickDoctorBonus:bonus};
    const plain=describe('sickman',settings);assert.ok(plain.includes(`You die after ${start} ${start===1?'night':'nights'} without help`));
    assert.doesNotMatch(plain,/Doctor/);
    const doctor=describe('sickman',settings,{matchRoles:[...roster,'doctor']});
    if(bonus)assert.ok(doctor.includes(`A Doctor visit gives you ${bonus} more ${bonus===1?'night':'nights'}`));
    else assert.match(doctor,/Doctor visits do not give you more nights/);
    assert.match(doctor,/You have no action at night/);
    assert.doesNotMatch(doctor,/protect.*player|Doctor.*ability|Hypnotizer|Police/);
  }
});

test('Sick Man private countdown uses actual remaining nights, including extended life and the final night',()=>{
  const player={id:0,name:'Sick',role:'sickman',alive:true};
  let life={0:3};
  for(let night=1;night<=3;night++){
    const text=turnRoleDescription('sickman',defaults,night,0,{matchRoles:roster,sickNightsLeft:life[0]});
    if(life[0]===1)assert.match(text,/Without help, you die tonight/);
    else assert.ok(text.includes(`You have ${life[0]} nights left without help`));
    life=applyIllness([player],{},life).remaining;
  }
  const extended=applyIllness([player],{1:0},{0:3},[],3,2).remaining[0];
  assert.equal(extended,4);
  assert.match(describe('sickman',{}, {matchRoles:[...roster,'doctor'],sickNightsLeft:extended}),/You have 4 nights left/);
});

test('Survivor shows shields remaining, one-night use and only the relevant safety restriction',()=>{
  for(const count of [1,3,5]){
    const general=describe('survivor',{survivorShieldCount:count});
    assert.ok(general.includes(`${count} ${count===1?'shield':'shields'} per game`));
    assert.match(general,/Stay alive until the game ends to win/);
    assert.match(general,/Use 1 shield to block attacks for 1 night/);
    for(const left of [count,1,0]){
      for(const night of [1,2]){
        const text=turnRoleDescription('survivor',{...defaults,survivorShieldCount:count},night,0,{matchRoles:roster,shieldsLeft:left});
        if(!left){assert.match(text,/No shields left/);assert.doesNotMatch(text,/Use 1 shield|per game/);}
        else{assert.ok(text.includes(`${left} ${left===1?'shield':'shields'} left`));assert.equal(text.includes('you cannot use one tonight'),night===1);}
        if(night===1)assert.doesNotMatch(text,/Use 1 shield/);
        if(night===2)assert.doesNotMatch(text,/first night|cannot use one tonight/);
      }
    }
    assert.doesNotMatch(describe('survivor',{firstNightSafe:false,survivorShieldCount:count}),/first night/);
  }
});

test('Jester describes the vote-out win, but never promises it to a Friends-team Jester',()=>{
  const normal=describe('jester');
  assert.match(normal,/Get the other players to vote you out/);assert.match(normal,/you win and the game ends/);
  assert.match(normal,/no action at night/);
  const friend=describe('jester',{}, {hasFriend:true});
  assert.match(friend,/You and your friend win/);assert.match(friend,/Being voted out will not win the game for you/);
  assert.doesNotMatch(friend,/Get the other players|you win and the game ends|Friends Maker/);
  assert.match(describe('survivor',{}, {hasFriend:true}),/You and your friend win/);
  assert.doesNotMatch(describe('survivor',{}, {hasFriend:true}),/Stay alive until the game ends to win/);
});

test('batch-five lengths, own-team goals, waits and live-state wiring are correct',()=>{
  for(const role of batch)for(const friend of [false,true])for(const wait of [0,1,15])for(const left of [0,1,8]){
    const text=describe(role,{sickStartingNights:8,sickDoctorBonus:5,survivorShieldCount:5,roleWaitSeconds:{[role]:wait}},{night:2,hasFriend:friend,sickNightsLeft:left,shieldsLeft:left,matchRoles:[...roster,'doctor','charmer']});
    assert.ok(descriptionFits(text),text);
    if(friend)assert.match(text,/You and your friend win/);
    if(wait)assert.match(text,new RegExp(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn$`));
    assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
  }
  const source=readFileSync('src/Werewolf.tsx','utf8');
  assert.ok(source.includes('sickNightsLeft:sickLife[active.id] ?? settings.sickStartingNights'));
  assert.ok(source.includes('shieldsLeft:Math.max(0,settings.survivorShieldCount-(shieldUses[active.id]||0))'));
});
