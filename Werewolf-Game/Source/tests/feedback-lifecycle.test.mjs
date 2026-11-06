import {test,before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,useGameFeedback;const notes=[],vibrations=[],contexts=[];let suspended=false,resolveResume;
class Context {
 constructor(){this.state=suspended?'suspended':'running';this.currentTime=0;this.destination={};this.closed=0;contexts.push(this);}
 createOscillator(){let frequency;return {frequency:{setValueAtTime(v){frequency=v;},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){notes.push(frequency);},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 resume(){return new Promise(resolve=>{resolveResume=resolve;});}suspend(){return Promise.resolve();}close(){this.closed++;return Promise.resolve();}
}
before(async()=>{
 vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
 ({useGameFeedback}=await vite.ssrLoadModule('/src/interaction-feedback.ts'));React=await import('react');ui=await import('@testing-library/react');
 Object.defineProperty(window,'AudioContext',{configurable:true,value:Context});Object.defineProperty(window.navigator,'vibrate',{configurable:true,value:n=>{vibrations.push(n);return true;}});
});
afterEach(()=>{ui.cleanup();notes.length=0;vibrations.length=0;contexts.length=0;suspended=false;resolveResume=undefined;});
after(async()=>{await vite.close();dom.window.close();});
function Harness({privateInteraction=false,navigate=false,enabled=true}){
 const [scene,setScene]=React.useState('first');
 useGameFeedback({reveal:{enabled:false,volume:50},revealTurnKey:"fixture",ambienceVolume:45,effectsVolume:50,hapticIntensity:'gentle',sounds:false,buttonSounds:enabled,haptics:enabled,scene:{key:scene,screen:'home',side:null,hasDeaths:false,hasVictim:false,hasMvp:false,seconds:0},privateInteraction,sceneKey:scene});
 return React.createElement('main',{className:'app'},React.createElement('button',{'data-feedback':'confirm',onClick:()=>navigate&&setScene('next')},'Choose'));
}
test('React StrictMode installs one listener set and unmount releases it and all prepared AudioContexts',()=>{
 ui.render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
 ui.fireEvent.click(ui.screen.getByRole('button',{name:'Choose'}));assert.deepEqual(notes,[330]);assert.deepEqual(vibrations.filter(n=>n>0),[8]);assert.ok(contexts.length>=2,'phase buffers prepare before interaction; button effects still get only one audible trigger');
 ui.cleanup();assert.ok(contexts.every(context=>context.closed===1));
 const main=document.createElement('main');main.className='app';const button=document.createElement('button');main.append(button);document.body.append(main);ui.fireEvent.click(button);assert.equal(notes.length,1);main.remove();
});
test('private scope normalizes an explicitly tagged public confirmation',()=>{
 ui.render(React.createElement(Harness,{privateInteraction:true}));ui.fireEvent.click(ui.screen.getByRole('button',{name:'Choose'}));assert.deepEqual(notes,[220]);assert.deepEqual(vibrations,[8]);
});
test('navigation cancels a queued resume in the hook, rather than sounding on the next screen',async()=>{
 suspended=true;ui.render(React.createElement(Harness,{navigate:true}));ui.fireEvent.click(ui.screen.getByRole('button',{name:'Choose'}));assert.equal(notes.length,0);assert.equal(typeof resolveResume,'function');
 await ui.act(async()=>{resolveResume();await Promise.resolve();});assert.equal(notes.length,0);
});
test('changing preferences and unmounting both cancel pending audio safely',async()=>{
 suspended=true;const mounted=ui.render(React.createElement(Harness));ui.fireEvent.click(ui.screen.getByRole('button',{name:'Choose'}));const resolve=resolveResume;
 mounted.rerender(React.createElement(Harness,{enabled:false}));await ui.act(async()=>{resolve();await Promise.resolve();});assert.equal(notes.length,0);assert.equal(vibrations.at(-1),0);
 mounted.rerender(React.createElement(Harness));ui.fireEvent.click(ui.screen.getByRole('button',{name:'Choose'}));const later=resolveResume;ui.cleanup();await ui.act(async()=>{later();await Promise.resolve();});assert.equal(notes.length,0);
});
