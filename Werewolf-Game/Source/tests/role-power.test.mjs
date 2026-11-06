import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, roles, resolveRandomRoles } from '../src/werewolf-engine.ts';
import { ROLE_POWER, rolePower } from '../src/role-power.ts';
import { balancedDistribution, randomPowerWeight } from '../src/distribution.ts';
const all=Object.keys(roles);
const empty=()=>Object.fromEntries(all.map(role=>[role,0]));

test('default ratings have one 10 per team and stay within 1 to 10',()=>{
 for(const team of ['village','wolf','neutral']){
  const group=all.filter(r=>roles[r].team===team);
  assert.equal(group.filter(r=>rolePower(r,defaults)===10).length,1,team);
  for(const role of group){assert.equal(rolePower(role,defaults),ROLE_POWER[role]);assert.ok(rolePower(role,defaults)>=1&&rolePower(role,defaults)<=10);}
 }
});

test('settings change ratings in the expected direction',()=>{
 const cases=[
  ['seer',{seerShowExactRole:false}],['doctor',{doctorSelfProtect:false}],['detective',{detectiveShowNames:false}],
  ['rabidwolf',{rabidCanInfect:false}],['hypnowolf',{hypnoDuration:1}],['lonewolf',{loneWolfInterval:3}],
  ['serialkiller',{serialKillerInterval:3}],['thief',{thiefTargetMode:'cycle'}],['raven',{ravenReflectAttackers:false}],
  ['whitewolf',{whiteWolfBetrayPack:false}],['charmer',{charmerFirstNight:3}],['survivor',{survivorShieldCount:1}],
 ];
 for(const [role,setting] of cases)assert.ok(rolePower(role,{...defaults,...setting})<rolePower(role,defaults),role);
 assert.ok(rolePower('doctor',{...defaults,doctorRepeatProtect:true})>rolePower('doctor',defaults));
 assert.ok(rolePower('hypnowolf',{...defaults,hypnoMaxUses:0})>rolePower('hypnowolf',defaults));
 assert.ok(rolePower('seer',defaults)>rolePower('seer',{...defaults,seerShowExactRole:false}));
 assert.ok(rolePower('charmer',{...defaults,charmerMessages:true})>rolePower('charmer',defaults));
 for(const role of all)for(const settings of [defaults,{...defaults,firstNightSafe:false,hypnoMaxUses:0,hypnoDuration:1,mindStartingParasites:10,mindRegenPercent:100}])assert.ok(rolePower(role,settings)>=1&&rolePower(role,settings)<=10);
});

test('distribution considers updated power and supports 10-point candidates',()=>{
 const chances=Object.fromEntries(all.map(r=>[r,0]));chances.werewolf=100;chances.seer=100;chances.doctor=100;
 const normal=balancedDistribution(4,'easy',0,true,chances,()=>0.9,false,[],defaults);
 const weaker=balancedDistribution(4,'easy',0,true,chances,()=>0.9,false,[],{...defaults,seerShowExactRole:false});
 assert.ok(normal.seer>0);assert.notDeepEqual(normal,weaker);
 const only=Object.fromEntries(all.map(r=>[r,0]));only.rabidwolf=100;only.seer=100;
 const allTens=balancedDistribution(4,'easy',0,true,only,()=>0,false,[],defaults);
 assert.equal(allTens.rabidwolf,1);assert.equal(allTens.seer,3);
});

test('Random cards use current power together with chances, exclusions and uniqueness',()=>{
 const current=empty();
 assert.ok(randomPowerWeight('seer',current,1,{...defaults,seerShowExactRole:false})>randomPowerWeight('seer',current,1,defaults));
 assert.ok(randomPowerWeight('villager',current,1,defaults)<randomPowerWeight('intelligence',current,1,defaults));
 const chances=Object.fromEntries(all.map(r=>[r,0]));chances.seer=100;chances.doctor=100;
 const choose=(excluded=[])=>resolveRandomRoles(current,{village:2,wolf:0,neutral:0},all,chances,true,()=>0,excluded,(role,counts,left)=>randomPowerWeight(role,counts,left,defaults));
 const result=choose();assert.equal(result.seer,1);assert.equal(result.doctor,1);assert.equal(Object.values(result).reduce((a,b)=>a+b,0),2);
 assert.throws(()=>choose(['doctor']),/Not enough eligible/);
});

test('Wolf Pup is weaker than an attacking wolf and its revenge settings affect its estimate',()=>{
 assert.equal(rolePower('wolfpup',defaults),4);
 assert.ok(rolePower('wolfpup',defaults)<rolePower('werewolf',defaults));
 assert.equal(rolePower('wolfpup',{...defaults,rabidCanInfect:false}),3);
 assert.equal(rolePower('wolfpup',{...defaults,wolfRandomTies:true}),5);
});

test('strength-changing role settings move points in the right direction',()=>{
 const checks=[
  ['seer',{seerShowExactRole:false},'down'],['doctor',{doctorSelfProtect:false},'down'],['doctor',{doctorRepeatProtect:true},'up'],
  ['mayor',{mayorDoubleVote:false},'down'],['chef',{chefNeutralsTogether:false},'up'],['templar',{templarUses:2},'up'],
  ['necromancer',{necromancerUses:2},'up'],['bodyguard',{bodyguardProtectAll:true},'up'],['sheriff',{sheriffEveryNight:true},'up'],
  ['visitor',{visitorDangerousRoles:false},'up'],['visitor',{visitorAttackedTarget:false},'up'],['psychic',{psychicShowFriends:false},'down'],
  ['detective',{detectiveShowNames:false},'down'],['instigator',{instigatorMaxUses:1},'down'],['intelligence',{intelligenceInterval:1},'up'],
  ['police',{policeRepeatTarget:true},'up'],['police',{policeNotifyBlocked:false},'down'],['celebrity',{celebrityAudience:2},'up'],
  ['sickman',{sickStartingNights:1},'down'],['sickman',{sickDoctorBonus:4},'up'],['journalist',{journalistDrawing:false},'down'],
  ['werewolf',{wolfRandomTies:true},'up'],['rabidwolf',{rabidCanInfect:false},'down'],['lonewolf',{loneWolfInterval:2},'down'],
  ['lonewolf',{rabidCanInfect:false},'down'],['hypnowolf',{hypnoMaxUses:2},'up'],['hypnowolf',{hypnoMaxUses:0},'up'],
  ['hypnowolf',{hypnoDuration:1},'down'],['survivor',{survivorShieldCount:1},'down'],['raven',{ravenReflectAttackers:false},'down'],
  ['whitewolf',{whiteWolfBetrayPack:false},'down'],['gambler',{gamblerPredictions:1},'up'],['gambler',{gamblerBetProtection:false},'down'],
  ['mindflayer',{mindStartingParasites:4},'up'],['mindflayer',{mindRegenPercent:0},'down'],['serialkiller',{serialKillerInterval:2},'down'],
  ['thief',{thiefTargetMode:'persistent'},'down'],['thief',{thiefDeathOnly:false},'up'],['charmer',{charmerFirstNight:2},'down'],['charmer',{charmerMessages:true},'up'],
 ];
 for(const [role,setting,direction] of checks){
  const before=rolePower(role,defaults),after=rolePower(role,{...defaults,...setting});
  assert.ok(direction==='up'?after>before:after<before,`${role} ${JSON.stringify(setting)}: ${before} -> ${after}`);
 }
});

test('non-strength settings do not change points and changed points feed Random cards',()=>{
 const unchanged={...defaults,roleChances:{seer:0},disabledRandomRoles:['seer'],roleWaitSeconds:{seer:15},sounds:false,buttonSounds:false,haptics:false};
 for(const role of all)assert.equal(rolePower(role,unchanged),rolePower(role,defaults),role);
 const counts=empty();
 assert.ok(randomPowerWeight('wolfpup',counts,1,defaults)<randomPowerWeight('werewolf',counts,1,defaults));
 const lessPower={...defaults,rabidCanInfect:false};
 assert.ok(randomPowerWeight('wolfpup',counts,1,lessPower)<randomPowerWeight('wolfpup',counts,1,defaults));
});

test('both randomizers use changed Hypnotizer Wolf strength',()=>{
 const chances=Object.fromEntries(all.map(role=>[role,0]));Object.assign(chances,{werewolf:100,hypnowolf:100,villager:100});
 const stronger={...defaults,hypnoMaxUses:4};
 const weakLineup=balancedDistribution(4,'hard',0,true,chances,()=>0.53,false,[],defaults);
 const strongLineup=balancedDistribution(4,'hard',0,true,chances,()=>0.53,false,[],stronger);
 assert.equal(weakLineup.werewolf,1);assert.equal(strongLineup.hypnowolf,1);
 const draw=settings=>resolveRandomRoles(empty(),{village:0,wolf:1,neutral:0},['werewolf','hypnowolf'],chances,false,()=>0.53,[],(role,counts,left)=>randomPowerWeight(role,counts,left,settings));
 assert.equal(draw(defaults).werewolf,1);assert.equal(draw(stronger).hypnowolf,1);
});

test('Muter active ability rates 4/10 and the same rating feeds both randomizers',()=>{
 assert.equal(ROLE_POWER.muted,4);assert.equal(rolePower('muted',defaults),4);
 assert.equal(rolePower('muted',{...defaults,firstNightSafe:false,passiveWait:true,roleWaitSeconds:{muted:15}}),4);
 const manual=empty();assert.ok(Math.abs(randomPowerWeight('muted',manual,1,defaults)-(0.25+1/(1+Math.abs(4-5))))<1e-12);
 const chances=Object.fromEntries(all.map(r=>[r,0]));Object.assign(chances,{muted:100,werewolf:100});
 const chosen=balancedDistribution(4,'balanced',1,true,chances,()=>0,false,[],defaults);assert.equal(chosen.muted,3);assert.equal(chosen.werewolf,1);
 const drawn=resolveRandomRoles(empty(),{village:1,wolf:0,neutral:0},all,chances,false,()=>0,[],(r,c,n)=>randomPowerWeight(r,c,n,defaults));assert.equal(drawn.muted,1);
});
