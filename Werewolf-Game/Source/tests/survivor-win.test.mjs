import test from 'node:test';
import assert from 'node:assert/strict';
import {winner} from '../src/werewolf-engine.ts';
import {winningPlayers,updateRankings} from '../src/rankings.ts';
import {matchStandings,freshPerformance} from '../src/match-performance.ts';
const initial=()=>['villager','villager','werewolf','survivor'].map((role,id)=>({id,name:['A','B','Wolf','Survivor'][id],role,alive:true}));
test('exact four-player example: village headline plus living Survivor WON and ranking credit',()=>{
 const p=initial();assert.equal(winner(p),null);p[2].alive=false;assert.equal(winner(p),'village');const ids=winningPlayers(p,'village',{},'','');assert.deepEqual(ids,[0,1,3]);const row=matchStandings(p,ids,freshPerformance()).find(r=>r.player.id===3);assert.equal(row.won,true);assert.equal(row.tier,0);assert.equal(updateRankings([],p,ids).find(r=>r.name==='Survivor').wins,1);
});
test('dead Survivor does not share the village win',()=>{const p=initial();p[2].alive=false;p[3].alive=false;assert.equal(winner(p),'village');assert.deepEqual(winningPlayers(p,'village',{},'',''),[0,1]);});
test('living Survivor also shares a Werewolf victory, not only a village victory',()=>{const p=initial();p[0].alive=false;p[1].alive=false;assert.equal(winner(p),'wolf');assert.deepEqual(winningPlayers(p,'wolf',{},'',''),[2,3]);});
