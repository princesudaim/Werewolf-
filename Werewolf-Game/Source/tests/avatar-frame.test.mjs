import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {avatarFiles} from '../src/avatar-assignment.ts';

const css=readFileSync(new URL('../src/werewolf.css',import.meta.url),'utf8');
const frameCss=css.slice(css.indexOf('/* Avatar portraits need a real beveled frame:'));

test('every built-in avatar is available and uses the shared frame rules',()=>{
 assert.ok(avatarFiles.length>0);
 for(const src of avatarFiles)assert.ok(existsSync(new URL(`../public/${src.replace(/^\.\//,'')}`,import.meta.url)),src);
 for(const selector of ['.player-pass .pass-avatar','.voter-avatar','.private-info-avatar']){
  assert.ok(frameCss.includes(selector),selector);
  assert.ok(frameCss.includes(`${selector} img`),selector+' image');
  assert.ok(frameCss.includes(`${selector}::before`),selector+' initials background');
 }
 assert.match(frameCss,/inset:2px/);assert.match(frameCss,/width:calc\(100% - 4px\)/);
 assert.match(frameCss,/\.avatar-sheet \.avatar-grid button\.chosen\{background:#ff8a25\}/);
 assert.match(frameCss,/\.avatar-sheet \.avatar-grid button img\{[^}]*clip-path/);
});
