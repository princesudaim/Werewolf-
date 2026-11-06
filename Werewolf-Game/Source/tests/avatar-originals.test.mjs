import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {avatarFiles,resolveAvatar,assignAvatar,normalizeAvatars} from '../src/avatar-assignment.ts';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/avatar-original-hashes.json',import.meta.url)));
const publicPath=name=>new URL('../public/'+name,import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('seven original attachments occupy exactly the requested displayed slots, byte-for-byte',()=>{
 assert.equal(avatarFiles.length,19);assert.equal(new Set(avatarFiles).size,19);
 assert.deepEqual(fixture.replacements.map(i=>i.position),[1,2,3,5,6,7,8]);
 for(const item of fixture.replacements){
  assert.equal(avatarFiles[item.position-1],item.path);
  const bytes=readFileSync(publicPath(item.path));assert.equal(bytes.length,item.bytes);assert.equal(hash(bytes),item.sha256);
  assert.equal(existsSync(publicPath(item.old)),false);
 }
 assert.deepEqual(readdirSync(publicPath('werewolf/avatars')).sort(),avatarFiles.map(p=>p.split('/').pop()).sort());
});
test('all twelve other avatars, including displayed number four, remain unchanged',()=>{
 assert.equal(avatarFiles[3],'./werewolf/avatars/player4.webp');
 assert.equal(Object.keys(fixture.preserved).length,12);
 for(const [name,sha] of Object.entries(fixture.preserved)){assert.equal(hash(readFileSync(publicPath(name))),sha);assert.ok(avatarFiles.includes('./'+name));}
});
test('saved relative, root and project-subpath legacy portraits resolve to their replacement',()=>{
 for(const i of fixture.replacements)for(const path of [i.old,i.old.slice(1),'/Werewolf-/'+i.old.slice(2)+'?v=old#portrait','https://example.org/Werewolf-/'+i.old.slice(2)])assert.equal(resolveAvatar(path),i.path);
 for(const value of ['', 'data:image/png;base64,AAAA','./werewolf/avatars/player4.webp','blob:custom-image','constructor','toString'])assert.equal(resolveAvatar(value),value);
 assert.equal(resolveAvatar('./werewolf/avatars/player22.webp'),'');
});
test('recovered rosters migrate without changing names or custom photos and repair aliases before uniqueness',()=>{
 const i=fixture.replacements[0],input={a:i.old,b:i.path,c:'data:image/png;base64,AAAA'};
 const fixed=normalizeAvatars(['A','B','C'],input,()=>0);
 assert.equal(fixed.migrated,true);assert.equal(fixed.avatars.a,i.path);assert.notEqual(fixed.avatars.b,i.path);assert.equal(fixed.avatars.c,input.c);assert.deepEqual(fixed.changed,['B']);assert.equal(input.a,i.old);
 const transfer=assignAvatar(['A','B'],{a:i.old},'B',i.path,()=>0);assert.deepEqual(transfer.displaced,['A']);assert.equal(transfer.avatars.b,i.path);assert.notEqual(transfer.avatars.a,i.path);
});
test('offline worker contains the seven new originals and none of their removed aliases',()=>{
 const sw=readFileSync(publicPath('sw.js'),'utf8');
 for(const i of fixture.replacements){assert.ok(sw.includes('"'+i.path.slice(2)+'"'));assert.ok(!sw.includes('"'+i.old.slice(2)+'"'));}
});
