import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,roleDescription,turnRoleDescription} from '../src/werewolf-engine.ts';
import {descriptionFits} from '../src/smart-role-descriptions.ts';
const batch=['sheriff','templar','bodyguard','necromancer','visitor'];
const roster=[...batch,'werewolf','villager'];
const describe=(role,settings={},context={})=>roleDescription(role,{...defaults,...settings},{matchRoles:roster,...context});

test('Sheriff explains the shot, configured bullet limit and friendly-fire risk',()=>{
  for(const every of [false,true]){
    const text=describe('sheriff',{sheriffEveryNight:every});
    assert.match(text,/At night, you can shoot 1 player/);assert.match(text,/you can kill a village player/);
    assert.match(text,every?/You can shoot once each night/:/You have 1 bullet for the whole game/);
    assert.doesNotMatch(text,/Madman|Police|Hypnotizer|Doctor/);
    assert.equal(text.split('\n').length,4);
  }
});

test('Wolf Hunter keeps both outcomes and the exact configured uses without explaining other roles',()=>{
  for(const uses of [1,2,3]){
    const text=describe('templar',{templarUses:uses});
    assert.match(text,/Use water on 1 player at night/);
    assert.ok(text.includes(`${uses} ${uses===1?'use':'uses'} per game`));
    assert.match(text,/If they are a Werewolf, they die/);assert.match(text,/If not, you die/);
    assert.doesNotMatch(text,/holy|Police|Hypnotizer|Seer|Doctor/);
  }
});

test('Bodyguard explains the protected team, sacrifice and lack of team information',()=>{
  for(const any of [false,true]){
    const text=describe('bodyguard',{bodyguardProtectAll:any});
    assert.match(text,any?/a player from any team to protect/:/a village player to protect/);
    assert.match(text,/If they would die, you die instead/);
    assert.match(text,/Choosing a player does not show their team/);
    assert.doesNotMatch(text,/Doctor|Mayor|shield|revive/);
  }
});

test('Necromancer explains one dead target at night and follows the configured uses',()=>{
  for(const uses of [1,2,3]){
    const text=describe('necromancer',{necromancerUses:uses});
    assert.match(text,/At night, bring 1 dead player back to life/);
    assert.ok(text.includes(`${uses} ${uses===1?'use':'uses'} per game`));
    assert.doesNotMatch(text,/Doctor|Madman|Police|Hypnotizer|kill/);
    assert.equal(text.split('\n').length,3);
  }
});

test('Visitor shows only enabled personal dangers and included dangerous roles, with an accurate safe-night card',()=>{
  for(const dangerous of [false,true])for(const attacked of [false,true])for(const serial of [false,true])for(const safe of [false,true]){
    const settings={visitorDangerousRoles:dangerous,visitorAttackedTarget:attacked,firstNightSafe:safe};
    const context={matchRoles:[...roster,...(serial?['serialkiller']:[])]};
    const text=describe('visitor',settings,context);
    assert.match(text,/Each night, visit 1 player/);assert.match(text,/You can still die if someone attacks you/);
    assert.equal(text.includes('You die if you visit a Werewolf'),dangerous);
    assert.equal(text.includes('Serial Killer'),dangerous && serial);
    assert.equal(text.includes('You die if the player you visit is attacked'),attacked);
    assert.equal(text.includes('On the first night, visiting cannot kill you'),safe);
    assert.doesNotMatch(text,/Wolf Pup|Hypnotizer|Infecting|Police|Friends Maker|Serial Killer attacks/);
    const first=turnRoleDescription('visitor',{...defaults,...settings},1,0,context);
    if(safe){assert.match(first,/Visiting cannot kill you tonight/);assert.doesNotMatch(first,/You die if|Serial Killer|someone attacks you/);}
    const later=turnRoleDescription('visitor',{...defaults,...settings},2,0,context);
    assert.doesNotMatch(later,/first night|cannot kill you tonight/);
    assert.equal(later.includes('You die if you visit a Werewolf'),dangerous);
    assert.equal(later.includes('You die if the player you visit is attacked'),attacked);
  }
});

test('all five new cards respect both length limits, wait times and the player’s own Friends goal',()=>{
  for(const role of batch)for(const flag of [false,true])for(const uses of [1,3])for(const wait of [0,1,15]){
    const settings={firstNightSafe:flag,sheriffEveryNight:flag,templarUses:uses,necromancerUses:uses,bodyguardProtectAll:flag,visitorDangerousRoles:flag,visitorAttackedTarget:flag,roleWaitSeconds:{[role]:wait}};
    for(const night of [undefined,1,2]){
      const text=describe(role,settings,{night,hasFriend:flag,matchRoles:[...roster,'serialkiller','charmer']});
      assert.ok(descriptionFits(text),text);
      assert.match(text,flag?/You and your friend win/:/You win with the village/);
      if(wait)assert.match(text,new RegExp(`Wait ${wait} ${wait===1?'second':'seconds'} before ending your turn$`));
      assert.doesNotMatch(text,/\.\.\.|…|undefined|NaN/);
    }
  }
});
