import {before,after,afterEach,test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let shown=0,closed=0,callbacks=[],disconnected=0;
window.HTMLDialogElement.prototype.showModal=function(){shown++;this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){closed++;this.removeAttribute('open');};
window.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{width:100,height:44}];};
window.HTMLElement.prototype.getBoundingClientRect=function(){return{x:0,y:0,width:100,height:44,top:0,bottom:44,left:0,right:100};};
globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;callbacks.push(callback);}observe(){}disconnect(){disconnected++;}};
let vite,React,ui,useModalDialog,useFixedFooterSpace;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});({useModalDialog}=await vite.ssrLoadModule('/src/use-modal-dialog.ts'));({useFixedFooterSpace}=await vite.ssrLoadModule('/src/use-fixed-footer-space.ts'));React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>{ui.cleanup();document.body.replaceChildren();shown=0;closed=0;callbacks=[];disconnected=0;});after(async()=>{delete globalThis.ResizeObserver;await vite.close();dom.window.close();});
function Modal({active=true,view='first'}){const ref=React.useRef(null);useModalDialog(ref,active,view);return active?React.createElement('dialog',{ref},React.createElement('button',{key:view},view),React.createElement('input',{type:'range','aria-label':'chance'}),React.createElement('button',{disabled:true},'disabled'),React.createElement('input',{type:'hidden'}),React.createElement('label',{role:'button',tabIndex:0},'gallery')):null;}
function opener(){const button=document.createElement('button');button.textContent='open';document.body.append(button);button.focus();return button;}
function Footer({active=true,view=0}){const ref=React.useRef(null);useFixedFooterSpace(ref,active,view);return React.createElement('section',{'data-testid':'parent'},React.createElement('div',{ref,'data-testid':'footer'},'continue'));}

test('modal starts on the first control, wraps both Tab directions and ignores disabled/hidden inputs',()=>{
 opener();ui.render(React.createElement(Modal));const first=ui.screen.getByRole('button',{name:'first'}),last=ui.screen.getByRole('button',{name:'gallery'});
 assert.equal(shown,1);assert.equal(document.activeElement,first);assert.equal(ui.fireEvent.keyDown(first,{key:'Tab',shiftKey:true}),false);assert.equal(document.activeElement,last);
 assert.equal(ui.fireEvent.keyDown(last,{key:'Tab'}),false);assert.equal(document.activeElement,first);
});
test('ordinary navigation keys are not intercepted by the modal trap',()=>{
 ui.render(React.createElement(Modal));const range=ui.screen.getByRole('slider');range.focus();assert.equal(ui.fireEvent.keyDown(range,{key:'ArrowLeft'}),true);assert.equal(document.activeElement,range);
});
test('switching sheet content resets focus but retains the original opener',()=>{
 const open=opener();const view=ui.render(React.createElement(Modal));view.rerender(React.createElement(Modal,{view:'second'}));assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'second'}));assert.equal(shown,1);view.unmount();assert.equal(document.activeElement,open);
});
test('StrictMode does not close/reopen the native dialog or dispatch a stale close',()=>{
 const open=opener();const view=ui.render(React.createElement(React.StrictMode,null,React.createElement(Modal)));assert.equal(shown,1);assert.equal(closed,0);view.unmount();assert.equal(document.activeElement,open);assert.equal(closed,0);
});
test('deactivation restores focus, removes the trap, and a new activation captures its own opener',()=>{
 const first=opener(),view=ui.render(React.createElement(Modal));const old=ui.screen.getByRole('dialog');view.rerender(React.createElement(Modal,{active:false}));assert.equal(document.activeElement,first);assert.equal(ui.fireEvent.keyDown(old,{key:'Tab',shiftKey:true}),true);
 const second=opener();view.rerender(React.createElement(Modal));view.unmount();assert.equal(document.activeElement,second);
});
test('a removed opener is never focused during cleanup',()=>{
 const open=opener();const view=ui.render(React.createElement(Modal));open.remove();let focused=false;open.focus=()=>{focused=true;};view.unmount();assert.equal(focused,false);
});
test('footer reserves measured height, updates after resize and releases observers/styles',()=>{
 const view=ui.render(React.createElement(Footer)),parent=ui.screen.getByTestId('parent'),footer=ui.screen.getByTestId('footer');assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'44px');
 footer.getBoundingClientRect=()=>({height:100.2});ui.act(()=>callbacks.at(-1)());assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'101px');footer.getBoundingClientRect=()=>({height:125});ui.fireEvent(window,new window.Event('resize'));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'125px');
 const pending=callbacks.at(-1);view.unmount();assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'');assert.equal(disconnected,1);pending();assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'');
});
test('footer deactivation and view changes clean up before observing the current view',()=>{
 const view=ui.render(React.createElement(Footer)),parent=ui.screen.getByTestId('parent');view.rerender(React.createElement(Footer,{active:false}));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'');assert.equal(disconnected,1);
 view.rerender(React.createElement(Footer,{view:1}));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'44px');view.rerender(React.createElement(Footer,{view:2}));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'44px');assert.equal(disconnected,2);
});
test('footer fallback works without ResizeObserver and ignores zero-size measurements',()=>{
 const Observer=globalThis.ResizeObserver;delete globalThis.ResizeObserver;
 try{const view=ui.render(React.createElement(Footer)),footer=ui.screen.getByTestId('footer'),parent=ui.screen.getByTestId('parent');footer.getBoundingClientRect=()=>({height:0});ui.fireEvent(window,new window.Event('resize'));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'44px');footer.getBoundingClientRect=()=>({height:88});ui.fireEvent(window,new window.Event('resize'));assert.equal(parent.style.getPropertyValue('--fixed-footer-space'),'88px');view.unmount();}finally{globalThis.ResizeObserver=Observer;}
});
