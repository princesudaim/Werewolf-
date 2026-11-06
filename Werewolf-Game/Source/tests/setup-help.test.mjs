import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,help;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});help=await vite.ssrLoadModule('/src/SetupHelp.tsx');React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
for(const [selected,expected] of [[0,'Add 4 more roles.'],[3,'Add 1 more role.'],[4,'Role count matches.'],[5,'Remove 1 role.'],[8,'Remove 4 roles.']])test(`public role count ${selected}/4 explains count only, not validity`,()=>{
 ui.render(React.createElement(help.RoleCountHelp,{selected,players:4}));const status=ui.screen.getByRole('status');assert.equal(status.id,'role-count-help');assert.equal(status.textContent,expected);assert.doesNotMatch(status.textContent,/valid|balanced|ready/i);
});
for(const [count,expected] of [[0,'Add 4 more players.'],[3,'Add 1 more player.'],[4,'Next: choose one role per player.']])test(`public player count ${count} explains next step`,()=>{
 ui.render(React.createElement(help.PlayerCountHelp,{count}));const status=ui.screen.getByRole('status');assert.equal(status.id,'player-count-help');assert.equal(status.textContent,expected);
});
for(const unique of [false,true])test(`random help reflects unique setting ${unique} without changing it`,()=>{
 ui.render(React.createElement(help.RandomPickHelp,{unique}));const text=document.body.textContent;assert.match(text,unique ? /do not repeat a role or pick one you added/ : /can repeat a role/);assert.match(text,/fewer than half/);assert.equal(document.querySelector('input,button'),null);
});
test('removed setup guide is not exported',()=>{assert.equal(help.RoleSetupHelp,undefined);});
test('how to play distinguishes basic winning from special goals and public reference from secrets',()=>{
 ui.render(React.createElement(help.HowToPlay));assert.equal(ui.screen.getAllByRole('heading',{level:3}).length,6);assert.match(document.body.textContent,/Other roles and Friends can change/);assert.match(document.body.textContent,/never shows who has a role/);assert.match(document.body.textContent,/does not pause/);assert.match(document.body.textContent,/do not restore an unfinished game/);assert.doesNotMatch(document.body.textContent,/reconstruction|not yet implemented/);
});

for(const deleteMode of [false,true])test(`roster omits the removed editing paragraph, delete=${deleteMode}`,()=>{
 ui.render(React.createElement(help.RosterHelp,{deleteMode}));
 assert.doesNotMatch(document.body.textContent,/Tap a player|RANDOM adds a name/);
 assert.equal(!!document.querySelector('.setup-guidance'),deleteMode);
 if(deleteMode)assert.match(document.body.textContent,/keeps their saved library profile/);
});
