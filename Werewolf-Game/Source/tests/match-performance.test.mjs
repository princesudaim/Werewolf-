import test from 'node:test';
import assert from 'node:assert/strict';
import {freshPerformance,addPerformance,scoreVote,scoreNight,scorePredictions,scoreInheritance,matchStandings,validatePerformance,choiceValue} from '../src/match-performance.ts';
import {resolveNight} from '../src/werewolf-engine.ts';
const p=(id,role='villager',alive=true)=>({id,name:'Player '+id,role,alive});
const trace=()=>({attacks:[],landed:[],doctorSaved:[],guarded:[],shielded:[],assemblySaved:[]});
const input=(before,extra={})=>({round:1,before,after:before,visits:[],blocked:new Set(),corrupted:[],friends:{},trace:trace(),doctors:{},police:{},revivals:[],infections:[],hypnosis:[],parasites:[],marks:[],mayors:[],stolen:{},...extra});
test('one decision gets one credit despite repeat calls and double-weight Mayor ballots',()=>{
 const log=freshPerformance();for(let i=0;i<3;i++)scoreVote(log,1,p(0),p(1,'werewolf'),{});
 assert.equal(log.events.length,1);assert.equal(matchStandings([p(0),p(1,'werewolf')],[0],log)[0].score,4);
});
test('skips, unjudgeable neutral votes and harmless neutral targets are not mistakes',()=>{
 const log=freshPerformance();scoreVote(log,1,p(0),null,{});scoreVote(log,1,p(0),p(1,'survivor'),{});scoreVote(log,1,p(0,'survivor'),p(1,'jester'),{});assert.deepEqual(log.events,[]);
});
test('village/wolf/Friends/solo goals judge choices by allegiance at action time',()=>{
 assert.equal(choiceValue(p(0),p(1,'werewolf'),{}),'opponent');assert.equal(choiceValue(p(0,'werewolf'),p(1),{}),'opponent');
 assert.equal(choiceValue(p(0,'lonewolf'),p(1,'werewolf'),{}),'ally');
 assert.equal(choiceValue(p(0,'serialkiller'),p(1,'serialkiller'),{}),'opponent');
 assert.equal(choiceValue(p(0),p(1,'werewolf'),{0:1,1:0}),'ally');assert.equal(choiceValue(p(0),p(2),{0:1,1:0}),'opponent');
 const log=freshPerformance();scoreVote(log,1,p(0),p(1,'jester'),{});assert.equal(log.events[0].good,false);
});
test('a dead losing player with better recorded play can be the sole MVP',()=>{
 const log=freshPerformance();addPerformance(log,'save:1',0,'save');addPerformance(log,'save:2',0,'save');
 const rows=matchStandings([p(0,'doctor',false),p(1,'werewolf')],[1],log);
 assert.equal(rows[0].player.id,0);assert.equal(rows.filter(r=>r.mvp).length,1);assert.match(rows[0].reason,/2 saves/);assert.equal(rows[0].score,8);assert.equal(rows[0].deathPenalty,2);
});
test('remaining list follows winning alive, winning dead, losing alive, losing dead tiers',()=>{
 const players=[p(0,'doctor',false),p(1),p(2,'villager',false),p(3),p(4,'werewolf',false),p(5,'werewolf')],log=freshPerformance();addPerformance(log,'save',0,'save');
 assert.deepEqual(matchStandings(players,[0,1,2],log).map(r=>r.player.id),[0,1,2,3,5,4]);
});
test('stable tie breaker selects one MVP without pretending unrecorded choices were correct',()=>{
 const players=[p(0),p(1,'werewolf'),p(2)],rows=matchStandings(players,[2],freshPerformance());
 assert.equal(rows[0].player.id,2);assert.match(rows[0].reason,/No scored decisions/);
 assert.equal(matchStandings(players,[],freshPerformance())[0].player.id,0);
});
test('escapes count as wins without dead styling/tier; survival alone earns no performance points',()=>{
 const a={...p(0,'gambler',false),escaped:true},rows=matchStandings([a,p(1,'survivor')],[0,1],freshPerformance());
 assert.equal(rows.find(r=>r.player.id===0).tier,0);assert.ok(rows.every(r=>r.score===2));
});
test('confirmed attack prevention credits a Doctor, not an unattacked protection',()=>{
 const before=[p(0,'doctor'),p(1),p(2,'werewolf')],t=trace();
 const after=resolveNight(before,[1],[1],false,[],[],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:2,target:1}],trace:t});
 const log=freshPerformance();scoreNight(log,input(before,{after,trace:t,doctors:{0:1}}));
 assert.ok(log.events.some(e=>e.actor===0 && e.kind==='save'));assert.ok(!log.events.some(e=>e.kind==='kill'));
 const idle=freshPerformance();scoreNight(idle,input(before,{doctors:{0:1}}));assert.equal(idle.events.length,0);
});
test('Bodyguard sacrifice can earn save credit while the guard dies',()=>{
 const before=[p(0,'bodyguard'),p(1),p(2,'werewolf')],t=trace();const after=resolveNight(before,[1],[],false,[],[{actor:0,target:1}],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:2,target:1}],trace:t});
 assert.equal(after[0].alive,false);assert.equal(after[1].alive,true);
 const log=freshPerformance();scoreNight(log,input(before,{after,trace:t}));assert.ok(log.events.some(e=>e.actor===0 && e.kind==='save'));
});
test('assembly and used shields earn only actual prevented-attack credit',()=>{
 const before=[p(0,'mayor'),p(1),p(2,'werewolf'),p(3,'survivor')],t=trace();const after=resolveNight(before,[1],[],true,[],[],[],{serials:[{actor:2,target:3}],visitors:[],shields:[3],packVotes:[{actor:2,target:1}],trace:t});
 const log=freshPerformance();scoreNight(log,input(before,{after,trace:t,mayors:[0]}));assert.ok(log.events.some(e=>e.actor===0 && e.kind==='save'));assert.ok(log.events.some(e=>e.actor===3 && e.kind==='shield'));
});
test('blocked/corrupted choices receive neither credit nor blame',()=>{
 for(const extra of [{blocked:new Set([0])},{corrupted:[0]}]){
  const before=[p(0,'seer'),p(1,'werewolf')],log=freshPerformance();scoreNight(log,input(before,{visits:[{actor:0,target:1}],...extra}));assert.equal(log.events.length,0);
 }
});
test('fresh truthful checks credit once per target; Chef gets one comparison not two',()=>{
 const before=[p(0,'seer'),p(1,'werewolf'),p(2,'chef')],log=freshPerformance();
 for(const round of [1,2,3])scoreNight(log,input(before,{round,visits:[{actor:0,target:1},{actor:2,target:0},{actor:2,target:1}]}));
 assert.equal(log.events.filter(e=>e.actor===0).length,1);assert.equal(log.events.filter(e=>e.actor===2).length,1);
});
test('Police credit requires a blocked opponent who actually attempted an action',()=>{
 const before=[p(0,'police'),p(1,'werewolf'),p(2,'seer')];
 for(const target of [1,2]){const log=freshPerformance();scoreNight(log,input(before,{police:{0:target},blocked:new Set([target]),visits:[{actor:target,target:0}]}));assert.equal(log.events[0].good,target===1);}
 const idle=freshPerformance();scoreNight(idle,input(before,{police:{0:1},blocked:new Set([1])}));assert.deepEqual(idle.events,[]);
});
test('successful revivals, conversions, role inheritance and neutral progress are supported',()=>{
 const before=[p(0,'necromancer'),p(1,'villager',false),p(2,'rabidwolf'),p(3),p(4,'mindflayer')],after=before.map(p=>({...p}));after[1].alive=true;after[3].role='werewolf';
 const log=freshPerformance();scoreNight(log,input(before,{after,revivals:[{actor:0,target:1}],infections:[{actor:2,target:3}],parasites:[{actor:4,target:0}],stolen:{3:'seer'}}));
 for(const kind of ['revive','convert','mark','inherit'])assert.ok(log.events.some(e=>e.kind===kind),kind);
});
test('Gambler night/day successes and wrong predictions are idempotent',()=>{
 const log=freshPerformance();scorePredictions(log,1,{}, {0:1});scorePredictions(log,1,{}, {0:1});scorePredictions(log,2,{0:1},{0:1},[0]);
 assert.equal(log.events.length,2);assert.equal(log.events[0].good,true);assert.equal(log.events[1].good,false);
 scoreInheritance(log,2,'vote',{0:'werewolf'});scoreInheritance(log,2,'vote',{0:'werewolf'});assert.equal(log.events.length,3);
});
test('trace identifies actual pack targets, not every losing ballot, and preserves tied-vote behavior',()=>{
 const before=[p(0,'werewolf'),p(1,'werewolf'),p(2),p(3)],t=trace();const after=resolveNight(before,[2,3],[],false,[],[],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:0,target:2},{actor:1,target:3}],trace:t});
 assert.ok(after.every(p=>p.alive));assert.deepEqual(t.attacks,[]);
});
test('ledger validator rejects malformed, duplicate and foreign-player facts',()=>{
 const ids=new Set([0,1]),log=freshPerformance();addPerformance(log,'vote:1:0',0,'vote');assert.equal(validatePerformance(log,ids),true);
 for(const mutate of [l=>l.events.push({...l.events[0]}),l=>l.events[0].actor=99,l=>l.events[0].kind='invented',l=>l.events[0].good='yes',l=>l.events[0].points=99,l=>l.partial=0]){const copy=structuredClone(log);mutate(copy);assert.equal(validatePerformance(copy,ids),false);}
});

test('a protected wolf attack cannot take credit for a separate Sheriff kill or illness death',()=>{
 const before=[p(0,'werewolf'),p(1),p(2,'doctor'),p(3,'sheriff')],t=trace();const after=resolveNight(before,[1],[1],false,[],[],[{actor:3,target:1}],{serials:[],visitors:[],shields:[],packVotes:[{actor:0,target:1}],trace:t});
 const log=freshPerformance();scoreNight(log,input(before,{after,trace:t,doctors:{2:1}}));assert.equal(log.events.filter(e=>e.actor===0 && e.kind==='kill').length,0);
 const illness=freshPerformance();scoreNight(illness,input(before,{after:before.map(p=>p.id===1?{...p,alive:false}:p),trace:t,combatDeaths:[]}));assert.equal(illness.events.filter(e=>e.kind==='kill').length,0);
});
test('wrong decisions are shown honestly instead of being labelled no scored decisions',()=>{
 const log=freshPerformance();scoreVote(log,1,p(0),p(1),{});assert.match(matchStandings([p(0),p(1)],[],log).find(r=>r.player.id===0).reason,/1 mistake/);
});


test('dead winners and losers both lose exactly two final match points, not decision accuracy',()=>{
 const players=[p(0,'doctor',false),p(1,'werewolf',false),p(2)],log=freshPerformance();
 addPerformance(log,'check:0',0,'check');addPerformance(log,'check:1',1,'check');
 const rows=matchStandings(players,[0],log),winner=rows.find(r=>r.player.id===0),loser=rows.find(r=>r.player.id===1);
 assert.equal(winner.score,2);assert.equal(loser.score,0);
 for(const row of [winner,loser]){assert.equal(row.deathPenalty,2);assert.equal(row.good,1);assert.equal(row.bad,0);assert.match(row.reason,/Death −2 pts/);assert.doesNotMatch(row.reason,/mistake/);}
});
test('death penalty can change the sole MVP instead of only changing the displayed number',()=>{
 const log=freshPerformance();addPerformance(log,'check:0',0,'check');addPerformance(log,'check:1',1,'check');
 const players=[p(0,'seer',false),p(1,'seer')],rows=matchStandings(players,[],log);
 assert.equal(rows[0].player.id,1);assert.equal(rows[0].score,2);assert.equal(rows[1].score,0);assert.equal(rows.filter(r=>r.mvp).length,1);
});
test('living, revived and escaped players do not receive the dead-state penalty',()=>{
 const log=freshPerformance(),alive=p(0,'doctor'),revived=p(1,'seer'),escaped={...p(2,'gambler',false),escaped:true};
 const rows=matchStandings([alive,revived,escaped],[0,1,2],log);
 for(const row of rows){assert.equal(row.score,2);assert.equal(row.deathPenalty,0);assert.doesNotMatch(row.reason,/Death −2/);}
});
test('rerender, serialized recovery and partial-history scoring never stack the death penalty',()=>{
 const players=[p(0,'doctor',false),p(1)],log=freshPerformance(true,true);addPerformance(log,'save:0',0,'save');
 const original=JSON.stringify({players,log});const first=matchStandings(players,[0],log);
 assert.equal(first[0].score,5);for(let i=0;i<5;i++)assert.deepEqual(matchStandings(players,[0],log),first);
 const restored=JSON.parse(original);assert.deepEqual(matchStandings(restored.players,[0],restored.log),first);assert.equal(JSON.stringify({players,log}),original);
 assert.ok(validatePerformance(log,new Set([0,1])),'no new ledger event or save schema needed');
});
test('an unrecorded dead loser can have negative points while a dead winner keeps the win bonus',()=>{
 const log=freshPerformance(false,true),rows=matchStandings([p(0,'villager',false),p(1,'werewolf',false)],[1],log);
 assert.equal(rows.find(r=>r.player.id===0).score,-2);assert.equal(rows.find(r=>r.player.id===1).score,0);
 for(const row of rows){assert.match(row.reason,/No scored decisions/);assert.match(row.reason,/Death −2 pts/);}
});
