import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://game.test/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,RecoveryStatus;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});({RecoveryStatus}=await vite.ssrLoadModule('/src/RecoveryControls.tsx'));React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
test('Settings keeps ranking retry available even when match recovery is off',()=>{
 let retries=0;const recovery={view:{active:false,enabled:false,notice:'',savedAt:0},retryScore:()=>retries++};
 const {rerender}=ui.render(React.createElement(RecoveryStatus,{recovery,scoreError:false}));assert.equal(document.querySelector('.recovery-status'),null);
 rerender(React.createElement(RecoveryStatus,{recovery,scoreError:true}));ui.fireEvent.click(ui.screen.getByRole('button',{name:'RETRY SAVING RANKINGS'}));assert.equal(retries,1);assert.equal(ui.screen.queryByRole('button',{name:'TURN OFF RECOVERY'}),null);
});
