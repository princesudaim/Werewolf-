import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDiscussionMinutes,discussionTimeLabel} from '../src/discussion-settings.ts';
import {defaults} from '../src/werewolf-engine.ts';
test('new discussion defaults are one minute with manual controls on',()=>{assert.equal(defaults.discussionMinutes,1);assert.equal(defaults.manualDiscussionControls,true);});
for(const [value,expected]of [[0,0.5],[-1,0.5],[0.5,0.5],[1,1],[1.2,1],[1.5,1.5],[2,2],[2.5,2.5],[3,3],[15,3],[NaN,1],[Infinity,1],['2',1],[null,1],[undefined,1]])test('discussion preference normalizes '+String(value),()=>assert.equal(normalizeDiscussionMinutes(value),expected));
test('all six slider stops have understandable text',()=>{assert.deepEqual([30,60,90,120,150,180].map(discussionTimeLabel),['30 seconds','1 minute','1 minute 30 seconds','2 minutes','2 minutes 30 seconds','3 minutes']);});
