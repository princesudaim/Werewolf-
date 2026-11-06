import {before,after,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite,React,ui,SetupSettings,defaults;
before(async()=>{vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});({default:SetupSettings}=await vite.ssrLoadModule('/src/SetupSettings.tsx'));({defaults}=await vite.ssrLoadModule('/src/werewolf-engine.ts'));React=await import('react');ui=await import('@testing-library/react');});
afterEach(()=>ui.cleanup());after(async()=>{await vite.close();dom.window.close();});
function mount(overrides={}) {
 const calls=[];const props={settings:Object.freeze({...defaults}),distributionOpen:false,onSetting:(...args)=>calls.push(['setting',...args]),onToggleDistribution:()=>calls.push(['toggle']),onDistribute:mode=>calls.push(['distribute',mode]),onOpenFeedback:()=>calls.push(['feedback']),...overrides};
 const result=ui.render(React.createElement(SetupSettings,props));return {calls,props,...result};
}
const labels={hideVotedOutRoles:'Hide voted-out player roles',revealDead:'Show dead player’s role',secretVotes:'Secret voting',allowSkip:'Allow skip vote',firstNightSafe:'No first night kill',passiveWait:'Wait time for passive roles',allRolesWait:'Wait time for every role',manualDiscussionControls:'Manual discussion controls'};

test('grouped setup controls expose four named sections and retain every default without emitting changes',()=>{
 const {calls}=mount();assert.equal(document.querySelector('details').open,true);assert.deepEqual(ui.screen.getAllByRole('region').map(el=>ui.within(el).getByRole('heading').textContent),['LINEUP TOOLS','VOTING & REVEALS','NIGHT SAFETY','TURN TIMING']);
 assert.equal(ui.screen.getAllByRole('checkbox').length,8);for(const [key,label] of Object.entries(labels)){const control=ui.screen.getByRole('checkbox',{name:label});assert.equal(control.checked,defaults[key]);assert.ok(document.getElementById(control.getAttribute('aria-describedby')).textContent);}
 assert.equal(ui.screen.getByRole('slider',{name:'Discussion time'}).value,String(defaults.discussionMinutes*60));assert.deepEqual(calls,[]);
});
for(const [key,label] of Object.entries(labels))test(`setup checkbox ${key} sends only its existing boolean key`,()=>{
 const settings=Object.freeze({...defaults,[key]:false}),before=JSON.stringify(settings),{calls}=mount({settings});ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:label}));assert.deepEqual(calls,[['setting',key,true]]);assert.equal(JSON.stringify(settings),before);
});

test('each duration stays beside its switch, appears only when enabled and keeps saved values',()=>{
 const settings=Object.freeze({...defaults,passiveWait:false,allRolesWait:false,passiveWaitSeconds:2,allRolesWaitSeconds:11});const {props,calls,rerender}=mount({settings});assert.equal(ui.screen.queryByRole('slider',{name:'Passive role wait seconds'}),null);assert.equal(ui.screen.queryByRole('slider',{name:'Every role wait seconds'}),null);
 rerender(React.createElement(SetupSettings,{...props,settings:{...settings,passiveWait:true,allRolesWait:true}}));
 for(const [label,value,key] of [['Passive role wait seconds','2','passiveWaitSeconds'],['Every role wait seconds','11','allRolesWaitSeconds']]){
  const range=ui.screen.getByRole('slider',{name:label});assert.equal(range.value,value);assert.equal(range.min,'1');assert.equal(range.max,'15');assert.equal(range.step,'1');assert.equal(range.closest('label').previousElementSibling.querySelector('input').getAttribute('aria-label'),key==='passiveWaitSeconds'?labels.passiveWait:labels.allRolesWait);assert.equal(range.getAttribute('aria-describedby'),null);ui.fireEvent.change(range,{target:{value:'7'}});
 }
 assert.deepEqual(calls,[['setting','passiveWaitSeconds',7],['setting','allRolesWaitSeconds',7]]);assert.equal(settings.passiveWaitSeconds,2);assert.equal(settings.allRolesWaitSeconds,11);
});

test('five-second wait fallback and 30-second to three-minute discussion slider are preserved',()=>{
 const {calls}=mount({settings:{...defaults,passiveWait:true,allRolesWait:true,passiveWaitSeconds:0,allRolesWaitSeconds:0}});assert.equal(ui.screen.getByRole('slider',{name:'Passive role wait seconds'}).value,'5');assert.equal(ui.screen.getByRole('slider',{name:'Every role wait seconds'}).value,'5');
 const duration=ui.screen.getByRole('slider',{name:'Discussion time'});assert.equal(duration.min,'30');assert.equal(duration.max,'180');assert.equal(duration.step,'30');assert.equal(duration.value,'60');assert.equal(duration.getAttribute('aria-valuetext'),'1 minute');
 ui.fireEvent.change(duration,{target:{value:'180'}});ui.fireEvent.change(duration,{target:{value:'30'}});assert.deepEqual(calls,[['setting','discussionMinutes',3],['setting','discussionMinutes',0.5]]);
});

test('distribution options retain independent settings and exact mode callbacks',()=>{
 const {calls}=mount({distributionOpen:true,settings:{...defaults,distributionFollowChances:false,distributionUniqueRoles:false,randomUniqueRoles:true}});
 ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Distribution follows role chances'}));ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'One player per distribution role'}));
 for(const name of ['EASY Favors Villagers','BALANCED Even matchup','HARD Favors Werewolves'])ui.fireEvent.click(ui.screen.getByRole('button',{name}));
 assert.deepEqual(calls,[['setting','distributionFollowChances',true],['setting','distributionUniqueRoles',true],['distribute','easy'],['distribute','balanced'],['distribute','hard']]);
});

test('opening lineup tools or sound controls emits navigation only, with no reset or save action',()=>{
 const {calls}=mount();ui.fireEvent.click(ui.screen.getByRole('button',{name:/RANDOM DISTRIBUTION/}));assert.equal(ui.screen.queryByRole('button',{name:/SETTINGS/}),null);assert.deepEqual(calls,[['toggle']]);assert.equal(ui.screen.queryByRole('button',{name:/reset|save/i}),null);assert.equal(document.querySelector('.setup-settings-note'),null);
});

test('voted-out role hiding starts off and does not change the death-role preference',()=>{
 const {calls}=mount();assert.equal(defaults.hideVotedOutRoles,false);assert.equal(ui.screen.getByRole('checkbox',{name:'Hide voted-out player roles'}).checked,false);assert.equal(ui.screen.getByRole('checkbox',{name:'Show dead player’s role'}).checked,true);
 ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Hide voted-out player roles'}));assert.deepEqual(calls,[['setting','hideVotedOutRoles',true]]);
});
