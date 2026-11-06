import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(readFileSync('src/ballot-audio-catalog.json','utf8'));
const sources={'enderman.mp3':'a320295f09f67311cca26de951bb997d','notifi.mp3':'626224ccc787b9538506cf5e9596432b','enemy.mp3':'2f98710c373e5fe93048a761ee75e6f0'};
test('the three requested Drive vote sounds are processed, balanced, safe and precached',()=>{
 assert.equal(Object.keys(catalog.cues).length,3);const sw=readFileSync('public/sw.js','utf8');
 for(const clip of Object.values(catalog.cues)){
  assert.equal(clip.source_md5,sources[clip.source]);const data=readFileSync('public/'+clip.file.slice(2));assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);assert.equal(data.length,clip.bytes);
  assert.equal(data.readUInt32LE(24),48000);assert.equal(data.readUInt16LE(22),2);assert.equal(data.readUInt16LE(34),16);assert.equal((data.length-44)/4,clip.frames);assert.equal(clip.frames+clip.leading_frames_removed,clip.source_frames);assert.equal(clip.seconds,clip.frames/48000);assert.ok(clip.seconds>0&&clip.seconds<2);
  assert.equal(clip.playback_offset_seconds,0);assert.equal(clip.loop,false);assert.ok(clip.true_peak_db<=-1);assert.ok(Math.abs(clip.output_stats.active_p90+14)<.08);assert.ok(sw.includes(JSON.stringify(clip.file.slice(2))));
  for(let i=44;i<data.length;i+=2)assert.ok(Math.abs(data.readInt16LE(i))<32760,'PCM must not clip');
 }
});
