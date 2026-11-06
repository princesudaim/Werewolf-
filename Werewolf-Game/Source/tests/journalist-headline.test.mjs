import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,Editor,limit;
before(async()=>{
  vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
  ({default:Editor,limitHeadlineCharacters:limit}=await vite.ssrLoadModule('/src/JournalistEditor.tsx'));
  React=await import('react');ui=await import('@testing-library/react');
});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
const ten='helloooooo';
function setup(){let paper;ui.render(React.createElement(Editor,{allowDrawing:false,onSubmit:value=>{paper=value;}}));return {input:ui.screen.getByPlaceholderText('Write a headline'),paper:()=>paper};}
test('character limit caps a single long word as well as multiple words and spaces',()=>{
  assert.equal(limit(''), '');
  assert.equal(limit(ten),ten);
  assert.equal(limit(ten+'oooo'),ten);
  assert.equal(limit('one two three four'),'one two th');
  assert.equal(limit('  1234567890'),'  12345678');
});
test('ten-character headline shows its limit and publishes unchanged',()=>{
  const form=setup();ui.fireEvent.change(form.input,{target:{value:ten}});
  assert.ok(ui.screen.getByText('10 / 10 characters · Limit reached'));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'PUBLISH IN THE MORNING'}));
  assert.deepEqual(form.paper(),{headline:ten,drawing:''});
});
test('an eleventh character is rejected; replacing and deleting still work',()=>{
  const form=setup();ui.fireEvent.change(form.input,{target:{value:ten}});
  ui.fireEvent.change(form.input,{target:{value:ten+'o'}});assert.equal(form.input.value,ten);
  ui.fireEvent.change(form.input,{target:{value:'Edited'}});assert.ok(ui.screen.getByText('6 / 10 characters'));
  ui.fireEvent.change(form.input,{target:{value:''}});assert.ok(ui.screen.getByText('0 / 10 characters'));
});
test('pasting a long headline retains and publishes only its first ten characters',()=>{
  const form=setup();ui.fireEvent.change(form.input,{target:{value:'A very long headline'}});
  assert.equal(form.input.value,'A very lon');
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'PUBLISH IN THE MORNING'}));assert.equal(form.paper().headline,'A very lon');
});
test('Unicode characters count without breaking emoji surrogate pairs',()=>{
  const form=setup(),value='😀'.repeat(11);
  ui.fireEvent.change(form.input,{target:{value}});
  assert.equal(form.input.value,'😀'.repeat(10));
  assert.ok(ui.screen.getByText('10 / 10 characters · Limit reached'));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'PUBLISH IN THE MORNING'}));assert.equal(form.paper().headline,'😀'.repeat(10));
});
test('spaces and punctuation count; skipping discards the headline',()=>{
  const form=setup();ui.fireEvent.change(form.input,{target:{value:'Hi there!'}});
  assert.ok(ui.screen.getByText('9 / 10 characters'));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'SKIP NEWSPAPER'}));assert.deepEqual(form.paper(),{headline:'',drawing:''});
});
