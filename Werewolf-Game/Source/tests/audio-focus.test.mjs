import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioFocus} from '../src/audio-focus.ts';
function fixture(){
 const ports=[],messages=[];
 const open=()=>{const p={onmessage:null,postMessage(data){messages.push(data);for(const other of ports)if(other!==p&&!other.closed)other.onmessage?.({data});},close(){this.closed=true;}};ports.push(p);return p;};
 return {open,ports,messages};
}
test('only one cooperating game copy owns audio; tapping another transfers ownership without storage or match data',()=>{
 const f=fixture(),a=[],b=[];const first=new AudioFocus(f.open,'one',v=>a.push(v)),second=new AudioFocus(f.open,'two',v=>b.push(v));
 first.claim();assert.equal(first.ownsAudio,true);second.claim();assert.equal(first.ownsAudio,false);assert.equal(second.ownsAudio,true);assert.deepEqual(a,[true,false]);first.claim();assert.equal(second.ownsAudio,false);assert.equal(first.ownsAudio,true);
 for(const message of f.messages)assert.deepEqual(Object.keys(message).sort(),['id','type']);first.dispose();second.dispose();
});
test('repeated same-owner taps do not spam claims or reset playback',()=>{const f=fixture();let changed=0;const a=new AudioFocus(f.open,'one',()=>changed++);for(let i=0;i<100;i++)a.claim();assert.equal(f.messages.length,1);assert.equal(changed,1);a.dispose();});
test('unrelated/own channel messages cannot silence audio; unmount closes listeners',()=>{const f=fixture();const a=new AudioFocus(f.open,'one',()=>{});a.claim();for(const data of [null,{},'noise',{type:'claim',id:33},{type:'claim',id:'one'},{type:'other',id:'two'}])f.ports[0].onmessage({data});assert.equal(a.ownsAudio,true);a.dispose();assert.equal(f.ports[0].closed,true);assert.equal(f.ports[0].onmessage,null);a.claim();assert.equal(a.ownsAudio,false);});
test('unsupported BroadcastChannel remains a functional single-copy player',()=>{const a=new AudioFocus(()=>{throw Error('unsupported');},'one',()=>{});assert.doesNotThrow(()=>a.claim());assert.equal(a.ownsAudio,true);a.dispose();});
