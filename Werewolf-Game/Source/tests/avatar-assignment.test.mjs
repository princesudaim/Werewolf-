import test from 'node:test';
import assert from 'node:assert/strict';
import { assignAvatar, normalizeAvatars, avatarFiles } from '../src/avatar-assignment.ts';

test('selecting an occupied avatar transfers it and replaces the old owner with an unused one',()=>{
  const before={alice:avatarFiles[0], bob:avatarFiles[1], cara:avatarFiles[2]};
  const result=assignAvatar(['Alice','Bob','Cara'],before,'Bob',avatarFiles[0],()=>0);
  assert.equal(result.avatars.bob,avatarFiles[0]);
  assert.equal(result.avatars.alice,avatarFiles[1]);
  assert.equal(result.avatars.cara,avatarFiles[2]);
  assert.deepEqual(result.displaced,['Alice']);
  assert.deepEqual(result.unassigned,[]);
  assert.equal(before.alice,avatarFiles[0]);
});
test('library additions can transfer a custom photo without reusing an occupied built-in',()=>{
  const result=assignAvatar(['Alice','Bob','Cara'],{alice:'data:image/custom',bob:avatarFiles[0]},'Cara','data:image/custom',()=>0);
  assert.equal(result.avatars.cara,'data:image/custom');
  assert.equal(result.avatars.alice,avatarFiles[1]);
});
test('when all built-ins are used the displaced player falls back to initials',()=>{
  const names=avatarFiles.map((_,i)=>`P${i}`); const current=Object.fromEntries(names.map((n,i)=>[n.toLowerCase(),avatarFiles[i]]));
  const result=assignAvatar([...names,'New'],current,'New',avatarFiles[0],()=>0);
  assert.equal(result.avatars.new,avatarFiles[0]); assert.equal(result.avatars.p0,undefined);
  assert.deepEqual(result.unassigned,['P0']);
});
test('old duplicate avatars are repaired while keeping all current assignments unique',()=>{
  const fixed=normalizeAvatars(['A','B','C'],{a:avatarFiles[0],b:avatarFiles[0],c:avatarFiles[1]},()=>0);
  assert.equal(fixed.avatars.a,avatarFiles[0]); assert.equal(fixed.avatars.b,avatarFiles[2]); assert.equal(fixed.avatars.c,avatarFiles[1]);
  assert.deepEqual(fixed.changed,['B']);
});
test('selecting no image does not take other players avatars',()=>{
  const result=assignAvatar(['A','B'],{a:avatarFiles[0],b:avatarFiles[1]},'B','');
  assert.equal(result.avatars.a,avatarFiles[0]); assert.equal(result.avatars.b,undefined); assert.deepEqual(result.displaced,[]);
});
