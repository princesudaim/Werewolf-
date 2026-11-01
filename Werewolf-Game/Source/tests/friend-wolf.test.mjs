import test from 'node:test';
import assert from 'node:assert/strict';
import {canWolfTarget,winner,resolveNight} from '../src/werewolf-engine.ts';
import {winningPlayers} from '../src/rankings.ts';
const p=(id,role,alive=true)=>({id,name:`P${id}`,role,alive});
const bond={0:2,2:0};

test('secret betrayal is one-sided and still protects the actual friend',()=>{
 assert.equal(canWolfTarget('werewolf','werewolf',true,true),true);
 assert.equal(canWolfTarget('werewolf','werewolf'),false);
 const players=[p(0,'werewolf'),p(1,'werewolf'),p(2,'charmer')];
 const after=resolveNight(players,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],strong:[{actor:0,target:1}],lovers:bond});
 assert.equal(after[1].alive,false);assert.equal(after[0].alive,true);
 const protectedPartner=resolveNight(players,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],strong:[{actor:0,target:2}],lovers:bond});
 assert.equal(protectedPartner[2].alive,true);
});

test('Friends prevent wolf parity and a permanent two-wolf stalemate awards both teams',()=>{
 for(const role of ['werewolf','strongwolf','rabidwolf'])assert.equal(winner([p(0,role),p(1,'werewolf'),p(2,'charmer',false)],bond),null,role);
 for(const role of ['wolfpup','hypnowolf']){
  const players=[p(0,role),p(1,'werewolf'),p(2,'charmer',false),p(3,'werewolf',false)];
  assert.equal(winner(players,bond),'wolf-friends');
  assert.deepEqual(winningPlayers(players,'wolf-friends',bond,'','').sort(),[0,1,2,3]);
  assert.equal(winner([...players,p(4,'villager')],bond),null);
 }
 assert.equal(winner([p(0,'wolfpup'),p(1,'lonewolf'),p(2,'charmer',false)],bond),null);
 assert.equal(winner([p(0,'werewolf'),p(2,'charmer')],bond),'friends');
});


test('Lone Wolf can attack the Friends Maker’s Werewolf but not its own friend',()=>{
 assert.equal(canWolfTarget('lonewolf','werewolf'),true);
 assert.equal(canWolfTarget('werewolf','lonewolf'),true);
 const players=[p(0,'werewolf'),p(1,'lonewolf'),p(2,'charmer')];
 const chosenWolf={0:2,2:0};
 const attack=(lovers)=>resolveNight(players,[],[],false,[],[],[],{serials:[],visitors:[],shields:[],lone:[{actor:1,target:0}],lovers});
 assert.equal(attack(chosenWolf)[0].alive,false);
 assert.equal(attack({0:1,1:0})[0].alive,true);
 assert.equal(winner([p(0,'wolfpup'),p(1,'lonewolf'),p(2,'charmer',false)],chosenWolf),null);
});

test('infection recruits a Lone Wolf without changing their role or independent team logic',async()=>{
 const {applyInfections,knownPlayerPackmates,packIdentity}=await import('../src/werewolf-engine.ts');
 const players=[p(0,'rabidwolf'),p(1,'lonewolf'),p(2,'werewolf')];
 assert.equal(knownPlayerPackmates(players[0],players[1]),false);
 const result=applyInfections(players,[{actor:0,target:1}]);
 assert.deepEqual(result.converted,[]);assert.equal(result.players[1].role,'lonewolf');assert.equal(result.players[1].joinedPack,true);
 assert.equal(knownPlayerPackmates(result.players[0],result.players[1]),true);
 assert.equal(knownPlayerPackmates(result.players[1],result.players[2]),true);
 assert.equal(canWolfTarget(packIdentity(result.players[1]),packIdentity(result.players[2])),false);
 assert.equal(canWolfTarget(packIdentity(result.players[2]),packIdentity(result.players[1])),false);
 assert.equal(canWolfTarget(packIdentity(result.players[1]),packIdentity(result.players[2]),true,true),true);
 assert.equal(applyInfections([p(0,'rabidwolf',false),p(1,'lonewolf')],[{actor:0,target:1}]).players[1].joinedPack,undefined);
 assert.equal(applyInfections([p(0,'rabidwolf'),p(1,'lonewolf',false)],[{actor:0,target:1}]).players[1].joinedPack,undefined);
 assert.equal(winner([p(0,'wolfpup'),{...p(1,'lonewolf'),joinedPack:true},p(2,'charmer',false)],{0:2,2:0}),'wolf-friends');
});
