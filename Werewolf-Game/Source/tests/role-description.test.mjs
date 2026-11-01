import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, roles, roleDescription, turnRoleDescription, knownPlayerPackmates} from '../src/werewolf-engine.ts';

test('all roles have simple instructions for the current game',()=>{
 for(const role of Object.keys(roles)){
  const text=roleDescription(role,defaults);
  assert.ok(text.length>20,role);
  assert.doesNotMatch(text,/\b(pack|packmates|learns?|consecutive|creditors|parasitized|divisible|independently)\b/i,role);
 }
});

const cases=[
 ['doctor','doctorSelfProtect',false],['doctor','doctorRepeatProtect',true],['seer','seerShowExactRole',false],
 ['chef','chefNeutralsTogether',false],['mayor','mayorDoubleVote',false],['templar','templarUses',2],
 ['necromancer','necromancerUses',2],['bodyguard','bodyguardProtectAll',true],['sheriff','sheriffEveryNight',true],
 ['serialkiller','serialKillerInterval',2],['survivor','survivorShieldCount',1],['visitor','visitorDangerousRoles',false],
 ['visitor','visitorAttackedTarget',false],['psychic','psychicShowFriends',false],['celebrity','celebrityAudience',2],
 ['detective','detectiveShowNames',false],['instigator','instigatorMaxUses',1],['sickman','sickStartingNights',1],
 ['sickman','sickDoctorBonus',1],['journalist','journalistDrawing',false],['raven','ravenReflectAttackers',false],
 ['gambler','gamblerPredictions',1],['gambler','gamblerBetProtection',false],['mindflayer','mindStartingParasites',1],
 ['mindflayer','mindRegenPercent',0],['intelligence','intelligenceInterval',1],['thief','thiefAttackInterval',2],
 ['police','policeNotifyBlocked',false],
 ['police','policeRepeatTarget',true],['charmer','charmerMessages',true],['charmer','charmerFirstNight',2],['whitewolf','whiteWolfBetrayPack',false],
 ['hypnowolf','hypnoMaxUses',2],['hypnowolf','hypnoDuration',2],['rabidwolf','rabidCanInfect',false],['wolfpup','rabidCanInfect',false],['lonewolf','loneWolfInterval',2],
 ['lonewolf','rabidCanInfect',false],['werewolf','wolfRandomTies',true],
 ['strongwolf','firstNightSafe',false],['mayor','firstNightSafe',false],['survivor','firstNightSafe',false],['visitor','firstNightSafe',false],
 ['villager','roleWaitSeconds',{villager:3}],
];
for(const [role,key,value] of cases) test(`${role} instructions follow ${key}`,()=>{
 assert.notEqual(roleDescription(role,defaults),roleDescription(role,{...defaults,[key]:value}));
});

test('combined settings keep all important rules in the same explanation',()=>{
 const settings={...defaults,firstNightSafe:false,visitorDangerousRoles:false,visitorAttackedTarget:true};
 const text=roleDescription('visitor',settings);
 assert.match(text,/visiting a Werewolf or Serial Killer will not kill you/i);
 assert.match(text,/die if the player you visit is attacked/);
 assert.doesNotMatch(text,/first night/);
 assert.match(roleDescription('seer',{...defaults,seerShowExactRole:false}),/look like a Werewolf/);
 assert.match(roleDescription('mayor',{...defaults,mayorDoubleVote:false}),/vote counts once/);
});

test('first-night attack warning is not repeated in role descriptions',()=>{
 for(const role of ['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief']) assert.doesNotMatch(roleDescription(role,defaults),/cannot attack on the first night/i);
 assert.match(roleDescription('templar',defaults),/Use water/);assert.doesNotMatch(roleDescription('templar',defaults),/holy/i);
});


test('role descriptions avoid full stops and the Pup wording is clear',()=>{
 for(const role of Object.keys(roles))assert.doesNotMatch(roleDescription(role,defaults),/\./,role);
 assert.match(roleDescription('wolfpup',defaults),/2 players next night/);
 assert.equal(roles.templar.name,'Wolf Hunter');assert.equal(roles.psychic.name,'Team Checker');assert.equal(roles.instigator.name,'Vote Marker');
});


test('Visitor wording is clear for every combination of visit dangers',()=>{
 for(const dangerous of [false,true])for(const attacked of [false,true])for(const safe of [false,true]){
  const text=roleDescription('visitor',{...defaults,visitorDangerousRoles:dangerous,visitorAttackedTarget:attacked,firstNightSafe:safe});
  assert.match(text,/Each night, visit one player/);
  assert.match(text,/can still die if someone attacks you/);
  assert.equal(text.toLowerCase().includes('on the first night, visiting cannot kill you'),safe);
  assert.doesNotMatch(text,/and you also die|and you can still die|\./);
  assert.equal(text.toLowerCase().includes('you die if you visit a werewolf'),dangerous);
  if(attacked) assert.match(text,/if the player you visit is attacked/);
  else assert.match(text,/not just because the player you visit is attacked|neither will an attack on the player/);
 }
});

test('instructions separate ideas without chaining and between every sentence',()=>{
 for(const role of Object.keys(roles)){
  const text=roleDescription(role,defaults);
  assert.doesNotMatch(text,/\band you\b.*\band you\b/i,role);
  assert.doesNotMatch(text,/; A /,role);
 }
});


test('Strong Werewolf gets simple night-specific instructions without exposing hidden wolves or blocks',()=>{
 const first=turnRoleDescription('strongwolf',defaults,1,0);
 assert.match(first,/Wait until the next night/);
 const odd=turnRoleDescription('strongwolf',defaults,3,0);
 assert.match(odd,/Tonight you can pick one player to attack/);
 assert.match(odd,/only Werewolf on your team who can attack/);
 const even=turnRoleDescription('strongwolf',defaults,2,0);
 assert.match(even,/You can attack every night if you are the only Werewolf/);
 assert.match(even,/attack every night/);
 assert.match(turnRoleDescription('strongwolf',defaults,2,1),/know some other Werewolves/);
 const strong={id:0,role:'strongwolf',alive:true};
 const hiddenLone={id:1,role:'lonewolf',alive:true};
 assert.equal(knownPlayerPackmates(strong,hiddenLone),false);
 // Only visible teammates are passed in, not the hidden Lone Wolf or secret blocks
 const visibleCount=players=>players.filter(p=>p.id!==strong.id && p.alive && knownPlayerPackmates(strong,p)).length;
 assert.equal(turnRoleDescription('strongwolf',defaults,2,visibleCount([strong])),turnRoleDescription('strongwolf',defaults,2,visibleCount([strong,hiddenLone])));
 assert.match(turnRoleDescription('strongwolf',{...defaults,roleWaitSeconds:{strongwolf:3}},2,0),/Wait 3 seconds/);
});
