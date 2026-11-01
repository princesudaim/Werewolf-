import test from 'node:test';
import assert from 'node:assert/strict';
import { balancedDistribution, distributionWolfCount, distributionNeutralCount } from '../src/distribution.ts';
import { roles, isEligibleMadmanRole, deal, selectMadmen } from '../src/werewolf-engine.ts';
import { ROLE_POWER } from '../src/role-power.ts';

const score = counts => Object.entries(counts).reduce((acc,[role,count])=>{
 if(roles[role].team==='wolf')acc.wolf+=count*ROLE_POWER[role];
 if(roles[role].team==='village')acc.village+=count*ROLE_POWER[role];
 return acc;
},{wolf:0,village:0});

test('all player counts get playable lineups with stronger villagers on Easy and stronger wolves on Hard',()=>{
 for(let n=4;n<=24;n++){
  const averages=[];
  for(const mode of ['easy','balanced','hard']){
   const counts=balancedDistribution(n,mode,0,false,{},()=>0.5);
   assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),n);
   assert.equal(Object.entries(counts).filter(([r])=>roles[r].team==='wolf').reduce((a,[,c])=>a+c,0),distributionWolfCount(n));
   const neutralTotal=Object.entries(counts).filter(([r])=>roles[r].team==='neutral').reduce((a,[,c])=>a+c,0);
   assert.equal(neutralTotal,distributionNeutralCount(n));
   const points=score(counts);averages.push({wolf:points.wolf/distributionWolfCount(n),village:points.village/(n-distributionWolfCount(n)-neutralTotal)});
   assert.equal(deal(Array.from({length:n},(_,i)=>`P${i}`),counts).length,n);
  }
  assert.ok(averages[0].village>=averages[1].village && averages[1].village>=averages[2].village,`${n}: ${JSON.stringify(averages)}`);
  assert.ok(averages[0].wolf<=averages[1].wolf && averages[1].wolf<=averages[2].wolf,`${n}: ${JSON.stringify(averages)}`);
  assert.ok(averages[0].village>=8 && averages[2].wolf>=8.5,`${n}: ${JSON.stringify(averages)}`);
 }
 assert.equal(distributionNeutralCount(4),0);assert.equal(distributionNeutralCount(5),1);assert.equal(distributionNeutralCount(12),2);assert.equal(distributionNeutralCount(20),3);
 assert.equal(distributionWolfCount(8),1);assert.equal(distributionWolfCount(9),2);assert.equal(distributionWolfCount(16),2);
});

test('distribution respects zero and relative chances only when requested',()=>{
 const chances=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));chances.werewolf=100;chances.villager=100;chances.muted=1;
 const counts=balancedDistribution(4,'balanced',0,true,chances,()=>0.5);
 for(const [role,count] of Object.entries(counts))if(!chances[role])assert.equal(count,0,role);
 assert.equal(counts.werewolf,1);assert.equal(counts.villager,3);assert.equal(counts.muted,0);
 const inverse={...chances,villager:1,muted:100};
 assert.equal(balancedDistribution(4,'balanced',0,true,inverse,()=>0.5).muted,3);
 const disabled=balancedDistribution(4,'balanced',0,false,Object.fromEntries(Object.keys(roles).map(r=>[r,0])),()=>0.5);
 assert.equal(Object.values(disabled).reduce((a,b)=>a+b,0),4);
 assert.throws(()=>balancedDistribution(4,'balanced',0,true,Object.fromEntries(Object.keys(roles).map(r=>[r,0])),()=>0),/at least one eligible/);
});

test('distribution provides enough eligible roles for configured Madmen or explains failure',()=>{
 const counts=balancedDistribution(8,'balanced',3,false,{},()=>0);
 assert.ok(Object.entries(counts).filter(([r])=>isEligibleMadmanRole(r)).reduce((a,[,c])=>a+c,0)>=3);
 const players=deal(Array.from({length:8},(_,i)=>`P${i}`),counts);assert.equal(selectMadmen(players,3,()=>0).length,3);
 const chances=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));chances.werewolf=100;chances.villager=100;
 assert.throws(()=>balancedDistribution(4,'easy',1,true,chances,()=>0),/eligible village roles for Madmen/);
 assert.throws(()=>balancedDistribution(4,'easy',4),/Not enough village roles/);
 assert.throws(()=>balancedDistribution(3,'easy'));
});

test('Neutral roles follow chances in games of five or more and are never needed for four',()=>{
 const chances=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
 chances.werewolf=100;chances.villager=100;chances.survivor=100;
 for(const mode of ['easy','balanced','hard']){
  const four=balancedDistribution(4,mode,0,true,chances,()=>0);
  assert.equal(four.survivor,0);
  const five=balancedDistribution(5,mode,0,true,chances,()=>0);
  assert.equal(five.survivor,1);
  const twelve=balancedDistribution(12,mode,0,true,chances,()=>0);
  assert.equal(twelve.survivor,2);
  for(const [r,count] of Object.entries(twelve))if(!chances[r])assert.equal(count,0,r);
 }
 chances.survivor=0;
 assert.doesNotThrow(()=>balancedDistribution(4,'balanced',0,true,chances,()=>0));
 assert.throws(()=>balancedDistribution(5,'balanced',0,true,chances,()=>0),/eligible Neutral role/);
});

test('distribution no-repeat mode assigns each role at most once for every player count',()=>{
 for(let n=4;n<=24;n++)for(const mode of ['easy','balanced','hard']){
  const counts=balancedDistribution(n,mode,0,false,{},()=>0.5,true);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),n);
  assert.ok(Object.values(counts).every(count=>count<=1));
 }
 const counts=balancedDistribution(12,'balanced',4,false,{},()=>0.5,true);
 assert.ok(Object.values(counts).every(count=>count<=1));
 assert.ok(Object.entries(counts).filter(([r])=>isEligibleMadmanRole(r)).reduce((sum,[,c])=>sum+c,0)>=4);
});

test('no-repeat distribution fails rather than silently selecting excluded or repeated roles',()=>{
 const chances=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
 chances.werewolf=100;chances.villager=100;chances.survivor=100;
 assert.throws(()=>balancedDistribution(5,'balanced',0,true,chances,()=>0,true),/Not enough different eligible roles/);
 const permitted=balancedDistribution(5,'balanced',0,true,chances,()=>0,false);
 assert.equal(permitted.villager,3);assert.equal(permitted.survivor,1);
});

test('disabled roles are excluded from all automatic distribution modes even when chances are ignored',()=>{
 for(const follow of [false,true])for(const mode of ['easy','balanced','hard']){
  const disabled=['werewolf','doctor','seer','charmer'];
  const counts=balancedDistribution(8,mode,0,follow,{},()=>0.3,false,disabled);
  for(const role of disabled)assert.equal(counts[role],0);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),8);
 }
 const wolves=Object.keys(roles).filter(r=>roles[r].team==='wolf');
 assert.throws(()=>balancedDistribution(4,'balanced',0,false,{},()=>0,false,wolves),/Enable more roles/);
});
