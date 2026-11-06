import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMatchProgress,REPLAY_SETUP_FIELDS} from '../src/replay-match.ts';
import {STATE_FIELDS,REF_FIELDS,validateGameSnapshot} from '../src/game-snapshot.ts';
import {defaults,roles} from '../src/werewolf-engine.ts';
test('replay explicitly covers every registered match field and preserves only setup and newly dealt players',()=>{
 const f=freshMatchProgress(true);
 assert.deepEqual(Object.keys(f.state).sort(),Object.keys(STATE_FIELDS).filter(k=>!REPLAY_SETUP_FIELDS.includes(k)).sort());
 assert.deepEqual(Object.keys(f.refs).sort(),Object.keys(REF_FIELDS).sort());
 assert.equal(f.state.won,null);assert.deepEqual(f.state.ballots,[]);assert.deepEqual(f.state.turnInfo,[]);assert.equal(f.state.round,1);assert.equal(f.state.passiveWaitUntil,0);assert.equal(f.refs.discussionDeadline,0);assert.deepEqual(f.refs.performance,{events:[],partial:false,recoveryEnabled:true});assert.equal(f.refs.rankingRecorded,false);
});
test('fresh progress builds a valid night-one checkpoint without resetting setup options',()=>{
 const f=freshMatchProgress(),players=['werewolf','doctor','villager','villager'].map((role,id)=>({id,name:'P'+id,role,alive:true}));
 const settings={...defaults,secretVotes:false,manualDiscussionControls:false,thiefTargetMode:'persistent'};
 Object.assign(f.state,{names:players.map(p=>p.name),avatars:{},counts:Object.fromEntries(Object.keys(roles).map(r=>[r,players.filter(p=>p.role===r).length])),randomCounts:{village:0,wolf:0,neutral:0},settings,players,queue:[0,1,2,3]});f.refs.descriptionRoles=players.map(p=>p.role);
 assert.equal(validateGameSnapshot(f),true);assert.equal(f.state.settings,settings);
});
test('replays never share mutable resource arrays, sets or ledgers',()=>{
 const a=freshMatchProgress(),b=freshMatchProgress();a.state.ballots.push(1);a.refs.seenPrivateEvents.add('old');a.refs.performance.events.push({key:'old',actor:0,kind:'save',good:true});assert.deepEqual(b.state.ballots,[]);assert.equal(b.refs.seenPrivateEvents.size,0);assert.equal(b.refs.performance.events.length,0);
});
