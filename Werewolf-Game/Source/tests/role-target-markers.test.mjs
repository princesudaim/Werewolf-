import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {roles} from '../src/werewolf-engine.ts';
import {ROLE_TARGET_MARKERS} from '../src/role-target-markers.ts';
test('every role has a distinct marker; Doctor cross and original Werewolf claw',()=>{
 assert.deepEqual(Object.keys(ROLE_TARGET_MARKERS).sort(),Object.keys(roles).sort());
 assert.equal(new Set(Object.values(ROLE_TARGET_MARKERS)).size,Object.keys(roles).length);
 assert.equal(ROLE_TARGET_MARKERS.doctor,'Cross');assert.equal(ROLE_TARGET_MARKERS.werewolf,'Claw');
});
test('only dedicated button fallback files get exact 3x PCM boost; original scene files unchanged',()=>{
 const catalog=JSON.parse(readFileSync('src/button-audio-catalog.json')),old=JSON.parse(readFileSync('src/audio-catalog.json')),sw=readFileSync('public/sw.js','utf8');
 assert.equal(Object.keys(catalog.cues).length,8);
 for(const [key,cue] of Object.entries(catalog.cues)){
  const bytes=readFileSync('public/'+cue.file.slice(2)),original=readFileSync('public/'+old.cues[key].file.slice(2));
  assert.equal(createHash('sha256').update(original).digest('hex'),cue.source_sha256);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),cue.sha256);assert.equal(bytes.length,original.length);
  for(let i=44;i<bytes.length;i+=2){assert.equal(bytes.readInt16LE(i),original.readInt16LE(i)*3);assert.ok(Math.abs(bytes.readInt16LE(i))<32767);}
  assert.ok(cue.peak<.34);assert.ok(sw.includes(cue.file.slice(2)));
 }
});
