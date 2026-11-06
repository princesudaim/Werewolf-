import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {normalizeMotionPreference} from '../src/motion-preferences.ts';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
window.PointerEvent=class extends window.MouseEvent{constructor(type,options={}){super(type,options);Object.defineProperties(this,{pointerId:{value:options.pointerId??1},isPrimary:{value:options.isPrimary??true}});}};
let vite,React,ui,HoldButton;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});({default:HoldButton}=await vite.ssrLoadModule('/src/HoldButton.tsx'));React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>{ui.cleanup();delete document.visibilityState;});after(async()=>{await vite.close();dom.window.close();});
function clock(){
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let time=0,id=0;const pending=new Map();
 globalThis.setTimeout=(callback,ms)=>{pending.set(++id,{callback,at:time+ms});return id;};globalThis.clearTimeout=id=>pending.delete(id);
 return {advance(ms){time+=ms;for(const [id,item]of [...pending].sort((a,b)=>a[1].at-b[1].at))if(item.at<=time && pending.has(id)){pending.delete(id);item.callback();}},restore(){globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;},pending};
}
function scenario(run){let count=0;const mounted=ui.render(React.createElement(HoldButton,{onComplete:()=>count++}));const button=ui.screen.getByRole('button',{name:'CONTINUE →'});button.getBoundingClientRect=()=>({left:0,top:0,right:200,bottom:50,width:200,height:50});const timer=clock();try{run({button,mounted,timer,count:()=>count,advance:ms=>ui.act(()=>timer.advance(ms))});}finally{ui.cleanup();timer.restore();}}
const down=(button,extra={})=>ui.fireEvent.pointerDown(button,{button:0,pointerId:1,isPrimary:true,...extra});

test('motion preference accepts only system/reduced; corrupt state and attempts to force full motion fall back safely',()=>{
 assert.equal(normalizeMotionPreference('reduced'),'reduced');assert.equal(normalizeMotionPreference('system'),'system');
 for(const v of [null,undefined,false,1,'full','fast',{role:'madman',motion:'full'},[]])assert.equal(normalizeMotionPreference(v),'system');
});
test('a plain click never bypasses the hold and the accessible instructions have a unique ID',()=>{
 scenario(({button,count})=>{ui.fireEvent.click(button);assert.equal(count(),0);assert.match(document.getElementById(button.getAttribute('aria-describedby')).textContent,/2 seconds/);});
 ui.render(React.createElement('div',null,React.createElement(HoldButton,{onComplete(){}}),React.createElement(HoldButton,{onComplete(){}})));const buttons=ui.screen.getAllByRole('button',{name:'CONTINUE →'});assert.notEqual(buttons[0].getAttribute('aria-describedby'),buttons[1].getAttribute('aria-describedby'));
});
for(const key of ['Enter',' '])test(`keyboard ${JSON.stringify(key)} needs the whole 2000 ms and completes once per gesture`,()=>scenario(({button,advance,count})=>{
 ui.fireEvent.keyDown(button,{key});assert.ok(button.classList.contains('holding'));assert.match(button.textContent,/release to cancel/);
 advance(1999);assert.equal(count(),0);advance(1);assert.equal(count(),1);
 ui.fireEvent.keyDown(button,{key,repeat:true});ui.fireEvent.keyDown(button,{key,repeat:false});advance(3000);assert.equal(count(),1);
 ui.fireEvent.keyUp(button,{key});ui.fireEvent.keyDown(button,{key});advance(2000);assert.equal(count(),2);
}));
test('releasing just before completion cancels instead of accumulating time',()=>scenario(({button,advance,count})=>{
 down(button);advance(1999);ui.fireEvent.pointerUp(button,{pointerId:1});advance(10);assert.equal(count(),0);down(button);advance(1000);assert.equal(count(),0);advance(1000);assert.equal(count(),1);
}));
for(const type of ['pointerCancel','lostPointerCapture'])test(`${type} cancels the matching gesture`,()=>scenario(({button,advance,count})=>{
 down(button);advance(400);ui.fireEvent[type](button,{pointerId:1});advance(2000);assert.equal(count(),0);assert.equal(button.classList.contains('holding'),false);
}));
test('a second finger and its release cannot restart or cancel the primary gesture',()=>scenario(({button,advance,count})=>{
 down(button);advance(500);down(button,{pointerId:2,isPrimary:false});ui.fireEvent.pointerUp(button,{pointerId:2});advance(1500);assert.equal(count(),1);
}));
test('mouse secondary buttons and repeat-only keydown cannot start a hold',()=>scenario(({button,advance,count})=>{
 down(button,{button:2});ui.fireEvent.keyDown(button,{key:'Enter',repeat:true});advance(3000);assert.equal(count(),0);assert.equal(button.classList.contains('holding'),false);
}));
test('moving away cancels captured touch, while a small movement remains intentional',()=>scenario(({button,advance,count})=>{
 down(button);ui.fireEvent.pointerMove(button,{pointerId:1,clientX:202,clientY:25});advance(1000);assert.equal(count(),0);assert.ok(button.classList.contains('holding'));
 ui.fireEvent.pointerMove(button,{pointerId:1,clientX:220,clientY:25});advance(2000);assert.equal(count(),0);assert.equal(button.classList.contains('holding'),false);
}));
test('unrelated pointer or key releases do not cancel a keyboard hold',()=>scenario(({button,advance,count})=>{
 ui.fireEvent.keyDown(button,{key:'Enter'});ui.fireEvent.keyUp(button,{key:' '});ui.fireEvent.pointerCancel(button,{pointerId:1});advance(2000);assert.equal(count(),1);
}));
for(const cause of ['blur','pagehide','hidden'])test(`${cause} cancels a hold; returning does not restart it`,()=>scenario(({button,advance,count})=>{
 down(button);advance(700);
 if(cause==='hidden'){Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});ui.fireEvent(document,new window.Event('visibilitychange'));}
 else ui.fireEvent(window,new window.Event(cause));
 advance(3000);assert.equal(count(),0);assert.equal(button.classList.contains('holding'),false);
 delete document.visibilityState;ui.fireEvent(window,new window.Event('pageshow'));advance(2000);assert.equal(count(),0);
 down(button);advance(2000);assert.equal(count(),1);
}));
test('loss of button focus cancels immediately',()=>scenario(({button,advance,count})=>{ui.fireEvent.keyDown(button,{key:'Enter'});ui.fireEvent.blur(button);advance(3000);assert.equal(count(),0);}));
test('the final timer check refuses a hidden document even if no lifecycle event arrived',()=>scenario(({button,advance,count})=>{
 down(button);Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});advance(2000);assert.equal(count(),0);down(button);assert.equal(button.classList.contains('holding'),false);
}));
test('a rejected pointer capture is optional and a normal release still cancels',()=>scenario(({button,advance,count})=>{
 button.setPointerCapture=()=>{throw Error('unsupported');};assert.doesNotThrow(()=>down(button));advance(500);ui.fireEvent.pointerUp(button,{pointerId:1});advance(3000);assert.equal(count(),0);
}));
test('unmount cleans its pending timer and window listeners',()=>scenario(({button,mounted,advance,count,timer})=>{
 down(button);mounted.unmount();assert.equal(timer.pending.size,0);advance(3000);ui.fireEvent(window,new window.Event('pagehide'));assert.equal(count(),0);
}));
test('an unrelated rerender keeps progress but uses the current completion callback',()=>scenario(({button,mounted,advance,count})=>{
 let current=0;down(button);advance(1000);mounted.rerender(React.createElement(HoldButton,{onComplete:()=>current++}));advance(1000);assert.equal(count(),0);assert.equal(current,1);
}));
test('leaving the button also cancels when capture is unavailable',()=>scenario(({button,advance,count})=>{
 button.setPointerCapture=()=>{throw Error('unavailable');};down(button);ui.fireEvent.pointerOut(button,{pointerId:1,relatedTarget:document.body});advance(3000);assert.equal(count(),0);
}));

test('disabled morning safeguard cannot start, cancels an existing hold, and re-enables without resuming progress',()=>scenario(({button,mounted,advance,count})=>{
 down(button);advance(1000);mounted.rerender(React.createElement(HoldButton,{onComplete:()=>{},disabled:true,className:'morning-ok',describedBy:'morning-next-step'}));assert.equal(button.disabled,true);advance(2000);assert.equal(count(),0);assert.equal(button.classList.contains('holding'),false);ui.fireEvent.keyDown(button,{key:'Enter'});advance(2000);assert.equal(button.classList.contains('holding'),false);
 let done=0;mounted.rerender(React.createElement(HoldButton,{onComplete:()=>done++,className:'morning-ok',describedBy:'morning-next-step'}));assert.ok(button.classList.contains('morning-ok'));assert.ok(button.getAttribute('aria-describedby').includes('morning-next-step'));down(button);advance(1999);assert.equal(done,0);advance(1);assert.equal(done,1);
}));
