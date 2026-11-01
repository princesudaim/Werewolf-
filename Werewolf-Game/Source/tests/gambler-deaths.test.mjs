import test from 'node:test';
import assert from 'node:assert/strict';
import {settleGamblerNightBets, settleGamblerBets, resolveGamblerEscapes, resolveNight, collectGamblerDebts, applyIllness} from '../src/werewolf-engine.ts';

const lineup=()=>[
  {id:0,name:'Gambler',role:'gambler',alive:true},
  {id:1,name:'Target',role:'villager',alive:true},
  {id:2,name:'Wolf',role:'werewolf',alive:true},
  {id:3,name:'Other',role:'villager',alive:true},
];
const bet=[{actor:0,target:1}];
for(const cause of ['pack','sheriff','serialkiller','illness'])test(`Gambler credits a real ${cause} death at dawn`,()=>{
  const before=lineup();
  const after=cause==='illness' ? applyIllness(before.map(p=>p.id===1?{...p,role:'sickman'}:p),{},{1:1}).players
    : resolveNight(before,cause==='pack'?[1]:[],[],false,[],[],cause==='sheriff'?[{actor:3,target:1}]:[],{serials:cause==='serialkiller'?[{actor:3,target:1}]:[],visitors:[],shields:[]});
  const result=settleGamblerNightBets(before,after,bet,{});
  assert.equal(result.correct[0],1);assert.deepEqual(result.pending,[]);assert.deepEqual(result.ready,[]);
});
test('night successes cannot be credited twice or turn into debt after a tied day vote',()=>{
  const before=lineup(),after=before.map(p=>p.id===1?{...p,alive:false}:p);
  const night=settleGamblerNightBets(before,after,bet,{}, {},1);
  assert.deepEqual(night.ready,[0]);
  const day=settleGamblerBets(after,null,night.pending,night.correct,{},1);
  assert.equal(day.correct[0],1);assert.deepEqual(day.indebted,[]);
  assert.deepEqual(settleGamblerNightBets(before,after,night.pending,day.correct).correct,{0:1});
});
test('protected targets remain pending and can still succeed by being voted out that day',()=>{
  const before=lineup(),after=resolveNight(before,[1],[1],false,[]);
  const night=settleGamblerNightBets(before,after,bet,{});
  assert.deepEqual(night.correct,{});assert.deepEqual(night.pending,bet);
  const day=settleGamblerBets(after.map(p=>p.id===1?{...p,alive:false}:p),1,night.pending,night.correct);
  assert.equal(day.correct[0],1);assert.deepEqual(day.indebted,[]);
});
test('a surviving target becomes a wrong bet only after the following vote; Doctor can still pay debt',()=>{
  const players=lineup(),night=settleGamblerNightBets(players,players,bet,{});
  const day=settleGamblerBets(players,null,night.pending,night.correct);
  assert.deepEqual(day.indebted,[0]);
  assert.equal(collectGamblerDebts(players,day.indebted,{}).find(p=>p.id===0).alive,false);
  assert.equal(collectGamblerDebts(players,day.indebted,{3:0}).find(p=>p.id===0).alive,true);
});
test('revival, previous deaths and an escaped target are not new night deaths',()=>{
  const players=lineup();
  assert.deepEqual(settleGamblerNightBets(players,players,bet,{}).correct,{});
  const dead=players.map(p=>p.id===1?{...p,alive:false}:p);
  assert.deepEqual(settleGamblerNightBets(dead,dead,bet,{}).correct,{});
  const escaped=players.map(p=>p.id===1?{...p,alive:false,escaped:true}:p);
  assert.deepEqual(settleGamblerNightBets(players,escaped,bet,{}).correct,{});
});
for(const changed of [{alive:false},{role:'werewolf'}])test(`dead or converted Gamblers cannot collect a night success: ${JSON.stringify(changed)}`,()=>{
  const before=lineup(),after=before.map(p=>p.id===0?{...p,...changed}:p.id===1?{...p,alive:false}:p);
  const result=settleGamblerNightBets(before,after,bet,{}, {},1);
  assert.deepEqual(result.correct,{});assert.deepEqual(result.ready,[]);assert.deepEqual(result.pending,[]);
});
test('a new threshold success must survive the following night, and Friends cannot escape independently',()=>{
  const before=lineup(),after=before.map(p=>p.id===1?{...p,alive:false}:p);
  // The integration calls old escape eligibility before awarding new night successes.
  assert.deepEqual(resolveGamblerEscapes(after,[]).escaped,[]);
  const night=settleGamblerNightBets(before,after,bet,{0:1}, {},2);
  assert.deepEqual(night.ready,[0]);
  assert.deepEqual(resolveGamblerEscapes(after,night.ready).escaped,[0]);
  assert.deepEqual(resolveGamblerEscapes(after.map(p=>p.id===0?{...p,alive:false}:p),night.ready).escaped,[]);
  const friends=settleGamblerNightBets(before,after,bet,{0:1},{0:3,3:0},2);
  assert.equal(friends.correct[0],2);assert.deepEqual(friends.ready,[]);
});
test('multiple Gamblers settle their own bets, leaving only surviving-target wagers pending',()=>{
  const before=[...lineup(),{id:4,name:'Second Gambler',role:'gambler',alive:true}],after=before.map(p=>p.id===1?{...p,alive:false}:p);
  const night=settleGamblerNightBets(before,after,[...bet,{actor:4,target:3}],{}, {},1);
  assert.deepEqual(night.correct,{0:1});assert.deepEqual(night.ready,[0]);assert.deepEqual(night.pending,[{actor:4,target:3}]);
});
