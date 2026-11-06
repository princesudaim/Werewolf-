import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { roles } from '../src/werewolf-engine.ts';

test('every implemented role has its own artwork and is cached for offline play', () => {
  const worker=readFileSync('public/sw.js','utf8');
  for(const [id,role] of Object.entries(roles)) {
    const path=`werewolf/${id}.webp`;
    assert.ok(statSync(`public/${path}`).size>0,`${role.name}: missing artwork`);
    assert.ok(worker.includes(`"${path}"`),`${role.name}: missing offline cache entry`);
  }
});

test('short effect sounds remain available offline',()=>{
  const worker=readFileSync('public/sw.js','utf8');
  for(const phase of ['start','mvp','win-village','tap']) {
    const path=`werewolf/audio/v3/cues-${phase}.wav`;
    assert.ok(statSync(`public/${path}`).size>0);
    assert.ok(worker.includes(`"${path}"`));
  }
});

test('all Celebrity skin artwork is included for offline play',()=>{
 const worker=readFileSync('public/sw.js','utf8');
 for(const name of ['celebrity-new.webp','celebrity-spotlight.webp','celebrity-gala.webp']){
  assert.ok(existsSync(`public/werewolf/${name}`));assert.ok(worker.includes(`"werewolf/${name}"`));
 }
});

test('all Friends Maker skin artwork is included for offline play',()=>{
 const worker=readFileSync('public/sw.js','utf8');
 for(const name of ['charmer-new.webp','charmer-moonlight.webp','charmer-starlight.webp','charmer-sapphire.webp','charmer-sunrise.webp']){
  assert.ok(existsSync(`public/werewolf/${name}`));assert.ok(worker.includes(`"werewolf/${name}"`));
 }
});

test('remaining new character portraits are distinct, selectable and cached offline',async()=>{
 const {avatarFiles}=await import('../src/avatar-assignment.ts');
 const worker=readFileSync('public/sw.js','utf8');
 const contents=[];
 for(const id of [20,21,23,24]){
  const path=`werewolf/avatars/player${id}.webp`,data=readFileSync(`public/${path}`);
  assert.ok(data.length>1000);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.ok(avatarFiles.includes(`./${path}`));assert.ok(worker.includes(`"${path}"`));contents.push(data.toString('base64'));
 }
 assert.equal(new Set(contents).size,4);
});

test('the offline tap sound is available when Web Audio is not supported',()=>{
 const worker=readFileSync('public/sw.js','utf8');const path='werewolf/audio/v3/cues-tap.wav';
 assert.ok(statSync(`public/${path}`).size>1000);assert.ok(worker.includes(`"${path}"`));
 assert.equal(readFileSync(`public/${path}`).toString('ascii',0,4),'RIFF');
});

test('removed avatar 18 is now a cached Friends Maker skin',async()=>{
 const {createHash}=await import('node:crypto');const {avatarFiles,resolveAvatar}=await import('../src/avatar-assignment.ts');
 assert.ok(!avatarFiles.some(p=>p.includes('player22')));
 assert.equal(resolveAvatar('./werewolf/avatars/player22.webp'),'');assert.equal(resolveAvatar('./werewolf/avatars/player22-covered.webp'),'');
 assert.equal(createHash('sha256').update(readFileSync('public/werewolf/charmer-sunrise.webp')).digest('hex'),'2f52d0196214ae54ef36dac2d0b22971d65a471e267103c071c2e723a7991de7');
});
