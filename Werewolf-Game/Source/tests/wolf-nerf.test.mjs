import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,otherWolfCanAttack,loneWolfAttackSucceeds,strongWolfAttackAvailable,roleDescription} from '../src/werewolf-engine.ts';
const p=(id,role,alive=true)=>({id,name:`P${id}`,role,alive});
const safeOff={...defaults,firstNightSafe:false};
const clear=new Set();

test('Lone Wolf has 25% success with an attacking ally and 100% when alone or unsupported',()=>{
 const lone=p(0,'lonewolf'), wolf=p(1,'werewolf'), villager=p(2,'villager'), pup=p(3,'wolfpup'), hypno=p(4,'hypnowolf');
 const all=[lone,wolf,villager,pup,hypno];
 assert.equal(loneWolfAttackSucceeds(lone,all,2,safeOff,false,clear,{},()=>0.249),true);
 assert.equal(loneWolfAttackSucceeds(lone,all,2,safeOff,false,clear,{},()=>0.25),false);
 assert.equal(loneWolfAttackSucceeds(lone,[lone,villager,pup,hypno],2,safeOff,false,clear,{},()=>0.99),true);
 assert.equal(loneWolfAttackSucceeds(lone,all,2,safeOff,false,new Set([1]),{},()=>0.99),true);
 assert.equal(loneWolfAttackSucceeds(lone,[lone,p(1,'rabidwolf'),villager],1,safeOff,false,clear,{},()=>0.99),true);
 assert.equal(otherWolfCanAttack(lone,[lone,wolf,villager],2,safeOff,false,clear,{0:2,2:0}),false);
 assert.match(roleDescription('lonewolf',defaults),/25% chance/);
});

test('Strong Wolf attacks on odd nights and on even nights only without another attacker',()=>{
 const strong=p(0,'strongwolf'), wolf=p(1,'werewolf'), villager=p(2,'villager');const all=[strong,wolf,villager];
 assert.equal(strongWolfAttackAvailable(strong,all,3,safeOff,false,clear),true);
 assert.equal(strongWolfAttackAvailable(strong,all,2,safeOff,false,clear),false);
 assert.equal(strongWolfAttackAvailable(strong,[strong,villager],2,safeOff,false,clear),true);
 assert.equal(strongWolfAttackAvailable(strong,all,2,safeOff,false,new Set([1])),true);
 assert.equal(strongWolfAttackAvailable(strong,all,1,defaults,false,clear),false);
 assert.equal(strongWolfAttackAvailable(strong,[strong,p(1,'rabidwolf'),villager],2,safeOff,true,clear),true);
 assert.equal(strongWolfAttackAvailable(strong,[strong,p(1,'lonewolf'),villager],2,safeOff,false,clear),false);
 assert.equal(strongWolfAttackAvailable(strong,[strong,p(1,'strongwolf'),villager],2,safeOff,false,clear),false);
 assert.match(roleDescription('strongwolf',defaults),/nights 3, 5, 7/);
});

test('other-wolf capability does not count distant strong wolves on even nights against Lone Wolf',()=>{
 const lone=p(0,'lonewolf'),strong=p(1,'strongwolf'),villager=p(2,'villager');const all=[lone,strong,villager];
 assert.equal(otherWolfCanAttack(lone,all,2,safeOff,false,clear),false);
 assert.equal(loneWolfAttackSucceeds(lone,all,2,safeOff,false,clear,{},()=>0.99),true);
 assert.equal(otherWolfCanAttack(lone,all,3,safeOff,false,clear),true);
});
