import test from 'node:test';
import assert from 'node:assert/strict';
import {roles,resolveMutes,resolveNight} from '../src/werewolf-engine.ts';
import {freshPerformance,scoreNight} from '../src/match-performance.ts';
const p=(id,role='villager',alive=true,extra={})=>({id,name:'P'+id,role,alive,...extra});
const before=[p(0,'muted'),p(1,'werewolf'),p(2),p(3,'muted')];
test('saved role ID is stable but every role-name surface calls it Muter',()=>{
 assert.equal(roles.muted.name,'Muter');assert.equal(roles.muted.team,'village');assert.match(roles.muted.description,/Each night you can mute someone/);assert.doesNotMatch(roles.muted.description,/You cannot talk|You can speak normally|morning report names|Silence ends at the next night|choose another living player to silence/);
});
test('Muter can silence a wolf, villager or another Muter; input players are not changed',()=>{
 for(const target of [1,2,3]){const snapshot=structuredClone(before);assert.deepEqual(resolveMutes(before,before,[{actor:0,target}]),[{actor:0,target}]);assert.deepEqual(before,snapshot);}
 assert.deepEqual(resolveMutes(before,before,[]),[]);
});
test('Police and corruption cancel silence regardless of submission order',()=>{
 const attempts=[{actor:0,target:1},{actor:3,target:2}];
 assert.deepEqual(resolveMutes(before,before,attempts,new Set([0])),[{actor:3,target:2}]);assert.deepEqual(resolveMutes(before,before,attempts,new Set(),[3]),[{actor:0,target:1}]);
});
test('reject self, unknown, dead, escaped and non-Muter actors/targets',()=>{
 for(const attempt of [{actor:0,target:0},{actor:99,target:1},{actor:0,target:99},{actor:2,target:1}])assert.deepEqual(resolveMutes(before,before,[attempt]),[]);
 for(const id of [0,1])for(const extra of [{alive:false},{escaped:true}]){
  const roster=before.map(p=>p.id===id?{...p,...extra}:p);assert.deepEqual(resolveMutes(roster,roster,[{actor:0,target:1}]),[]);
 }
});
test('a target killed or escaped by morning is not announced as muted',()=>{
 for(const extra of [{alive:false},{alive:false,escaped:true}])assert.deepEqual(resolveMutes(before,before.map(p=>p.id===1?{...p,...extra}:p),[{actor:0,target:1}]),[]);
});
test('a submitted silence still works if its Muter dies or changes role that night',()=>{
 const after=before.map(p=>p.id===0?{...p,alive:false,role:'werewolf'}:p);assert.deepEqual(resolveMutes(before,after,[{actor:0,target:1}]),[{actor:0,target:1}]);
});
test('one target per Muter, two Muters may choose the same target, repeats next night are allowed',()=>{
 const attempts=[{actor:0,target:1},{actor:0,target:2},{actor:3,target:1}];const effective=resolveMutes(before,before,attempts);assert.deepEqual(effective,[{actor:0,target:1},{actor:3,target:1}]);assert.deepEqual([...new Set(effective.map(a=>a.target))],[1]);assert.deepEqual(resolveMutes(before,before,[{actor:0,target:1}]),[{actor:0,target:1}]);
});
test('speech silence is nonlethal and never removes night actions or voting eligibility',()=>{
 const actions=[{actor:0,target:1}];const after=resolveNight(before,[],[],false,[],[],[]);resolveMutes(before,after,actions);assert.deepEqual(after,before);assert.equal(after.filter(p=>p.alive).length,4);
});
test('MVP scores effective opponent silences once; ally silence is a mistake and cancelled attempts earn nothing',()=>{
 const base={round:1,before,after:before,visits:[],blocked:new Set(),corrupted:[],friends:{},trace:{attacks:[],landed:[],doctorSaved:[],guarded:[],shielded:[],assemblySaved:[]},doctors:{},police:{},revivals:[],infections:[],hypnosis:[],parasites:[],marks:[],mayors:[],stolen:{}};
 const log=freshPerformance();for(let i=0;i<2;i++)scoreNight(log,{...base,mutes:[{actor:0,target:1}]});assert.equal(log.events.length,1);assert.equal(log.events[0].kind,'mute');assert.equal(log.events[0].good,true);
 scoreNight(log,{...base,mutes:[{actor:3,target:2}]});assert.equal(log.events[1].good,false);
 const blocked=freshPerformance();scoreNight(blocked,{...base,blocked:new Set([0]),mutes:[{actor:0,target:1}]});assert.deepEqual(blocked.events,[]);
});
