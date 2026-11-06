import test from 'node:test';
import assert from 'node:assert/strict';
import {deal, resolveRandomRoles, randomLineup, tally, winner, shuffle, resolveNight, voteWinner, visitorsTo, applyIllness, applyInfections, settleGamblerBets, resolveGamblerEscapes, collectGamblerDebts, mindFlayerWinner, regenerateParasite, intelligenceReport, applyThefts, canDetain, resolveDetentions, applyHypnosis, canChefAct, celebrityReveals, teamOfPlayer, sameTeamForChef, isEligibleMadmanRole, selectMadmen, roles, appearsWerewolf, knownPackmate, canWolfTarget, tallyPack} from '../src/werewolf-engine.ts';
const players = [
 {id:0,name:'Wolf',role:'werewolf',alive:true},
 {id:1,name:'A',role:'villager',alive:true},
 {id:2,name:'B',role:'doctor',alive:true},
];
test('tally handles skips and ties without executing',()=>{
 assert.equal(tally([]),null); assert.equal(tally([1,1,2]),1); assert.equal(tally([1,1,null,null]),null); assert.equal(tally([null,null,1]),null);
});
test('village wins at zero wolves, wolves at parity',()=>{
 assert.equal(winner(players),null);
 assert.equal(winner(players.map(p=>p.id===0?{...p,alive:false}:p)),'village');
 assert.equal(winner(players.map(p=>p.id===1?{...p,alive:false}:p)),'wolf');
});
test('deal respects counts and rejects invalid games',()=>{
 const counts={madman:0,werewolf:1,villager:1,doctor:1,seer:1,chef:0,mayor:0,templar:0,muted:0,jester:0,necromancer:0,bodyguard:0,sheriff:0,serialkiller:0,survivor:0,visitor:0,psychic:0,celebrity:0,detective:0,instigator:0,strongwolf:0,sickman:0,lonewolf:0,wolfpup:0,journalist:0,raven:0,rabidwolf:0,whitewolf:0,gambler:0,mindflayer:0,intelligence:0,thief:0,police:0,hypnowolf:0,charmer:0};
 const p=deal(['A','B','C','D'],counts);
 assert.deepEqual(p.map(x=>x.role).sort(), ['doctor','seer','villager','werewolf']);
 assert.throws(()=>deal(['A','B','C'],counts));
 assert.throws(()=>deal(['A','B','C','D'],{...counts,werewolf:2,villager:0}));
});
test('shuffle preserves elements',()=>assert.deepEqual(shuffle([1,2,3],()=>0).sort(),[1,2,3]));

test('mayor protection stops wolf attack but not holy water',()=>{
 const p=[...players,{id:3,name:'Templar',role:'templar',alive:true}];
 assert.equal(resolveNight(p,[1],[],true,[])[1].alive,true);
 assert.equal(resolveNight(p,[1],[],false,[])[1].alive,false);
 const wolfShot=resolveNight(p,[],[],false,[{actor:3,target:0}]);
 assert.equal(wolfShot[0].alive,false); assert.equal(wolfShot[3].alive,true);
 const wrongShot=resolveNight(p,[],[],false,[{actor:3,target:1}]);
 assert.equal(wrongShot[1].alive,true); assert.equal(wrongShot[3].alive,false);
});

test('jester wins only when executed by the vote',()=>{
 const p=[...players,{id:3,name:'Jester',role:'jester',alive:true}];
 assert.equal(voteWinner(p,3),'jester');
 assert.notEqual(voteWinner(p,null),'jester');
 assert.notEqual(winner(p.map(x=>x.id===3?{...x,alive:false}:x)),'jester');
});
test('invalid role counts are rejected',()=>{
 assert.throws(()=>deal(['A','B','C','D'],{werewolf:1,villager:1,doctor:1,seer:1,chef:0,mayor:0,templar:0,muted:0,jester:0,necromancer:-1,bodyguard:0,sheriff:0,serialkiller:0,survivor:0,visitor:0,psychic:0,celebrity:0,detective:0,instigator:0,strongwolf:0,sickman:0,lonewolf:0,wolfpup:0,journalist:0,raven:0,rabidwolf:0,whitewolf:0,gambler:0,mindflayer:0,intelligence:0,thief:0,police:0,hypnowolf:0,charmer:0}));
});

test('bodyguard takes a lethal attack for their target; sheriff hits selected target',()=>{
 const p=[...players,{id:3,name:'Guard',role:'bodyguard',alive:true},{id:4,name:'Sheriff',role:'sheriff',alive:true}];
 const guarded=resolveNight(p,[1],[],false,[],[{actor:3,target:1}],[]);
 assert.equal(guarded[1].alive,true); assert.equal(guarded[3].alive,false);
 const shot=resolveNight(p,[],[],false,[],[],[{actor:4,target:0}]);
 assert.equal(shot[0].alive,false); assert.equal(shot[4].alive,true);
 const shielded=resolveNight(p,[1],[1],false,[],[{actor:3,target:1}],[]);
 assert.equal(shielded[1].alive,true); assert.equal(shielded[3].alive,true);
});

test('bodyguard cannot protect a non-village player, without exposing targets at selection',()=>{
 const p=[...players,{id:3,name:'Guard',role:'bodyguard',alive:true},{id:4,name:'Sheriff',role:'sheriff',alive:true}];
 const shot=resolveNight(p,[],[],false,[],[{actor:3,target:0}],[{actor:4,target:0}]);
 assert.equal(shot[0].alive,false); assert.equal(shot[3].alive,true);
});

test('serial killer and survivor win rules',()=>{
 const killer={id:3,name:'Killer',role:'serialkiller',alive:true};
 assert.equal(winner([killer]),'serialkiller');
 assert.equal(winner([killer,players[1]]),null);
 assert.equal(winner([killer,players[0]]),null);
});
test('visitor dies on dangerous visits; survivor shield blocks a hit',()=>{
 const p=[...players,{id:3,name:'Visitor',role:'visitor',alive:true},{id:4,name:'Survivor',role:'survivor',alive:true}];
 const attacked=resolveNight(p,[1],[],false,[],[],[],{serials:[],visitors:[{actor:3,target:1}],shields:[]});
 assert.equal(attacked[3].alive,false);
 const wolves=resolveNight(p,[],[],false,[],[],[],{serials:[],visitors:[{actor:3,target:0}],shields:[]});
 assert.equal(wolves[3].alive,false);
 const shielded=resolveNight(p,[4],[],false,[],[],[],{serials:[],visitors:[],shields:[4]});
 assert.equal(shielded[4].alive,true);
});

test('detective visitor list deduplicates actors and isolates the selected target',()=>{
 assert.deepEqual(visitorsTo([{actor:1,target:3},{actor:1,target:3},{actor:2,target:3},{actor:4,target:2}],3),[1,2]);
 assert.deepEqual(visitorsTo([],3),[]);
});

test('strong wolf counts for its team and attacks independently of pack vote',()=>{
 const p=[...players,{id:3,name:'Strong',role:'strongwolf',alive:true}];
 assert.equal(winner(p),'wolf');
 const extra={serials:[],visitors:[],shields:[],strong:[{actor:3,target:1}]};
 assert.equal(resolveNight(p,[],[],false,[],[],[],extra)[1].alive,false);
 assert.equal(resolveNight(p,[],[1],false,[],[],[],extra)[1].alive,true);
 const holy=resolveNight(p,[],[],false,[{actor:2,target:3}]);
 assert.equal(holy[3].alive,false); assert.equal(holy[2].alive,true);
});

test('sick man dies after three nights and doctor visits add two nights',()=>{
 let p=[{id:0,name:'Sick',role:'sickman',alive:true}], life={0:3};
 for(let i=0;i<2;i++){const next=applyIllness(p,{},life);p=next.players;life=next.remaining;}
 assert.equal(p[0].alive,true); assert.equal(life[0],1);
 const treated=applyIllness(p,{9:0},life); assert.equal(treated.players[0].alive,true); assert.equal(treated.remaining[0],2);
 assert.equal(applyIllness(p,{},life).players[0].alive,false);
});

test('lone wolf stays hidden from pack and can attack a pack member before their vote',()=>{
 assert.equal(knownPackmate('werewolf','lonewolf'),false);
 assert.equal(knownPackmate('lonewolf','werewolf'),false);
 assert.equal(knownPackmate('werewolf','strongwolf'),true);
 const p=[...players,{id:3,name:'Lone',role:'lonewolf',alive:true}];
 const extra={serials:[],visitors:[],shields:[],lone:[{actor:3,target:0}],packVotes:[{actor:0,target:1}]};
 const hit=resolveNight(p,[1],[],false,[],[],[],extra);
 assert.equal(hit[0].alive,false); assert.equal(hit[1].alive,true);
 const protectedWolf=resolveNight(p,[1],[0],false,[],[],[],extra);
 assert.equal(protectedWolf[0].alive,true); assert.equal(protectedWolf[1].alive,false);
});

test('enraged pack can attack two targets and protects tied cutoffs',()=>{
 assert.deepEqual(tallyPack([1,1,2,2],2).sort(),[1,2]);
 assert.deepEqual(tallyPack([1,2,3],2),[]);
 assert.deepEqual(tallyPack([1,1,2,3],2),[1]);
 const p=[...players,{id:3,name:'Pup',role:'wolfpup',alive:true},{id:4,name:'C',role:'villager',alive:true}];
 const extra={serials:[],visitors:[],shields:[],enraged:true,packVotes:[{actor:0,target:1},{actor:0,target:4}]};
 const night=resolveNight(p,[],[],false,[],[],[],extra);
 assert.equal(night[1].alive,false);assert.equal(night[4].alive,false);
 const protectedNight=resolveNight(p,[],[1],false,[],[],[],extra);
 assert.equal(protectedNight[1].alive,true);assert.equal(protectedNight[4].alive,false);
 assert.equal(knownPackmate('werewolf','wolfpup'),true);
});

test('journalist is a village role that can be dealt',()=>{
 const counts={madman:0,werewolf:1,villager:1,doctor:0,seer:0,chef:0,mayor:0,templar:0,muted:0,jester:0,necromancer:0,bodyguard:0,sheriff:0,serialkiller:0,survivor:0,visitor:0,psychic:0,celebrity:0,detective:0,instigator:0,strongwolf:0,sickman:0,lonewolf:0,wolfpup:0,journalist:2,raven:0,rabidwolf:0,whitewolf:0,gambler:0,mindflayer:0,intelligence:0,thief:0,police:0,hypnowolf:0,charmer:0};
 const p=deal(['A','B','C','D'],counts);
 assert.equal(p.filter(x=>x.role==='journalist').length,2);
});


test('raven is a neutral lone survivor and its activated curse kills marked players',()=>{
 const p=[...players,{id:3,name:'Raven',role:'raven',alive:true}];
 assert.equal(winner([p[3]]),'raven');
 assert.equal(winner(p),null);
 const result=resolveNight(p,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],curses:{3:[1,2]},triggeredCurses:[3]});
 assert.equal(result[1].alive,false); assert.equal(result[2].alive,false); assert.equal(result[3].alive,true);
});
test('a marked attacker targeting Raven is reflected; unmarked attacks still hit',()=>{
 const p=[...players,{id:3,name:'Raven',role:'raven',alive:true},{id:4,name:'Killer',role:'serialkiller',alive:true}];
 const reflected=resolveNight(p,[],[],false,[],[],[],{serials:[{actor:4,target:3}],visitors:[],shields:[],curses:{3:[4]}});
 assert.equal(reflected[3].alive,true); assert.equal(reflected[4].alive,false);
 const hit=resolveNight(p,[],[],false,[],[],[],{serials:[{actor:4,target:3}],visitors:[],shields:[],curses:{3:[1]}});
 assert.equal(hit[3].alive,false); assert.equal(hit[4].alive,true);
 const pack=resolveNight(p,[3],[],false,[],[],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:0,target:3}],curses:{3:[0]}});
 assert.equal(pack[3].alive,true); assert.equal(pack[0].alive,false);
});


test('rabid wolf converts a living non-wolf; victim joins and is known by the pack',()=>{
 const p=[...players,{id:3,name:'Rabid',role:'rabidwolf',alive:true}];
 const result=applyInfections(p,[{actor:3,target:1}]);
 assert.deepEqual(result.converted,[1]); assert.equal(result.players[1].role,'werewolf');
 assert.equal(knownPackmate('rabidwolf',result.players[1].role),true);
 assert.equal(knownPackmate('werewolf','rabidwolf'),true);
 assert.equal(p[1].role,'villager');
});
test('infections do not convert dead players, known wolves, or proceed from dead actors',()=>{
 const p=[...players,{id:3,name:'Rabid',role:'rabidwolf',alive:true},{id:4,name:'Other',role:'villager',alive:false}];
 assert.deepEqual(applyInfections(p,[{actor:3,target:4},{actor:3,target:0}]).converted,[]);
 assert.deepEqual(applyInfections(p.map(x=>x.id===3?{...x,alive:false}:x),[{actor:3,target:1}]).converted,[]);
});


test('white werewolf is known to the pack but may betray it',()=>{
 assert.equal(knownPackmate('werewolf','whitewolf'),true);
 assert.equal(knownPackmate('whitewolf','werewolf'),true);
 assert.equal(canWolfTarget('werewolf','whitewolf'),false);
 assert.equal(canWolfTarget('whitewolf','werewolf'),true);
 assert.equal(canWolfTarget('whitewolf','villager'),true);
});
test('white werewolf wins alone and loses when real wolves reach parity',()=>{
 const w={id:4,name:'White',role:'whitewolf',alive:true};
 assert.equal(winner([w]),'whitewolf');
 assert.equal(winner([w,players[1]]),null);
 assert.equal(winner([w,players[0]]),'wolf');
 assert.equal(winner([w,players[0],players[1]]),null);
 assert.equal(winner([w,players[0],players[1],players[2]]),null);
});


test('white werewolf is neutral but appears as a werewolf to wolf-detecting abilities',()=>{
 assert.equal(roles.whitewolf.team,'neutral');
 assert.equal(appearsWerewolf('whitewolf'),true);
 const p=[...players,{id:3,name:'White',role:'whitewolf',alive:true},{id:4,name:'Templar',role:'templar',alive:true},{id:5,name:'Visitor',role:'visitor',alive:true}];
 const night=resolveNight(p,[],[],false,[{actor:4,target:3}],[],[],{serials:[],visitors:[{actor:5,target:3}],shields:[]});
 assert.equal(night.find(x=>x.id===3).alive,false);
 assert.equal(night.find(x=>x.id===4).alive,true);
 assert.equal(night.find(x=>x.id===5).alive,false);
});
test('white werewolf does not satisfy the required wolf role count in the deck',()=>{
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
 Object.assign(counts,{whitewolf:1,villager:3});
 assert.throws(()=>deal(['A','B','C','D'],counts));
});


test('gambler prepares after two correct bets and escapes only after surviving the next night',()=>{
 const g={id:3,name:'Gambler',role:'gambler',alive:true};
 const p=[...players,g];
 const first=settleGamblerBets(p,1,[{actor:3,target:1}],{});
 assert.equal(first.correct[3],1); assert.deepEqual(first.indebted,[]); assert.equal(first.players[3].alive,true);
 const second=settleGamblerBets(p,2,[{actor:3,target:2}],first.correct);
 assert.deepEqual(second.ready,[3]); assert.equal(second.players[3].alive,true);
 const escaped=resolveGamblerEscapes(second.players,second.ready);
 assert.deepEqual(escaped.escaped,[3]);assert.equal(escaped.players[3].escaped,true);assert.equal(escaped.players[3].alive,false);
 assert.deepEqual(resolveGamblerEscapes(p.map(x=>x.id===3?{...x,alive:false}:x),second.ready).escaped,[]);
 assert.deepEqual(resolveGamblerEscapes(p.map(x=>x.id===3?{...x,role:'werewolf'}:x),second.ready).escaped,[]);
});
test('incorrect and tied predictions create debt, paid next night unless a doctor saves',()=>{
 const g={id:3,name:'Gambler',role:'gambler',alive:true}; const p=[...players,g];
 for(const execution of [2,null]) {
  const result=settleGamblerBets(p,execution,[{actor:3,target:1}],{});
  assert.deepEqual(result.indebted,[3]);
  assert.equal(collectGamblerDebts(p,result.indebted,{})[3].alive,false);
  assert.equal(collectGamblerDebts(p,result.indebted,{2:3})[3].alive,true);
 }
 assert.deepEqual(settleGamblerBets(p.map(x=>x.id===3?{...x,alive:false}:x),1,[{actor:3,target:1}],{}).ready,[]);
});
test('a shielded villager does not cause a bodyguard to sacrifice themselves',()=>{
 const p=[...players,{id:3,name:'Guard',role:'bodyguard',alive:true}];
 const night=resolveNight(p,[1],[],false,[],[{actor:3,target:1}],[],{serials:[],visitors:[],shields:[1]});
 assert.equal(night[1].alive,true); assert.equal(night[3].alive,true);
});


test('Mind Flayer wins only when every other living player is parasitized',()=>{
 const m={id:3,name:'Mind Flayer',role:'mindflayer',alive:true}; const p=[...players,m];
 assert.equal(mindFlayerWinner(p,{3:[0,1]}),null);
 assert.equal(mindFlayerWinner(p,{3:[0,1,2]}),3);
 assert.equal(mindFlayerWinner(p.map(x=>x.id===2?{...x,alive:false}:x),{3:[0,1]}),3);
 assert.equal(mindFlayerWinner(p.map(x=>x.id===3?{...x,alive:false}:x),{3:[0,1,2]}),null);
 assert.equal(mindFlayerWinner([m],{}),3);
});
test('a skipped Mind Flayer turn has a 20% parasite generation chance',()=>{
 assert.equal(regenerateParasite(3,()=>0),4);
 assert.equal(regenerateParasite(3,()=>0.199),4);
 assert.equal(regenerateParasite(3,()=>0.2),3);
});


test('intelligence chief gets two distinct living non-self candidates and reports can be inaccurate',()=>{
 const chief={id:3,name:'Chief',role:'intelligence',alive:true}; const p=[...players,chief];
 const guaranteed=intelligenceReport(p,3,()=>0);
 assert.equal(guaranteed.length,2); assert.equal(new Set(guaranteed).size,2); assert.ok(guaranteed.includes(0)); assert.ok(!guaranteed.includes(3));
 const values=[0.6,0,0.99];
 const inaccurate=intelligenceReport(p,3,()=>values.shift());
 assert.deepEqual(inaccurate,[2,1]);
 const limited=intelligenceReport([chief,{...players[0],alive:false},players[1]],3,()=>0);
 assert.deepEqual(limited,[1]);
 assert.deepEqual(intelligenceReport([chief],3,()=>0),[]);
});


test('thief steals the target role after a lethal attack and joins its team',()=>{
 const thief={id:3,name:'Thief',role:'thief',alive:true}; const p=[...players,thief];
 const hits=[{actor:3,target:2}];
 const night=resolveNight(p,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],thieves:hits});
 const result=applyThefts(p,night,hits);
 assert.equal(result.players[2].alive,false); assert.equal(result.players[3].role,'doctor');
 assert.equal(roles[result.players[3].role].team,'village');
});
test('thief does not steal when a target survives or the thief is killed',()=>{
 const p=[...players,{id:3,name:'Thief',role:'thief',alive:true}]; const hits=[{actor:3,target:2}];
 const shielded=resolveNight(p,[],[],false,[],[],[],{serials:[],visitors:[],shields:[2],thieves:hits});
 assert.deepEqual(applyThefts(p,shielded,hits).stolen,{});
 const dead=p.map(x=>x.id===3||x.id===2?{...x,alive:false}:x);
 assert.deepEqual(applyThefts(p,dead,hits).stolen,{});
});
test('a living thief prevents an immediate wolf or village victory before stealing',()=>{
 const thief={id:3,name:'Thief',role:'thief',alive:true};
 assert.equal(winner([players[0],thief]),null);
 assert.equal(winner([players[1],thief]),null);
 assert.equal(winner([thief]),'draw');
});


test('police cannot detain themselves, dead players or the previous target',()=>{
 const p=[...players,{id:3,name:'Police',role:'police',alive:true},{id:4,name:'Dead',role:'villager',alive:false}];
 assert.equal(canDetain(p,3,1,{}),true); assert.equal(canDetain(p,3,1,{3:1}),false);
 assert.equal(canDetain(p,3,3,{}),false); assert.equal(canDetain(p,3,4,{}),false);
});
test('hypnosis affects living villagers only, not wolves or neutral players',()=>{
 const p=[...players,{id:3,name:'Hypnotist',role:'hypnowolf',alive:true},{id:4,name:'Neutral',role:'jester',alive:true},{id:5,name:'Dead',role:'seer',alive:false}];
 assert.deepEqual(applyHypnosis(p,[{actor:3,target:1},{actor:3,target:0},{actor:3,target:4},{actor:3,target:5}],[2]),[2,1]);
 assert.equal(knownPackmate('werewolf','hypnowolf'),true);
});
test('hypnotized sick man does not die from illness',()=>{
 const sick=[{id:7,name:'Sick',role:'sickman',alive:true}];
 assert.equal(applyIllness(sick,{}, {7:1},[7]).players[0].alive,true);
 assert.equal(applyIllness(sick,{}, {7:1}).players[0].alive,false);
});


test('chef can safely skip when fewer than two guests are alive',()=>{
 const chef={id:3,name:'Chef',role:'chef',alive:true};
 assert.equal(canChefAct([chef,players[1],players[2]],3),true);
 assert.equal(canChefAct([chef,players[1],{...players[2],alive:false}],3),false);
});
test('detained or hypnotized celebrity does not reveal their identity',()=>{
 const p=[...players,{id:3,name:'Star',role:'celebrity',alive:true}];
 assert.deepEqual(celebrityReveals(p,[],[],()=>0),{0:['Star']});
 assert.deepEqual(celebrityReveals(p,[3],[],()=>0),{});
 assert.deepEqual(celebrityReveals(p,[],[3],()=>0),{});
});


test('a reflected thief attack cannot steal a Raven killed by another attacker',()=>{
 const p=[{id:0,name:'Thief',role:'thief',alive:true},{id:1,name:'Raven',role:'raven',alive:true},{id:2,name:'Shooter',role:'sheriff',alive:true}];
 const attempts=[{actor:0,target:1}], successful=[];
 const result=resolveNight(p,[],[],false,[],[],[{actor:2,target:1}],{serials:[],visitors:[],shields:[0],thieves:attempts,curses:{1:[0]},successfulThefts:successful});
 assert.equal(result[1].alive,false); assert.equal(result[0].alive,true);
 assert.deepEqual(successful,[]); assert.equal(applyThefts(p,result,successful).players[0].role,'thief');
});
test('thief attacks stopped by shields and bodyguards do not count as successful',()=>{
 const p=[{id:0,name:'Thief',role:'thief',alive:true},{id:1,name:'Villager',role:'villager',alive:true},{id:2,name:'Guard',role:'bodyguard',alive:true}];
 for(const shield of [true,false]) {
  const successful=[];
  const result=resolveNight(p,[],[],false,[],[{actor:2,target:1}],[],{serials:[],visitors:[],shields:shield?[1]:[],thieves:[{actor:0,target:1}],successfulThefts:successful});
  assert.equal(result[1].alive,true); assert.deepEqual(successful,[]);
 }
});


test('a living Mind Flayer prevents ordinary team victory until its own condition resolves',()=>{
 const mind={id:3,name:'Mind',role:'mindflayer',alive:true};
 assert.equal(winner([players[0],mind]),null);
 assert.equal(winner([players[1],mind]),null);
 assert.equal(mindFlayerWinner([mind],{}),3);
});
test('hypnosis no longer disables a villager after conversion to another team',()=>{
 const converted=[{id:1,name:'Former Doctor',role:'werewolf',alive:true}];
 assert.deepEqual(applyHypnosis(converted,[],[1]),[]);
 const deadVillage=[{id:1,name:'Doctor',role:'doctor',alive:false}];
 assert.deepEqual(applyHypnosis(deadVillage,[],[1]),[1]);
});


test('lovers are an independent team and one surviving partner can win',()=>{
 const charmer={id:3,name:'Friends Maker',role:'charmer',alive:true};
 const p=[...players,charmer];const bonds={3:0,0:3};
 assert.equal(teamOfPlayer(p[0],bonds),'friends');
 assert.equal(winner([p[0],charmer],bonds),'friends');
 assert.equal(winner([charmer],bonds),'friends');
 assert.equal(winner(p,bonds),null);
 assert.equal(sameTeamForChef(p[0],charmer,bonds),true);
 assert.equal(sameTeamForChef(p[0],p[1],bonds),false);
});
test('a vote-executed jester in love does not win separately',()=>{
 const j={id:3,name:'Jester',role:'jester',alive:true};
 const c={id:4,name:'Friends Maker',role:'charmer',alive:true};
 assert.notEqual(voteWinner([...players,j,c],3,{3:4,4:3}),'jester');
});
test('attacks and pack ballots cannot harm a bonded partner',()=>{
 const p=[{id:0,name:'Wolf',role:'werewolf',alive:true},{id:1,name:'Friends Maker',role:'charmer',alive:true},{id:2,name:'Shooter',role:'sheriff',alive:true}];
 const lovers={0:1,1:0};
 const result=resolveNight(p,[1],[],false,[],[],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:0,target:1}],lovers});
 assert.equal(result[1].alive,true);
 const solo=[{id:0,name:'Killer',role:'serialkiller',alive:true},{id:1,name:'Friends Maker',role:'charmer',alive:true}];
 assert.equal(resolveNight(solo,[],[],false,[],[],[],{serials:[{actor:0,target:1}],visitors:[],shields:[],lovers})[1].alive,true);
});
test('a bonded gambler cannot independently escape and a bonded mind flayer cannot win alone',()=>{
 const g={id:0,name:'G',role:'gambler',alive:true}, c={id:1,name:'C',role:'charmer',alive:true};const lovers={0:1,1:0};
 assert.deepEqual(settleGamblerBets([g,c],1,[{actor:0,target:1}],{0:1},lovers).ready,[]);
 const m={...g,role:'mindflayer'}; assert.equal(mindFlayerWinner([m,c],{0:[1]},lovers),null);
});


test('Madmen are chosen only from eligible village roles without changing displayed roles',()=>{
 const p=[{id:0,name:'Wolf',role:'werewolf',alive:true},{id:1,name:'Villager',role:'villager',alive:true},{id:2,name:'Muter',role:'muted',alive:true},{id:3,name:'Doctor',role:'doctor',alive:true},{id:4,name:'Seer',role:'seer',alive:true}];
 assert.equal(isEligibleMadmanRole('villager'),false);assert.equal(isEligibleMadmanRole('muted'),true);assert.equal(isEligibleMadmanRole('werewolf'),false);
 assert.equal(isEligibleMadmanRole('doctor'),true);
 const selected=selectMadmen(p,2,()=>0);assert.deepEqual(selected.sort(),[3,4]);assert.deepEqual(selectMadmen(p,3,()=>0).sort(),[2,3,4]);assert.equal(p[3].role,'doctor');
 assert.throws(()=>selectMadmen(p,4));assert.throws(()=>selectMadmen(p,-1));assert.throws(()=>selectMadmen(p,0.5));
});
test('Sheriff bullets do not kill a Madman or cause a visitor to die from that shot',()=>{
 const p=[{id:0,name:'Madman',role:'seer',alive:true},{id:1,name:'Sheriff',role:'sheriff',alive:true},{id:2,name:'Visitor',role:'visitor',alive:true}];
 const result=resolveNight(p,[],[],false,[],[],[{actor:1,target:0}],{serials:[],visitors:[{actor:2,target:0}],shields:[],madmen:[0]});
 assert.equal(result[0].alive,true);assert.equal(result[2].alive,true);
 assert.equal(resolveNight(p,[],[],false,[],[],[{actor:1,target:0}])[0].alive,false);
});


test('a recruited werewolf who is bonded remains on the Friends team',()=>{
 const players=[{id:0,name:'Friends Maker',role:'charmer',alive:true},{id:1,name:'Partner',role:'villager',alive:true},{id:2,name:'Rabid',role:'rabidwolf',alive:true}];
 const bond={0:1,1:0};
 const after=applyInfections(players,[{actor:2,target:1}]).players;
 assert.equal(after[1].role,'werewolf');
 assert.equal(teamOfPlayer(after[1],bond),'friends');
 assert.equal(knownPackmate('werewolf',after[1].role),true);
 assert.equal(winner([after[0],after[1]],bond),'friends');
 assert.equal(teamOfPlayer({...players[1],role:'werewolf'},bond),'friends');
});


test('detained police do not detain others; mutual detention cancels both abilities',()=>{
 assert.deepEqual(resolveDetentions([{actor:0,target:1},{actor:1,target:2}]).blocked,[1]);
 assert.deepEqual(resolveDetentions([{actor:1,target:2},{actor:0,target:1}]).blocked,[1]);
 const cycle=resolveDetentions([{actor:0,target:1},{actor:1,target:0}]);
 assert.deepEqual(cycle.blocked.sort(),[0,1]);assert.deepEqual(cycle.effective,[]);
});


test('automatic lineups follow the video for 6–16 and explicitly extrapolate outside it',()=>{
 for(let n=4;n<=24;n++) {
   const lineup=randomLineup(n);
   assert.equal(lineup.werewolf,n<=8?1:2,`wolf count for ${n}`);
   assert.equal(lineup.seer,n<=8?0:1,`seer count for ${n}`);
   assert.equal(lineup.villager,n-lineup.werewolf-lineup.seer);
   assert.equal(Object.values(lineup).reduce((a,b)=>a+b,0),n);
   assert.equal(Object.entries(lineup).filter(([r])=>!['werewolf','seer','villager'].includes(r)).every(([,v])=>v===0),true);
   const names=Array.from({length:n},(_,i)=>String(i));
   assert.equal(deal(names,lineup).length,n);
   assert.throws(()=>randomLineup(n,(n<=8?0:1)+1),/add eligible village roles manually/);
   if(n>=9) assert.equal(selectMadmen(deal(names,randomLineup(n,1)),1).length,1);
 }
 assert.throws(()=>randomLineup(3));assert.throws(()=>randomLineup(25));assert.throws(()=>randomLineup(8,-1));
});

test('video-inspired roles are still randomly assigned to players',()=>{
 const lineup=randomLineup(10), names=Array.from({length:10},(_,i)=>`P${i}`), original=Math.random;
 try {
  Math.random=()=>0;const first=deal(names,lineup);
  Math.random=()=>0.999;const second=deal(names,lineup);
  assert.notDeepEqual(first.map(p=>p.role),second.map(p=>p.role));
  assert.equal(first.filter(p=>p.role==='werewolf').length,2);
  assert.equal(second.filter(p=>p.role==='seer').length,1);
 } finally {Math.random=original;}
});

test('Celebrity audience is distinct, excludes self, and respects blocks',()=>{
 const players=[{id:0,name:'Star',role:'celebrity',alive:true},{id:1,name:'A',role:'villager',alive:true},{id:2,name:'B',role:'villager',alive:true},{id:3,name:'C',role:'villager',alive:false}];
 assert.deepEqual(celebrityReveals(players,[],[],()=>0,3),{1:['Star'],2:['Star']});
 assert.deepEqual(celebrityReveals(players,[0],[],()=>0,3),{});
 assert.deepEqual(celebrityReveals(players,[],[0],()=>0,3),{});
});

test('Seer can see exact roles or only werewolf appearance, preserving disguises', async()=>{
 const {seerReading}=await import('../src/werewolf-engine.ts');
 assert.equal(seerReading('doctor',true),'Doctor');assert.equal(seerReading('doctor',false),'not a Werewolf');
 assert.equal(seerReading('whitewolf',true),'Werewolf');assert.equal(seerReading('whitewolf',false),'a Werewolf');
 assert.equal(seerReading('serialkiller',true),'Villager');assert.equal(seerReading('serialkiller',false),'not a Werewolf');
 assert.equal(seerReading('werewolf',false),'a Werewolf');
});

test('Sick Man illness uses configurable starting nights and Doctor bonus',()=>{
 const sick=[{id:0,name:'Sick',role:'sickman',alive:true}];
 let next=applyIllness(sick,{}, {},[],2,4);assert.equal(next.remaining[0],1);assert.equal(next.players[0].alive,true);
 next=applyIllness(next.players,{1:0},next.remaining,[],2,4);assert.equal(next.remaining[0],4);assert.equal(next.players[0].alive,true);
 next=applyIllness(sick,{1:0},{0:1},[],2,0);assert.equal(next.players[0].alive,false);
 assert.equal(applyIllness(sick,{}, {0:1},[0],2,4).players[0].alive,true);
});

test('Chef neutral-team option respects independent players and Friends',()=>{
 const a={id:0,name:'A',role:'jester',alive:true},b={id:1,name:'B',role:'serialkiller',alive:true};
 assert.equal(sameTeamForChef(a,b),true);
 assert.equal(sameTeamForChef(a,b,{},false),false);
 assert.equal(sameTeamForChef(a,b,{0:1,1:0},false),true);
});

test('Visitor danger options affect visits without stopping direct attacks',()=>{
 const p=[{id:0,name:'Visitor',role:'visitor',alive:true},{id:1,name:'Wolf',role:'werewolf',alive:true},{id:2,name:'Town',role:'villager',alive:true}];
 const run=(target,votes,extra={})=>resolveNight(p,votes,[],false,[],[],[],{serials:[],shields:[],visitors:[{actor:0,target}],...extra});
 assert.equal(run(1,[])[0].alive,false);
 assert.equal(run(1,[],{visitorDangerousRoles:false})[0].alive,true);
 assert.equal(run(2,[2])[0].alive,false);
 assert.equal(run(2,[2],{visitorAttackedTarget:false})[0].alive,true);
 assert.equal(run(2,[0],{visitorDangerousRoles:false,visitorAttackedTarget:false})[0].alive,false);
});

test('Bodyguard may protect other teams only when configured, including from Lone Wolf',()=>{
 const p=[{id:0,name:'Killer',role:'serialkiller',alive:true},{id:1,name:'Guard',role:'bodyguard',alive:true},{id:2,name:'Shooter',role:'sheriff',alive:true},{id:3,name:'Lone',role:'lonewolf',alive:true}];
 const guards=[{actor:1,target:0}], bullets=[{actor:2,target:0}];
 const off=resolveNight(p,[],[],false,[],guards,bullets,{serials:[],visitors:[],shields:[]});assert.equal(off[0].alive,false);assert.equal(off[1].alive,true);
 const on=resolveNight(p,[],[],false,[],guards,bullets,{serials:[],visitors:[],shields:[],bodyguardProtectAll:true});assert.equal(on[0].alive,true);assert.equal(on[1].alive,false);
 const lone=resolveNight(p,[],[],false,[],guards,[],{serials:[],visitors:[],shields:[],lone:[{actor:3,target:0}],bodyguardProtectAll:true});assert.equal(lone[0].alive,true);assert.equal(lone[1].alive,false);
});

test('Wolf Pup revenge resolves the configured number of pack targets',()=>{
 const p=[{id:0,name:'Wolf',role:'werewolf',alive:true},...Array.from({length:4},(_,i)=>({id:i+1,name:`V${i+1}`,role:'villager',alive:true}))];
 const ballots=[{actor:0,target:1},{actor:0,target:1},{actor:0,target:1},{actor:0,target:2},{actor:0,target:2},{actor:0,target:3}];
 const extra={serials:[],visitors:[],shields:[],packVotes:ballots,enraged:true};
 assert.deepEqual(resolveNight(p,[],[],false,[],[],[],extra).filter(x=>!x.alive).map(x=>x.id),[1,2]);
 assert.deepEqual(resolveNight(p,[],[],false,[],[],[],{...extra,packAttackLimit:3}).filter(x=>!x.alive).map(x=>x.id),[1,2,3]);
 assert.deepEqual(resolveNight(p,[],[],false,[],[],[],{...extra,packAttackLimit:1}).filter(x=>!x.alive).map(x=>x.id),[1]);
});

test('pack tie breaker chooses only among the tied cutoff when enabled',()=>{
 assert.deepEqual(tallyPack([1,2],1),[]);
 assert.deepEqual(tallyPack([1,2],1,true,()=>0),[2]);
 assert.deepEqual(tallyPack([1,1,2,3],2,true,()=>0),[1,3]);
 assert.deepEqual(tallyPack([1,1,2,3],2),[1]);
});

test('Mind Flayer regeneration honors configured chance boundaries',()=>{
 assert.equal(regenerateParasite(0,()=>0,0),0);
 assert.equal(regenerateParasite(2,()=>0.999,1),3);
 assert.equal(regenerateParasite(2,()=>0.49,0.5),3);
 assert.equal(regenerateParasite(2,()=>0.5,0.5),2);
});

test('Gambler escape threshold is configurable without changing wrong-bet consequences',()=>{
 const g={id:10,name:'G',role:'gambler',alive:true};const village={id:11,name:'V',role:'villager',alive:true};const players=[g,village];
 assert.deepEqual(settleGamblerBets(players,11,[{actor:10,target:11}],{}, {},1).ready,[10]);
 assert.deepEqual(settleGamblerBets(players,11,[{actor:10,target:11}],{}, {},3).ready,[]);
 assert.deepEqual(settleGamblerBets(players,11,[{actor:10,target:11}],{10:2}, {},3).ready,[10]);
 assert.deepEqual(settleGamblerBets(players,null,[{actor:10,target:11}],{}, {},1).indebted,[10]);
 assert.deepEqual(settleGamblerBets(players,11,[{actor:10,target:11}],{}, {10:11},1).ready,[]);
});

test('Raven reflection can be disabled without disabling the activated curse',()=>{
 const p=[...players,{id:3,name:'Raven',role:'raven',alive:true},{id:4,name:'Killer',role:'serialkiller',alive:true}];
 const hit=resolveNight(p,[],[],false,[],[],[],{serials:[{actor:4,target:3}],visitors:[],shields:[],curses:{3:[4]},ravenReflectAttackers:false});
 assert.equal(hit[3].alive,false);assert.equal(hit[4].alive,true);
 const pack=resolveNight(p,[3],[],false,[],[],[],{serials:[],visitors:[],shields:[],packVotes:[{actor:0,target:3}],curses:{3:[0]},ravenReflectAttackers:false});
 assert.equal(pack[3].alive,false);assert.equal(pack[0].alive,true);
 const curse=resolveNight(p,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],curses:{3:[4]},triggeredCurses:[3],ravenReflectAttackers:false});
 assert.equal(curse[4].alive,false);
});

test('White Werewolf betrayal option changes pack targeting without revealing Lone Werewolves',()=>{
 assert.equal(canWolfTarget('whitewolf','werewolf'),true);
 assert.equal(canWolfTarget('whitewolf','werewolf',false),false);
 assert.equal(canWolfTarget('whitewolf','wolfpup',false),false);
 assert.equal(canWolfTarget('whitewolf','lonewolf',false),true);
 assert.equal(canWolfTarget('whitewolf','villager',false),true);
 assert.equal(canWolfTarget('werewolf','whitewolf',false),false);
});

test('Random cards use relative chance weights without changing manually added roles',()=>{
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts.werewolf=1;
 const order=['villager','doctor','seer','werewolf'];
 const chances={villager:0,doctor:50,seer:100};
 const randoms={village:1,wolf:0,neutral:0};
 assert.equal(resolveRandomRoles(counts,randoms,order,chances,false,()=>0).doctor,1);
 assert.equal(resolveRandomRoles(counts,randoms,order,chances,false,()=>0.3333334).seer,1);
 assert.equal(counts.werewolf,1);assert.equal(counts.doctor,0);
 assert.equal(resolveRandomRoles(counts,randoms,order,{villager:0,doctor:0,seer:100},false,()=>0).seer,1);
 assert.throws(()=>resolveRandomRoles(counts,randoms,order,{villager:0,doctor:0,seer:0}),/Not enough eligible village roles/);
});

test('Random unique mode excludes manually selected roles and prior random draws',()=>{
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts.werewolf=1;counts.doctor=1;
 const order=['villager','doctor','seer','werewolf'];const randoms={village:2,wolf:0,neutral:0};
 const result=resolveRandomRoles(counts,randoms,order,{},true,()=>0);
 assert.equal(result.doctor,1);assert.equal(result.villager,1);assert.equal(result.seer,1);
 assert.throws(()=>resolveRandomRoles(counts,{...randoms,village:3},order,{},true,()=>0),/Not enough eligible village roles/);
 const repeated=resolveRandomRoles(counts,{...randoms,village:2},order,{villager:100,doctor:0,seer:0},false,()=>0);
 assert.equal(repeated.villager,2);assert.equal(repeated.doctor,1);
});

test('disabled roles never appear on Random cards, independently of chances and manual picks',()=>{
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts.werewolf=1;counts.doctor=1;
 const order=['doctor','seer','villager','werewolf'];const randoms={village:2,wolf:0,neutral:0};
 const result=resolveRandomRoles(counts,randoms,order,{},false,()=>0,['doctor','seer']);
 assert.equal(result.doctor,1);assert.equal(result.seer,0);assert.equal(result.villager,2);
 assert.throws(()=>resolveRandomRoles(counts,randoms,order,{},false,()=>0,['doctor','seer','villager']),/Enable more roles/);
});

test('hypnosis duration counts future nights, keeps Madmen, and clears on team change',async()=>{
 const {advanceHypnosis}=await import('../src/werewolf-engine.ts');
 const p=[{id:0,name:'Wolf',role:'hypnowolf',alive:true},{id:1,name:'Seer',role:'seer',alive:true},{id:2,name:'Doctor',role:'doctor',alive:true},{id:3,name:'Madman',role:'chef',alive:true}];
 for(const duration of [1,2,3,4,5]){
  let result=advanceHypnosis(p,[{actor:0,target:1},{actor:0,target:2}],{},[3],1,duration);
  assert.deepEqual(new Set(result.corrupted),new Set([1,2,3]));
  for(let night=2;night<=duration;night++){result=advanceHypnosis(p,[],result.expires,[3],night,duration);assert.deepEqual(new Set(result.corrupted),new Set([1,2,3]));}
  result=advanceHypnosis(p,[],result.expires,[3],1+duration,duration);assert.deepEqual(result.corrupted,[3]);
 }
 let forever=advanceHypnosis(p,[{actor:0,target:1}],{},[3],1,0);
 forever=advanceHypnosis(p,[],forever.expires,[3],99,0);assert.deepEqual(new Set(forever.corrupted),new Set([1,3]));
 const converted=p.map(x=>x.id===1?{...x,role:'werewolf'}:x);forever=advanceHypnosis(converted,[],forever.expires,[3],100,0);
 assert.deepEqual(forever.corrupted,[3]);assert.deepEqual(forever.expires,{});
});

test('new hypnosis can extend an existing spell without shortening permanent hypnosis',async()=>{
 const {advanceHypnosis}=await import('../src/werewolf-engine.ts');const p=[{id:0,name:'Wolf',role:'hypnowolf',alive:true},{id:1,name:'Seer',role:'seer',alive:true}];
 let r=advanceHypnosis(p,[{actor:0,target:1}],{},[],1,3);r=advanceHypnosis(p,[{actor:0,target:1}],r.expires,[],2,5);assert.equal(r.expires[1],7);
 r=advanceHypnosis(p,[{actor:0,target:1}],r.expires,[],3,0);assert.equal(r.expires[1],null);
 r=advanceHypnosis(p,[{actor:0,target:1}],r.expires,[],4,1);assert.equal(r.expires[1],null);
});

test('Madman cards use separate player slots and get secret village disguises',async()=>{
 const {disguiseMadmanCards}=await import('../src/werewolf-engine.ts');
 const dealt=[{id:0,name:'A',role:'madman',alive:true},{id:1,name:'B',role:'madman',alive:true},{id:2,name:'C',role:'werewolf',alive:true}];
 let n=0;const result=disguiseMadmanCards(dealt,()=>n++===0?0:0.999);
 assert.deepEqual(result.madmen,[0,1]);
 assert.equal(result.players.length,3);
 for(const player of result.players.slice(0,2))assert.ok(isEligibleMadmanRole(player.role));
 assert.notEqual(result.players[0].role,result.players[1].role);
 assert.equal(result.players[2].role,'werewolf');
 assert.equal(dealt[0].role,'madman');
});

test('a Madman remains corrupted after hypnosis expires or death and loses it after infection',async()=>{
 const {advanceHypnosis}=await import('../src/werewolf-engine.ts');
 const players=[{id:0,name:'Madman',role:'doctor',alive:true},{id:1,name:'Wolf',role:'rabidwolf',alive:true}];
 let result=advanceHypnosis(players,[{actor:1,target:0}],{},[0],1,1);
 assert.deepEqual(result.corrupted,[0]);
 result=advanceHypnosis(players,[],result.expires,[0],2,1);
 assert.deepEqual(result.corrupted,[0]);
 const dead=players.map(p=>p.id===0?{...p,alive:false}:p);
 assert.deepEqual(advanceHypnosis(dead,[],{},[0],3,0).corrupted,[0]);
 const infected=applyInfections(players,[{actor:1,target:0}]).players;
 assert.equal(infected[0].role,'werewolf');
 assert.deepEqual(advanceHypnosis(infected,[],{},[0],3,0).corrupted,[]);
});

test('fake Celebrity and Sick Man abilities have no real effect',()=>{
 const p=[{id:0,name:'Star',role:'celebrity',alive:true},{id:1,name:'Sick',role:'sickman',alive:true},{id:2,name:'Other',role:'villager',alive:true}];
 assert.deepEqual(celebrityReveals(p,[],[0],()=>0,1),{});
 const result=applyIllness(p,{}, {1:1},[1],3,2);
 assert.equal(result.players[1].alive,true);assert.equal(result.remaining[1],0);
 const extended=applyIllness(p,{2:1},{1:2},[1],3,2);assert.equal(extended.remaining[1],3);assert.equal(extended.players[1].alive,true);
 assert.equal(applyIllness(p,{}, {1:1},[],3,2).players[1].alive,false);
});

test('Random village cards can pick or exclude the Madman card',()=>{
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
 const order=Object.keys(roles);const chances=Object.fromEntries(order.map(r=>[r,r==='madman'?100:0]));
 const result=resolveRandomRoles(counts,{village:1,wolf:0,neutral:0},order,chances,true,()=>0);
 assert.equal(result.madman,1);assert.equal(counts.madman,0);
 assert.throws(()=>resolveRandomRoles(counts,{village:1,wolf:0,neutral:0},order,chances,true,()=>0,['madman']),/Not enough eligible/);
 assert.throws(()=>resolveRandomRoles(counts,{village:2,wolf:0,neutral:0},order,chances,true,()=>0),/Not enough eligible/);
});
