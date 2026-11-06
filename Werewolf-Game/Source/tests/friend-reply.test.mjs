import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
let vite,React,ui,PrivateInfo;
before(async()=>{
  vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
  ({default:PrivateInfo}=await vite.ssrLoadModule('/src/PrivateInfo.tsx'));React=await import('react');ui=await import('@testing-library/react');
});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
const info={title:'PRIVATE MESSAGE',text:'Meet by the oak',replyTo:1,replyName:'Alex'};
const props={info,avatars:{},picture:()=>'',onClose:()=>{}};
test('reply can be sent once, then the composer disappears while the message stays open',()=>{
  const sent=[];let closed=0;
  ui.render(React.createElement(PrivateInfo,{...props,onReply:text=>sent.push(text),onClose:()=>closed++}));
  ui.fireEvent.change(ui.screen.getByLabelText('Your reply'),{target:{value:'  I agree  '}});
  const send=ui.screen.getByRole('button',{name:'SEND REPLY'});ui.fireEvent.click(send);ui.fireEvent.click(send);
  assert.deepEqual(sent,['I agree']);assert.equal(closed,0);
  assert.equal(ui.screen.queryByLabelText('Your reply'),null);assert.equal(ui.screen.queryByRole('button',{name:'SEND REPLY'}),null);
  assert.ok(ui.screen.getByText('Meet by the oak'));assert.ok(ui.screen.getByRole('status'));
  const close=ui.screen.getByRole('button',{name:'OK · HIDE RESULT'});assert.equal(document.activeElement,close);
  ui.fireEvent.click(close);assert.equal(closed,1);
});
test('empty replies cannot send or consume the reply allowance',()=>{
  const sent=[];ui.render(React.createElement(PrivateInfo,{...props,onReply:text=>sent.push(text)}));
  ui.fireEvent.change(ui.screen.getByLabelText('Your reply'),{target:{value:'   '}});
  assert.ok(ui.screen.getByRole('button',{name:'SEND REPLY'}).disabled);assert.deepEqual(sent,[]);
  ui.fireEvent.change(ui.screen.getByLabelText('Your reply'),{target:{value:'Ready'}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'SEND REPLY'}));assert.deepEqual(sent,['Ready']);
});
test('non-replyable messages never show a reply composer',()=>{
  ui.render(React.createElement(PrivateInfo,props));
  assert.ok(ui.screen.getByText('Meet by the oak'));assert.equal(ui.screen.queryByLabelText('Your reply'),null);
});
test('a distinct later message resets the local reply UI and clears the previous draft',()=>{
  const sent=[],onReply=text=>sent.push(text);
  const view=ui.render(React.createElement(PrivateInfo,{...props,onReply}));
  ui.fireEvent.change(ui.screen.getByLabelText('Your reply'),{target:{value:'First reply'}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'SEND REPLY'}));
  view.rerender(React.createElement(PrivateInfo,{...props,info:{...info,text:'A later night'},onReply}));
  assert.equal(ui.screen.getByLabelText('Your reply').value,'');assert.equal(ui.screen.queryByRole('status'),null);
  ui.fireEvent.change(ui.screen.getByLabelText('Your reply'),{target:{value:'Next reply'}});
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'SEND REPLY'}));assert.deepEqual(sent,['First reply','Next reply']);
});

test('private information is a native modal and Escape cannot acknowledge it',()=>{
 let closed=0;ui.render(React.createElement(PrivateInfo,{...props,onClose:()=>closed++}));const dialog=ui.screen.getByRole('dialog');assert.equal(dialog.tagName,'DIALOG');assert.ok(dialog.open);
 assert.equal(ui.fireEvent(dialog,new window.Event('cancel',{bubbles:true,cancelable:true})),false);assert.equal(closed,0);assert.ok(dialog.open);ui.fireEvent.click(ui.screen.getByRole('button',{name:'OK · HIDE RESULT'}));assert.equal(closed,1);
});
test('private Tab boundaries include the reply field, skip disabled send, and update after send',()=>{
 ui.render(React.createElement(PrivateInfo,{...props,onReply(){}}));const dialog=ui.screen.getByRole('dialog');for(const el of dialog.querySelectorAll('button,textarea'))el.getClientRects=()=>[{width:100,height:44}];
 const ok=ui.screen.getByRole('button',{name:'OK · HIDE RESULT'}),reply=ui.screen.getByLabelText('Your reply');assert.equal(document.activeElement,ok);ui.fireEvent.keyDown(ok,{key:'Tab'});assert.equal(document.activeElement,reply);ui.fireEvent.keyDown(reply,{key:'Tab',shiftKey:true});assert.equal(document.activeElement,ok);
 ui.fireEvent.change(reply,{target:{value:'Ready'}});ui.fireEvent.click(ui.screen.getByRole('button',{name:'SEND REPLY'}));assert.equal(document.activeElement,ok);ui.fireEvent.keyDown(ok,{key:'Tab'});assert.equal(document.activeElement,ok);assert.equal(ui.screen.queryByLabelText('Your reply'),null);
});
test('StrictMode private-modal setup never acknowledges or sends a message',()=>{
 let acknowledged=0,sent=0;ui.render(React.createElement(React.StrictMode,null,React.createElement(PrivateInfo,{...props,onClose:()=>acknowledged++,onReply:()=>sent++})));assert.equal(acknowledged,0);assert.equal(sent,0);assert.ok(ui.screen.getByRole('dialog').open);assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'OK · HIDE RESULT'}));
});
test('removing private information removes its text without acknowledging it',()=>{
 let closed=0;const view=ui.render(React.createElement(PrivateInfo,{...props,onClose:()=>closed++}));const dialog=ui.screen.getByRole('dialog');view.unmount();assert.equal(dialog.isConnected,false);assert.equal(ui.screen.queryByText(info.text),null);assert.equal(closed,0);
});
