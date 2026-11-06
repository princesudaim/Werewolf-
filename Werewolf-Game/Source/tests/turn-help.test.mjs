import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,TurnHelp;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});({default:TurnHelp}=await vite.ssrLoadModule('/src/TurnHelp.tsx'));React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
for(const [reason,expected] of [
 ['shot-used','Your shot has already been used. Choose SKIP to finish your turn.'],
 ['revivals-used','No revivals left. Choose SKIP to finish your turn.'],
 ['no-revival','No dead player is available to revive. Choose SKIP to finish your turn.'],
 ['marks-used','No vote marks left. Choose SKIP to finish your turn.'],
 ['no-creatures','No tiny creatures left. You can skip and try to get one.'],
 ['no-regeneration','No tiny creatures left. Regeneration is off; use the skip button to finish your turn.'],
])test(`turn guidance ${reason} is plain text, not a new action or outcome announcement`,()=>{
 ui.render(React.createElement(TurnHelp,{reason}));assert.equal(document.querySelector('.turn-help').textContent,expected);assert.equal(document.querySelector('button,input,[tabindex],[aria-live],[role="status"],[role="alert"]'),null);assert.doesNotMatch(document.body.textContent,/Police|blocked|successful|protected|Madman|hypnotized|saved you/i);
});
