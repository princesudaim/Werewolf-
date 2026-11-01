import test from 'node:test';
import assert from 'node:assert/strict';
import {roles,defaults,roleDescription,applyInfections,teamOfPlayer,winner,resolveNight,seerReading,canWolfTarget,packIdentity} from '../src/werewolf-engine.ts';
import {rolePower} from '../src/role-power.ts';
const p=(id,role,alive=true)=>({id,name:`Player ${id}`,role,alive});
const all=Object.keys(roles);

test('every role has usable instructions and bounded power across contrasting settings',()=>{
 const variants=[defaults,{...defaults,firstNightSafe:false,rabidCanInfect:false,doctorSelfProtect:false,doctorRepeatProtect:true,seerShowExactRole:false,policeRepeatTarget:true,policeNotifyBlocked:false,hypnoMaxUses:0,hypnoDuration:1,loneWolfInterval:3},{...defaults,firstNightSafe:true,hypnoMaxUses:5,hypnoDuration:5,templarUses:3,necromancerUses:3,survivorShieldCount:5,mindStartingParasites:5,mindRegenPercent:100,roleWaitSeconds:Object.fromEntries(all.map(role=>[role,15]))}];
 for(const role of all)for(const settings of variants){
  const text=roleDescription(role,settings);assert.ok(text.length>20,role);assert.doesNotMatch(text,/undefined|NaN|\./,role);
  assert.ok(Number.isInteger(rolePower(role,settings)) && rolePower(role,settings)>=1 && rolePower(role,settings)<=10,role);
 }
});

test('infection checks every role and never changes an already known wolf',()=>{
 for(const role of all){
  const before=[p(0,'rabidwolf'),p(1,role)];const result=applyInfections(before,[{actor:0,target:1}]);
  if(role==='lonewolf'){assert.equal(result.players[1].role,'lonewolf');assert.equal(result.players[1].joinedPack,true);assert.deepEqual(result.converted,[]);}
  else if(roles[role].team==='wolf'){assert.equal(result.players[1].role,role);assert.deepEqual(result.converted,[]);}
  else {assert.equal(result.players[1].role,'werewolf',role);assert.deepEqual(result.converted,[1],role);}
  assert.equal(before[1].role,role,'input not mutated');
 }
});

test('friendship still determines team and winner after any role is infected',()=>{
 for(const role of all){
  const friends={1:2,2:1};const players=[p(0,'rabidwolf',false),p(1,role),p(2,'charmer',false)];
  const result=applyInfections([p(0,'rabidwolf'),...players.slice(1)],[{actor:0,target:1}]);
  assert.equal(teamOfPlayer(result.players[1],friends),'friends',role);
  assert.equal(winner([players[0],result.players[1],players[2]],friends),'friends',role);
 }
});

test('partners are protected against every direct lethal attack and a raven curse',()=>{
 const friends={0:1,1:0};
 for(const kind of ['lone','strong','serials','thieves','bullets','shots','packVotes','triggeredCurses']){
  const actorRole={lone:'lonewolf',strong:'strongwolf',serials:'serialkiller',thieves:'thief',bullets:'sheriff',shots:'templar',packVotes:'werewolf',triggeredCurses:'raven'}[kind];
  const players=[p(0,actorRole),p(1,'villager')];const base={serials:[],visitors:[],shields:[],lovers:friends};let shots=[],bullets=[];
  if(kind==='shots')shots=[{actor:0,target:1}];else if(kind==='bullets')bullets=[{actor:0,target:1}];else if(kind==='triggeredCurses'){base.curses={0:[1]};base.triggeredCurses=[0];}else base[kind]=[{actor:0,target:1}];
  const after=resolveNight(players,[],[],false,shots,[],bullets,base);assert.ok(after[1].alive,kind);
 }
});

test('normal teammates cannot attack a recruited Lone Wolf but a friend can betray secretly',()=>{
 const ordinary=p(0,'werewolf'), lone={...p(1,'lonewolf'),joinedPack:true};
 assert.equal(canWolfTarget(packIdentity(ordinary),packIdentity(lone)),false);
 assert.equal(canWolfTarget(packIdentity(lone),packIdentity(ordinary)),false);
 assert.equal(canWolfTarget(packIdentity(lone),packIdentity(ordinary),true,true),true);
 assert.equal(seerReading('whitewolf',true),'Werewolf');assert.equal(seerReading('serialkiller',true),'Villager');
});
