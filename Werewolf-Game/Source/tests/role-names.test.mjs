import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roles,defaults,roleDescription,seerReading} from '../src/werewolf-engine.ts';
import {rolePicture,CHARMER_SKIN_KEY} from '../src/role-skins.ts';

test('renamed display names keep the original role IDs and teams',()=>{
  assert.equal(roles.charmer.name,'Friends Maker');assert.equal(roles.charmer.team,'neutral');
  assert.equal(roles.hypnowolf.name,'Hypnotizer Wolf');assert.equal(roles.hypnowolf.team,'wolf');
  assert.equal(roles.journalist.name,'News Maker');assert.equal(roles.journalist.team,'village');
  assert.equal(Object.keys(roles).length,35);
});
test('renamed roles preserve artwork paths and stored preference keys',()=>{
  assert.equal(rolePicture('charmer','default'),'./werewolf/charmer-new.webp');
  assert.equal(rolePicture('hypnowolf','default'),'./werewolf/hypnowolf.webp');
  assert.equal(rolePicture('journalist','default'),'./werewolf/journalist.webp');
  assert.equal(CHARMER_SKIN_KEY,'werewolf.charmerSkin');
  assert.equal(typeof defaults.charmerMessages,'boolean');
});
test('investigations and descriptions use the updated names',()=>{
  for(const role of ['charmer','hypnowolf','journalist'])assert.equal(seerReading(role),roles[role].name);
  assert.match(roleDescription('wolfpup',defaults),/Hypnotizer Wolf/);
  assert.match(roleDescription('lonewolf',defaults),/Friends Maker/);
});
test('active rulebook, role names and role-settings strings have no old display names',()=>{
  for(const file of ['src/werewolf-engine.ts','src/Werewolf.tsx','src/RoleDetails.tsx']){
    assert.doesNotMatch(readFileSync(file,'utf8'),/\b(Charmer|Hypnosis Wolf|Journalist)\b/);
  }
});
