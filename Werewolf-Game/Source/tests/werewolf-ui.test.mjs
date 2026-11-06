import { before, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url:'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.localStorage = dom.window.localStorage;
window.scrollTo = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
let vite, App, React, ui, roles, rankings, ROLE_POWER, rolePower, defaults;
const originalRandom = Math.random;
before(async () => {
  vite = await createServer({ server:{middlewareMode:true}, appType:'custom', optimizeDeps:{noDiscovery:true,include:[]} });
  ({default:App} = await vite.ssrLoadModule('/src/Werewolf.tsx'));
  ({roles,defaults} = await vite.ssrLoadModule('/src/werewolf-engine.ts'));
  ({ROLE_POWER,rolePower} = await vite.ssrLoadModule('/src/role-power.ts'));
  // Avoid real playback in the simulated DOM; individual tests mock it as needed.
  window.Audio = class { play(){return Promise.resolve();} pause(){} };
  rankings = await vite.ssrLoadModule('/src/rankings.ts');
  React = await import('react');
  ui = await import('@testing-library/react');
});
afterEach(() => { ui?.cleanup(); localStorage.clear(); Math.random = originalRandom; });
after(async () => { await vite?.close(); dom.window.close(); });
const click = name => {
  // Older flow tests acknowledge the new dawn-only Mayor popup before continuing.
  if(name==='CONTINUE →' && document.querySelector('.assembly-announcement')) ui.fireEvent.click(ui.screen.getByRole('button',{name:'GOT IT!'}));
  let button=ui.screen.getByRole('button',{name});
  // JSDOM has no decoded media: explicitly choose the non-blocking no-sound path.
  if(typeof name!=='string'&&name.test('SHOW YOUR ROLE')&&button.disabled)button=ui.screen.getByRole('button',{name:'SHOW ROLE WITHOUT SOUND'});
  if (button.classList.contains('hold-button')) {
    const original=globalThis.setTimeout;
    try { globalThis.setTimeout=(fn,ms,...args)=>ms===2000 ? (fn(...args),0) : original(fn,ms,...args); ui.fireEvent.keyDown(button,{key:'Enter'}); }
    finally { globalThis.setTimeout=original; }
  } else ui.fireEvent.click(button);
  if (typeof name !== 'string' && name.test('SHOW YOUR ROLE')) {
    while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'})) ui.fireEvent.click(ui.screen.getByRole('button',{name:'OK · HIDE INFO'}));
  }
};
const availableTargets = () => [...document.querySelectorAll('button.target:not(:disabled)')];
// Older scenarios explicitly exercise the original optional rules.
const legacyRoleRules={policeNotifyBlocked:false,thiefDeathOnly:false,randomUniqueRoles:false,distributionUniqueRoles:false,distributionFollowChances:false};
function startSetup(names, settings={}, populate=true) {
  // Preserve original optional-rule scenarios; fresh/upgrade defaults are covered independently below.
  localStorage.setItem('werewolf.random-defaults.v1','1');
  localStorage.setItem('werewolf.names',JSON.stringify(names));
  localStorage.setItem('werewolf.settings',JSON.stringify({...legacyRoleRules,...settings}));
  Math.random=()=>0;
  ui.render(React.createElement(App));
  click(/START GAME/); click(/CHOOSE ROLES/);
  if (populate) {
    click('Add Werewolf');click('Add Doctor');click('Add Seer');
    for (let i=0;i<Math.max(0,names.length-3);i++) click('Add Villager');
  }
}
function chooseTargets(count=1, excludedName) {
  const targets=availableTargets().filter(b=>b.querySelector('strong')?.textContent!==excludedName);
  assert.ok(targets.length>=count,`expected ${count} selectable targets, got ${targets.length}`);
  for (let i=0;i<count;i++) ui.fireEvent.click(targets[i]);
}
function finishPrivateResult() {
  if (ui.screen.queryByRole('button',{name:'OK · HIDE RESULT'})) click('OK · HIDE RESULT');
}
function actCurrentRole(onDescription) {
  click(/SHOW YOUR ROLE/);
  const heading=ui.screen.getByRole('heading',{level:2}).textContent;
  const id=Object.keys(roles).find(key=>roles[key].name===heading);
  onDescription?.(id,document.querySelector('.panel.description p').textContent);
  assert.equal(document.querySelector('.role-power-game')?.textContent,String(rolePower(id,{...defaults,...JSON.parse(localStorage.getItem('werewolf.settings')||'{}')})));
  if (heading==='News Reporter') {
    ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Night news'}});
    click('PUBLISH IN THE MORNING');
  } else if (heading==='Mayor') click(ui.screen.queryByRole('button',{name:'DECLARE EMERGENCY ASSEMBLY'}) ? 'DECLARE EMERGENCY ASSEMBLY' : 'SKIP');
  else if (heading==='Survivor') click(ui.screen.queryByRole('button',{name:/USE SHIELD/}) ? /USE SHIELD/ : 'SKIP');
  else if (heading==='Mind Flayer') { chooseTargets(); click('PLACE TINY CREATURE'); }
  else if (heading==='Hypnotizer Wolf' && ui.screen.queryByRole('button',{name:'HYPNOTIZE'})) {chooseTargets();click('HYPNOTIZE');}
  else {
    const button=ui.screen.getByRole('button',{name:/^(COMPLETE ACTION|MUTE PLAYER|SKIP|VIEW INTEL)$/});
    if (button.disabled) chooseTargets(heading==='Chef' ? 2 : 1);
    ui.fireEvent.click(button);
    finishPrivateResult();
    if (heading==='Hypnotizer Wolf' && ui.screen.queryByRole('button',{name:'HYPNOTIZE'})) {
      chooseTargets(); click('HYPNOTIZE');
    }
  }
  return heading;
}

// Every selectable role is dealt, takes a first-night turn, and reaches morning.
test('every implemented role can be selected and complete a night', async t => {
  for (const [id,meta] of Object.entries(roles)) await t.test(meta.name, () => {
    startSetup(['A','B','C','D','E','F'],{firstNightSafe:false});
    for (let i=0;i<3;i++) click('Remove Villager');
    click('Remove Doctor'); click('Remove Seer');
    for (let i=0;i<4;i++) click('Add Villager');
    click(`Add ${meta.name}`);
    click(/START GAME/); click('CONTINUE →');
    const seen=[];
    for (let i=0;i<6;i++) seen.push(actCurrentRole());
    if(id==='madman') {assert.ok(!seen.includes('Madman'));assert.ok(seen.includes('Police'));}
    else assert.ok(seen.includes(meta.name),`${meta.name} never got a turn`);
    assert.ok(ui.screen.queryByText(/No one was killed tonight|died/),'night did not reach morning');
    if (id==='journalist') assert.ok(ui.screen.getByText('Night news'));
    ui.cleanup(); localStorage.clear(); Math.random=originalRandom;
  });
});

test('role detail modal and section counts cover every role', async () => {
  startSetup(['A','B','C','D']);
  const sections=ui.screen.getAllByRole('heading',{level:3}).filter(h=>/VILLAGERS|WEREWOLVES|NEUTRALS/.test(h.textContent));
  assert.equal(sections.length,3);
  for (const h of sections) {
    const count=h.parentElement.querySelectorAll('.role-choice:not(.random-role-choice)').length;
    assert.ok(h.textContent.includes(`${count} / ${Object.keys(roles).length} ROLES`));
  }
  click('View Villager details');
  let dialog=ui.screen.getByRole('dialog');
  assert.ok(ui.within(dialog).getByAltText('Villager role artwork'));
  click('Next role');
  assert.equal(ui.within(dialog).queryByAltText('Villager role artwork'),null);
  click('Previous role');
  assert.ok(ui.within(dialog).getByAltText('Villager role artwork'));
  click('Close role details');
  const {roleDescription,defaults}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  for (const [id,meta] of Object.entries(roles)) {
    click(`View ${meta.name} details`);
    const dialog=ui.screen.getByRole('dialog');
    assert.equal(dialog.querySelector('#role-details-description').textContent,roleDescription(id,{...defaults,...legacyRoleRules}));
    assert.ok(ui.within(dialog).getByAltText(`${meta.name} role artwork`));
    click('Close role details');
  }
});

test('settings control first-night attacks, death reveal, secret voting and skip voting', () => {
  startSetup(['A','B','C','D'],{firstNightSafe:false,revealDead:false,secretVotes:false,allowSkip:false,discussionMinutes:2});
  click(/START GAME/); click('CONTINUE →');
  let victim='', saved='';
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') { const target=availableTargets().find(b=>b.querySelector('strong').textContent!==saved); victim=target.querySelector('strong').textContent; ui.fireEvent.click(target); click('COMPLETE ACTION'); }
    else if(role==='Doctor') { const target=availableTargets().find(b=>b.querySelector('strong').textContent!==victim); saved=target.querySelector('strong').textContent; ui.fireEvent.click(target); click('COMPLETE ACTION'); }
    else if(role==='Seer') { chooseTargets(); click('COMPLETE ACTION'); finishPrivateResult(); }
    else click('SKIP');
  }
  const morning=ui.screen.getByText(/ died/).textContent;
  assert.ok(morning.includes(victim));
  assert.ok(!morning.includes('('),'death role should be hidden');
  click('CONTINUE →');
  assert.ok(ui.screen.getByText('02:00'));
  click('+1 MINUTE'); assert.ok(ui.screen.getByText('03:00'));
  click('END DISCUSSION →'); 
  assert.ok(ui.screen.getByText(/Votes so far:/));
  assert.equal(ui.screen.queryByRole('button',{name:'SKIP VOTE'}),null);
});

test('safe first night, secret votes and skip votes use their default settings', () => {
  startSetup(['A','B','C','D']);
  click(/START GAME/); click('CONTINUE →');
  let wolfTurn=false;
  for (let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if (role==='Werewolf') {
      wolfTurn=true;
      assert.ok(ui.screen.getByText(/No killing ability on the first night/));
      assert.equal(availableTargets().length,0);
      click('SKIP');
    } else if (role==='Doctor') { chooseTargets(); click('COMPLETE ACTION'); }
    else if (role==='Seer') { chooseTargets(); click('COMPLETE ACTION'); finishPrivateResult(); }
    else click('SKIP');
  }
  assert.ok(wolfTurn);
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  click('CONTINUE →'); click('END DISCUSSION →'); 
  assert.ok(ui.screen.getByRole('button',{name:'SKIP VOTE'}));
  assert.equal(ui.screen.queryByText(/Votes so far:/),null);
});

for (const order of ['police-after-doctor','police-before-doctor']) {
  test(`Police silently blocks the Doctor irrespective of action order: ${order}`, () => {
    startSetup(['A','B','C','D','E','F'],{firstNightSafe:false});
    click('Remove Seer');click('Add Police');
    if (order==='police-before-doctor') Math.random=()=>0.999;
    click(/START GAME/);click('CONTINUE →');
    const doctor=order==='police-before-doctor'?'F':'E';
    const victim=order==='police-before-doctor'?'C':'B';
    let sawDoctor=false,sawPolice=false,sawWolf=false;
    for(let i=0;i<6;i++) {
      const player=ui.screen.getByRole('heading',{level:2}).textContent;
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      assert.equal(ui.screen.queryByText('You cannot use your role tonight.'),null);
      if(role==='Werewolf' || role==='Doctor' || role==='Police') {
        const desired=role==='Police'?doctor:victim;
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);
        assert.ok(target,`${role} cannot select ${desired}`);
        ui.fireEvent.click(target);click('COMPLETE ACTION');
        if(role==='Doctor') {assert.equal(player,doctor);sawDoctor=true;}
        if(role==='Police') sawPolice=true;
        if(role==='Werewolf') sawWolf=true;
      } else click('SKIP');
    }
    assert.ok(sawDoctor && sawPolice && sawWolf);
    assert.ok(ui.screen.getByText(new RegExp(`${victim} died`)),'blocked protection must fail');
    assert.equal(ui.screen.queryByText(/detained/i),null);
  });
}

for (const blocked of [true,false]) {
  test(`Police-game Seer report is delayed and ${blocked?'suppressed when detained':'delivered when not detained'}`, () => {
    startSetup(['A','B','C','D','E','F']);
    click('Remove Villager');click('Add Police');click(/START GAME/);click('CONTINUE →');
    let seer='';
    for(let i=0;i<6;i++) {
      const player=ui.screen.getByRole('heading',{level:2}).textContent;
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Seer' || role==='Doctor' || role==='Police') {
        const desired=role==='Police'?(blocked?'E':'D'):(role==='Seer'?'A':'B');
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);
        ui.fireEvent.click(target);click('COMPLETE ACTION');
        if(role==='Seer') {seer=player;assert.equal(ui.screen.queryByRole('heading',{name:'PRIVATE RESULT'}),null);}
      } else click('SKIP');
    }
    assert.equal(seer,'E');click('CONTINUE →');click('END DISCUSSION →');
    for(let i=0;i<6;i++) click('SKIP VOTE');
    click('CONTINUE →');click('CONTINUE →');
    for(let i=0;i<5;i++) {
      const player=ui.screen.getByRole('heading',{level:2}).textContent;
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(player===seer) {
        assert.equal(!!ui.screen.queryByText('PREVIOUS NIGHT REPORT'),!blocked);
        if(!blocked) assert.ok(ui.screen.getByText(/A is Werewolf/));
        break;
      }
      if(role==='Doctor' || role==='Werewolf') {chooseTargets();click('COMPLETE ACTION');} else click('SKIP');
    }
  });
}

test('Chef can continue when only one possible guest remains', () => {
  startSetup(['A','B','C','D']);
  click('Remove Doctor');click('Remove Seer');click('Add Chef');click('Add Thief');
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/); const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Chef'){chooseTargets(2);click('COMPLETE ACTION');finishPrivateResult();}
    else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<4;i++){click('SKIP VOTE');}
  click('CONTINUE →');click('CONTINUE →');
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {const target=availableTargets().find(b=>b.querySelector('strong')?.textContent==='B');assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else if(role==='Chef'){chooseTargets(2);click('COMPLETE ACTION');finishPrivateResult();}
    else if(role==='Thief') click('SKIP THEFT');
    else click('SKIP');
  }
  assert.ok(ui.screen.getByText(/B died/));click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<3;i++) {
    const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
    if(player==='A') click('SKIP VOTE');
    else {const target=availableTargets().find(b=>b.querySelector('strong')?.textContent==='A');assert.ok(target);ui.fireEvent.click(target);click('VOTE');}
  }
  assert.ok(ui.screen.getByText(/A was voted out/));click('CONTINUE →');click('CONTINUE →');
  let sawChef=false;
  for(let i=0;i<2;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Chef') {sawChef=true;assert.ok(ui.screen.getByText(/Not enough other living players/));click('SKIP');}
    else if(role==='Thief') click('SKIP THEFT');
  }
  assert.ok(sawChef);assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('show-dead-role setting reveals the eliminated role', () => {
  startSetup(['A','B','C','D'],{firstNightSafe:false,revealDead:true});
  click(/START GAME/);click('CONTINUE →');
  let victim='', saved='';
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {const target=availableTargets().find(b=>b.querySelector('strong').textContent!==saved);victim=target.querySelector('strong').textContent;ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else if(role==='Doctor') {const target=availableTargets().find(b=>b.querySelector('strong').textContent!==victim);saved=target.querySelector('strong').textContent;ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else if(role==='Seer') {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
    else click('SKIP');
  }
  assert.match(ui.screen.getByText(/ died/).textContent,/ died \(.+\)\./);
});


test('role selection starts empty and the fixed start bar follows the selected total', () => {
  startSetup(['A','B','C','D'],{},false);
  const bar=document.querySelector('.role-start-bar');
  assert.ok(bar);
  const start=ui.within(bar).getByRole('button',{name:/START GAME/});
  assert.ok(start.disabled);
  assert.match(start.textContent,/0 \/ 4/);
  const counts=[...document.querySelectorAll('.role-choice .stepper span')];
  assert.equal(counts.length,Object.keys(roles).length + 3);
  assert.ok(counts.every(count=>count.textContent==='0'));
  click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add Doctor');
  assert.match(start.textContent,/4 \/ 4/);assert.equal(start.disabled,false);
  click('Remove Villager');assert.match(start.textContent,/3 \/ 4/);assert.equal(start.disabled,true);
  click('Go back');click(/CHOOSE ROLES/);
  assert.match(document.querySelector('.role-start-bar button').textContent,/0 \/ 4/);
});

test('Friends Maker forms a private bond and the Friends win only after opponents are gone', () => {
  startSetup(['A','B','C','D']);
  click('Remove Doctor');click('Remove Seer');click('Add Villager');click('Add Friends Maker');
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Friends Maker') {
      const target=availableTargets().find(b=>b.querySelector('strong')?.textContent==='B');
      assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
    } else click('SKIP');
  }
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<4;i++) {
    const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
    const partnerButton=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent==='D');
    if(player==='B') { assert.ok(partnerButton.disabled,'a friend must not vote to eliminate their partner'); assert.ok(ui.screen.getByText(/Your friend is D/)); }
    const desired=player==='A'?'C':'A';
    const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);
    assert.ok(target);ui.fireEvent.click(target);click('VOTE');
  }
  assert.ok(ui.screen.getByText(/A was voted out/));click('CONTINUE →');
  assert.ok(ui.screen.getByText(/NIGHT 2 STARTED/),'living opponents should prevent Friends victory');click('CONTINUE →');
  for(let i=0;i<3;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Friends Maker') assert.ok(ui.screen.getByText(/Your friend: B/));
    click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<3;i++) {
    const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
    const desired=player==='C'?'D':'C';
    const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);
    assert.ok(target);ui.fireEvent.click(target);click('VOTE');
  }
  assert.ok(ui.screen.getByText(/C was voted out/));click('CONTINUE →');
  assert.ok(ui.screen.getByRole('heading',{name:'THE FRIENDS WIN'}));
});

test('Madman card hides its identity until the game-end results', () => {
  startSetup(['A','B','C','D']);
  assert.equal(ui.screen.queryByLabelText('Madmen (disguised roles)'),null);
  click('Remove Seer');click('Add Madman');
  click(/START GAME/);click('CONTINUE →');
  let wolf='';
  for(let i=0;i<4;i++) {
    const player=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {wolf=player;click('SKIP');}
    else if(role==='Doctor' || role==='Seer' || role==='Police') {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
    else click('SKIP');
    assert.equal(ui.screen.queryByText(/· Madman/),null);
  }
  assert.ok(wolf);click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<4;i++) {
    const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
    if(player===wolf) click('SKIP VOTE');
    else {const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===wolf);assert.ok(target);ui.fireEvent.click(target);click('VOTE');}
  }
  click('CONTINUE →');
  const rows=[...document.querySelectorAll('.result-row')];
  assert.equal(rows.filter(row=>row.textContent.includes('· Madman')).length,1);
});


test('discussion and successive votes open the voting page directly', () => {
  startSetup(['A','B','C','D']);
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Doctor' || role==='Seer') {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
    else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');
  assert.ok(ui.screen.getByRole('heading',{name:'A, who are you voting for?'}));
  assert.equal(ui.screen.queryByRole('button',{name:'CAST YOUR VOTE'}),null);
  click('SKIP VOTE');
  assert.ok(ui.screen.getByRole('heading',{name:'B, who are you voting for?'}));
  assert.equal(ui.screen.queryByRole('button',{name:'CAST YOUR VOTE'}),null);
});

test('a detained Sheriff keeps their bullet and Police cannot repeat a successful detention', () => {
  startSetup(['A','B','C','D','E','F'],{firstNightSafe:false});
  click('Remove Seer');click('Add Sheriff');click('Remove Doctor');click('Add Police');
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<6;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf' || role==='Sheriff' || role==='Police') {
      const desired=role==='Werewolf'?'B':role==='Sheriff'?'C':'E';
      const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target,role);
      ui.fireEvent.click(target);click('COMPLETE ACTION');
    } else click('SKIP');
  }
  assert.ok(ui.screen.getByText(/B died/));assert.equal(ui.screen.queryByText(/C died/),null);
  click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<5;i++) click('SKIP VOTE');
  click('CONTINUE →');click('CONTINUE →');
  let sawSheriff=false,sawPolice=false;
  for(let i=0;i<5;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Sheriff') {sawSheriff=true;assert.equal(document.querySelector('.turn-help'),null);assert.ok(ui.screen.getByRole('button',{name:'SAVE BULLET FOR LATER'}));assert.ok(availableTargets().length);click('SAVE BULLET FOR LATER');}
    else if(role==='Police') {
      sawPolice=true;
      const oldTarget=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent==='E');
      assert.ok(oldTarget.disabled);click('SKIP BLOCK');
    } else click('SKIP');
  }
  assert.ok(sawSheriff && sawPolice);
});

test('a detained Mayor does not protect the village or consume the assembly', () => {
  startSetup(['A','B','C','D','E','F'],{firstNightSafe:false});
  click('Remove Doctor');click('Add Mayor');click('Remove Seer');click('Add Police');
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<6;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf' || role==='Police') {
      const desired=role==='Werewolf'?'B':'E';
      const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target,role);
      ui.fireEvent.click(target);click('COMPLETE ACTION');
    } else if(role==='Mayor') click('DECLARE EMERGENCY ASSEMBLY');
    else click('SKIP');
  }
  assert.ok(ui.screen.getByText(/B died/));
  assert.equal(ui.screen.queryByText(/declared an emergency assembly/),null);
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++) click('SKIP VOTE');
  click('CONTINUE →');click('CONTINUE →');
  let sawMayor=false;
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Mayor') {sawMayor=true;assert.ok(ui.screen.getByRole('button',{name:'DECLARE EMERGENCY ASSEMBLY'}));break;}
    else click('SKIP');
  }
  assert.ok(sawMayor);
});

test('a disguised Madman News Reporter writes privately but publishes nothing', () => {
  startSetup(['A','B','C','D']);
  click('Remove Doctor'); click('Remove Seer'); click('Add Madman'); click('Add Villager');
  const disguises=Object.keys(roles).filter(r=>roles[r].team==='village' && !['villager','madman'].includes(r));
  Math.random=()=> (disguises.indexOf('journalist')+0.01)/disguises.length;
  click(/START GAME/); click('CONTINUE →');
  for(let i=0;i<4;i++) {
    click(/SHOW YOUR ROLE/);
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='News Reporter') {
      ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Secret'}});
      click('PUBLISH IN THE MORNING');
    } else click('SKIP');
  }
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  assert.equal(ui.screen.queryByText('Secret'),null);
});

test('optional passive-role wait delays skipping but active roles can act immediately', async () => {
  const originalNow=Date.now;
  let now=originalNow();
  Date.now=()=>now;
  try {
    startSetup(['A','B','C','D'],{passiveWait:true});
    assert.equal(ui.screen.getByLabelText('Wait time for passive roles').checked,true);
    assert.equal(ui.screen.getByLabelText('Passive role wait seconds').value,'5');
    ui.fireEvent.change(ui.screen.getByLabelText('Passive role wait seconds'),{target:{value:'2'}});
    assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).passiveWaitSeconds,2);
    click(/START GAME/);click('CONTINUE →');
    let checkedPassive=false,checkedActive=false;
    for(let i=0;i<4;i++) {
      click(/SHOW YOUR ROLE/);
      const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Villager') {
        checkedPassive=true;
        assert.ok(ui.screen.getByRole('button',{name:'SKIP'}).disabled);
        assert.ok(ui.screen.getByRole('status').textContent.includes('2 seconds'));
        now+=2000;
        await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});
        assert.equal(ui.screen.getByRole('button',{name:'SKIP'}).disabled,false);
        click('SKIP');
      } else if(role==='Werewolf') {checkedActive=true;assert.equal(ui.screen.getByRole('button',{name:'SKIP'}).disabled,false);click('SKIP');}
      else {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
    }
    assert.ok(checkedPassive && checkedActive);
    assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).passiveWait,true);
  } finally {Date.now=originalNow;}
});


test('random distribution fills an initially empty lineup and remains editable', () => {
  startSetup(['A','B','C','D'],{},false);
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/0 \/ 4/);
  click('RANDOM DISTRIBUTION');click('BALANCED Even matchup');
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/4 \/ 4/);
  assert.equal(ui.screen.getByRole('button',{name:/START GAME/}).disabled,false);
  click('Add Villager');
  assert.equal(ui.screen.getByRole('button',{name:/START GAME/}).disabled,true);
  click('Remove Villager');
  click(/START GAME/);
  assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));
});


test('rankings count faction, survivor, escaped Gambler and independent winners correctly', () => {
  const p=[{id:0,name:'W',role:'werewolf',alive:false},{id:1,name:'V',role:'villager',alive:true},{id:2,name:'S',role:'survivor',alive:true},{id:3,name:'G',role:'gambler',alive:false,escaped:true},{id:4,name:'C',role:'charmer',alive:false},{id:5,name:'J',role:'jester',alive:false}];
  assert.deepEqual(rankings.winningPlayers(p,'village',{},'', ''),[1,2,3]);
  assert.deepEqual(rankings.winningPlayers(p,'wolf',{},'', ''),[0,2,3]);
  assert.deepEqual(rankings.winningPlayers(p,'jester',{},'J', ''),[2,3,5]);
  const lovers={1:4,4:1};
  assert.deepEqual(rankings.winningPlayers(p,'friends',lovers,'', ''),[1,2,3,4]);
  assert.deepEqual(rankings.winningPlayers(p,'wolf',lovers,'', ''),[0,2,3]);
  const first=rankings.updateRankings([],p,[1,2,3]);
  const next=rankings.updateRankings(first,p,[0,2,3]);
  assert.deepEqual(next.find(r=>r.name==='S'),{name:'S',played:2,wins:2});
  assert.deepEqual(next.find(r=>r.name==='J'),{name:'J',played:2,wins:0});
  assert.equal(next.length,6);
});

test('completed games are saved once and visible in local rankings', () => {
  startSetup(['A','B','C','D']);
  click(/START GAME/);click('CONTINUE →');
  let wolf='';
  for(let i=0;i<4;i++) {
    const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Werewolf') {wolf=name;click('SKIP');}
    else if(role==='Doctor' || role==='Seer') {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
    else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<4;i++) {
    const name=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
    if(name===wolf) click('SKIP VOTE');
    else {const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===wolf);ui.fireEvent.click(target);click('VOTE');}
  }
  click('CONTINUE →');
  let stored=JSON.parse(localStorage.getItem('werewolf.rankings.v1'));
  assert.equal(stored.length,4);
  assert.ok(stored.every(r=>r.played===1));
  assert.equal(stored.find(r=>r.name===wolf).wins,0);
  assert.ok(stored.filter(r=>r.name!==wolf).every(r=>r.wins===1));
  click('BACK TO MENU');click(/START GAME/);click(/PLAYER LIBRARY/);click('ALL-TIME RANKINGS');
  assert.ok(ui.screen.getByRole('heading',{name:'ALL-TIME RANKINGS'}));
  assert.equal(document.querySelectorAll('.ranking-row').length,4);
  stored=JSON.parse(localStorage.getItem('werewolf.rankings.v1'));
  assert.ok(stored.every(r=>r.played===1));
});

test('discussion timer uses elapsed time when backgrounded and add-minute extends the deadline', () => {
  const originalNow=Date.now; let now=originalNow(); Date.now=()=>now;
  try {
    startSetup(['A','B','C','D'],{discussionMinutes:1});
    click(/START GAME/);click('CONTINUE →');
    for(let i=0;i<4;i++) {
      click(/SHOW YOUR ROLE/);
      const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Doctor' || role==='Seer') {chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}
      else click('SKIP');
    }
    click('CONTINUE →');
    assert.equal(document.querySelector('.timer').textContent,'01:00');
    now+=30000;
    ui.act(()=>document.dispatchEvent(new window.Event('visibilitychange')));
    assert.equal(document.querySelector('.timer').textContent,'00:30');
    click('+1 MINUTE');
    assert.equal(document.querySelector('.timer').textContent,'01:30');
    now+=91000;
    ui.act(()=>document.dispatchEvent(new window.Event('visibilitychange')));
    assert.ok(ui.screen.getByRole('heading',{name:/who are you voting for/}));
  } finally {Date.now=originalNow;}
});

for (const random of [0,0.999]) {
  test(`Police silently blocks a News Reporter regardless of turn order (random ${random})`, async () => {
    const names=['A','B','C','D','E','F'];
    startSetup(names,{firstNightSafe:true});
    click('Remove Doctor');click('Remove Seer');click('Add Police');click('Add News Reporter');
    Math.random=()=>random;
    const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
    const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
    Object.assign(counts,{werewolf:1,police:1,journalist:1,villager:3});
    const lineup=deal(names,counts);
    const journalist=lineup.find(p=>p.role==='journalist').name;
    click(/START GAME/);click('CONTINUE →');
    for(let i=0;i<6;i++) {
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Police') {
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===journalist);
        assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
      } else if(role==='News Reporter') {
        ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Night tale'}});
        click('PUBLISH IN THE MORNING');
      } else click('SKIP');
    }
    assert.ok(ui.screen.getByText('No one was killed tonight.'));
    assert.equal(ui.screen.queryByText('Night tale'),null);
    assert.equal(ui.screen.queryByText(/detained/i),null);
  });
}

test('Gambler prepares after two votes and only escapes after surviving the following night', async () => {
  const names=['A','B','C','D','E','F','G','H'];
  startSetup(names,{firstNightSafe:true});
  click('Remove Doctor');click('Remove Seer');click('Add Gambler');click('Add Villager');
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));
  Object.assign(counts,{werewolf:1,gambler:1,villager:6});
  const lineup=deal(names,counts);
  const gambler=lineup.find(p=>p.role==='gambler').name;
  const villages=lineup.filter(p=>p.role==='villager').map(p=>p.name);
  const [v1,v2,night2Victim,night3Victim]=villages;
  const selectName=name=>{const button=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(button,`cannot target ${name}`);ui.fireEvent.click(button);};
  click(/START GAME/);
  for(let round=1;round<=3;round++) {
    click('CONTINUE →');
    const turnCount=round===1?8:round===2?7:5;
    for(let i=0;i<turnCount;i++) {
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Gambler') {
        if(round===3) {assert.ok(ui.screen.getByText(/If you live through tonight/));click('SKIP BET');}
        else {selectName(round===1?v1:v2);click('COMPLETE ACTION');}
      } else if(role==='Werewolf' && round>1) {selectName(round===2?night2Victim:night3Victim);click('COMPLETE ACTION');}
      else click('SKIP');
    }
    if(round===3) {
      assert.ok(ui.screen.getByText(new RegExp(`${gambler} left the village and won`)));
      assert.equal(ui.screen.queryByText(new RegExp(`${gambler} died`)),null);
      break;
    }
    click('CONTINUE →');click('END DISCUSSION →');
    const target=round===1?v1:v2;
    const voters=round===1?8:6;
    for(let i=0;i<voters;i++) {
      const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
      if(voter===target) click('SKIP VOTE'); else {selectName(target);click('VOTE');}
    }
    assert.ok(ui.screen.getByText(new RegExp(`${target} was voted out`)));
    assert.equal(ui.screen.queryByText(/left the village and won/),null);
    click('CONTINUE →');
  }
});

test('background music controls are removed while sound effects remain configurable',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({sounds:true,buttonSounds:true,haptics:false}));ui.render(React.createElement(App));click('SETTINGS');
 assert.equal(ui.screen.queryByLabelText('Background music'),null);assert.equal(ui.screen.queryByLabelText('Music volume'),null);assert.equal(ui.screen.queryByRole('button',{name:'PREVIEW MUSIC'}),null);assert.equal(ui.screen.getByLabelText('Button sounds').checked,true);assert.equal(ui.screen.getByRole('button',{name:'PREVIEW TAP'}).disabled,false);click('TURN ALL OFF');assert.equal(ui.screen.getByLabelText('Button sounds').checked,false);
});

test('automatic distribution preserves the lineup when every random Werewolf is excluded', () => {
  const excluded=Object.keys(roles).filter(role=>roles[role].team==='wolf');
  startSetup(['A','B','C','D'],{disabledRandomRoles:excluded},false);click('Add Werewolf');
  click('RANDOM DISTRIBUTION');click('BALANCED Even matchup');
  assert.match(ui.screen.getByRole('alert').textContent,/eligible Werewolf/);
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/1 \/ 4/);
  ui.fireEvent.keyDown(ui.screen.getByRole('button',{name:'View Werewolf details'}),{key:'Enter',shiftKey:true});
  click('BALANCED Even matchup');
  assert.equal(ui.screen.queryByRole('alert'),null);
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/4 \/ 4/);
});

test('player setup bottom sheets preserve avatar transfers and delete mode is explicit', () => {
  localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
  ui.render(React.createElement(App));click(/START GAME/);
  assert.equal(ui.screen.queryByRole('button',{name:'Remove A from this game'}),null);
  click('Edit A');click('Choose or change game avatar');
  assert.ok(ui.screen.getByRole('dialog',{name:'Choose photo or avatar'}));
  click(/Game avatars/);assert.ok(ui.screen.getByRole('dialog',{name:'Game avatars'}));
  for(let i=1;i<=19;i++){const button=ui.screen.getByRole('button',{name:`Choose avatar ${i}`});assert.equal(button.querySelector('.avatar-number').textContent,String(i));assert.equal(button.querySelector('.avatar-number').getAttribute('aria-hidden'),'true');}
  click('Choose avatar 1');click('SAVE PLAYER');
  click('Edit B');click('Choose or change game avatar');click(/Game avatars/);click('Choose avatar 1');click('SAVE PLAYER');
  const avatars=JSON.parse(localStorage.getItem('werewolf.avatars.v1'));
  assert.ok(avatars.b.endsWith('/photo-01-20261106.png'));assert.notEqual(avatars.a,avatars.b);
  assert.match(document.querySelector('.avatar-notice').textContent,/random unused avatar/);
  click('Delete players');assert.ok(ui.screen.getByText('DELETE MODE'));
  click('Remove D from this game');assert.equal(ui.screen.queryByRole('button',{name:'Remove D from this game'}),null);
  click('Exit delete mode');assert.ok(ui.screen.getByRole('button',{name:/CHOOSE ROLES/}).disabled);
});

test('rankings share sends only local standings after an explicit tap', async () => {
  localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
  localStorage.setItem('werewolf.rankings.v1',JSON.stringify([{name:'A',wins:2,played:3}]));
  let sent;const old=Object.getOwnPropertyDescriptor(globalThis.navigator,'share');
  Object.defineProperty(globalThis.navigator,'share',{configurable:true,value:async payload=>{sent=payload;}});
  try {
    ui.render(React.createElement(App));click(/START GAME/);click(/PLAYER LIBRARY/);click('ALL-TIME RANKINGS');
    assert.equal(sent,undefined);
    await ui.act(async()=>{click('SHARE');});
    assert.match(sent.text,/A — 2 wins \/ 3 games/);
  } finally {
    if(old) Object.defineProperty(globalThis.navigator,'share',old);else delete globalThis.navigator.share;
  }
});


test('random team cards count selections and deal roles from the chosen teams', () => {
  startSetup(['A','B','C','D'],{},false);
  click('Add random WEREWOLVES role');
  click('Add random VILLAGERS role');
  click('Add random VILLAGERS role');
  click('Add random NEUTRALS role');
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/4 \/ 4/);
  click('Remove random NEUTRALS role');
  assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/3 \/ 4/);
  click('Add random NEUTRALS role');
  click(/START GAME/);
  assert.ok(ui.screen.getByText('NIGHT 1 STARTED'));
});


test('every-role wait is adjustable, persists, and delays active roles', async () => {
  const originalNow=Date.now; let now=originalNow(); Date.now=()=>now;
  try {
    startSetup(['A','B','C','D']);
    ui.fireEvent.click(ui.screen.getByLabelText('Wait time for every role'));
    ui.fireEvent.change(ui.screen.getByLabelText('Every role wait seconds'),{target:{value:'2'}});
    assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).allRolesWaitSeconds,2);
    click(/START GAME/);click('CONTINUE →');click(/SHOW YOUR ROLE/);
    assert.ok(ui.screen.getByRole('status').textContent.includes('2 seconds'));
    assert.ok(document.querySelector('.role-turn-content').disabled);
    now+=2000;await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});
    assert.equal(document.querySelector('.role-turn-content').disabled,false);
  } finally {Date.now=originalNow;}
});

test('public reports require a continuous two-second hold', async () => {
  const {default:HoldButton}=await vite.ssrLoadModule('/src/HoldButton.tsx');
  let completed=0;ui.render(React.createElement(HoldButton,{onComplete:()=>completed++}));
  const button=ui.screen.getByRole('button',{name:'CONTINUE →'});
  ui.fireEvent.click(button);assert.equal(completed,0);
  ui.fireEvent.keyDown(button,{key:'Enter'});ui.fireEvent.keyUp(button,{key:'Enter'});
  await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,50));});assert.equal(completed,0);
  ui.fireEvent.keyDown(button,{key:'Enter'});
  await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,2100));});
  assert.equal(completed,1);
});


test('villager role settings persist and change Doctor and Sheriff abilities', async () => {
  const names=['A','B','C','D','E']; startSetup(names,{firstNightSafe:false},false);
  for(const role of ['Werewolf','Doctor','Sheriff','Villager','Villager']) click('Add '+role);
  click('View Doctor details');
  ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.click(ui.screen.getByLabelText('Protect yourself'));
  ui.fireEvent.click(ui.screen.getByLabelText('Protect the same player on two nights in a row'));
  assert.match(ui.screen.getByText(/you cannot protect yourself/i).textContent,/two nights in a row/);
  click('Close role details');
  click('View Sheriff details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.click(ui.screen.getByLabelText('One shot every night'));click('Close role details');
  const saved=JSON.parse(localStorage.getItem('werewolf.settings'));
  assert.equal(saved.doctorSelfProtect,false);assert.equal(saved.doctorRepeatProtect,true);assert.equal(saved.sheriffEveryNight,true);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,doctor:1,sheriff:1,villager:2});
  const lineup=deal(names,counts), villager=lineup.find(p=>p.role==='villager').name, victim=lineup.filter(p=>p.role==='villager')[1].name, doctor=lineup.find(p=>p.role==='doctor').name;
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<5;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Doctor'){const self=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent===doctor);assert.ok(self.disabled);const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===villager);ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else if(role==='Sheriff' || role==='Werewolf'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===(role==='Sheriff'?victim:villager));ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<4;i++)click('SKIP VOTE');
  click('CONTINUE →');click('CONTINUE →');
  for(let i=0;i<4;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Doctor'){assert.ok(availableTargets().some(b=>b.querySelector('strong')?.textContent===villager),'doctor can repeat their protection');chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Sheriff'){assert.ok(availableTargets().length>0);click('SAVE BULLET FOR LATER');}
    else click('SKIP');
  }
});

test('villager role use limits are configurable and saved in role details', () => {
  startSetup(['A','B','C','D'],{},false);
  for(const [role,key] of [['Wolf Hunter','templarUses'],['Necromancer','necromancerUses'],['Vote Marker','instigatorMaxUses']]) {
    click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
    const input=ui.screen.getByLabelText(`${role} uses per game`);
    ui.fireEvent.change(input,{target:{value:'3'}});
    assert.equal(input.value,'3');
    assert.equal(JSON.parse(localStorage.getItem('werewolf.settings'))[key],3);
    click('Close role details');
  }
});

test('Vote Marker can use the configured number of provocations', async () => {
  const names=['A','B','C','D','E','F','G','H'];
  startSetup(names,{instigatorMaxUses:3,doctorRepeatProtect:true},false);
  for(const role of ['Werewolf','Doctor','Vote Marker','Villager','Villager','Villager','Villager','Villager']) click('Add '+role);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,doctor:1,instigator:1,villager:5});
  const protectedName=deal(names,counts).find(p=>p.role==='villager').name;
  click(/START GAME/);
  for(let round=1;round<=4;round++) {
    click('CONTINUE →');
    for(let i=0;i<8;i++) {
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Vote Marker') {
        const text=document.querySelector('.panel.description > p').textContent;
        if(round<=3)assert.ok(text.includes(`${4-round} ${round===3?'use':'uses'} left`));
        else {assert.match(text,/Your marks are used up/);assert.match(document.querySelector('.turn-help').textContent,/No vote marks left/);}
        if(round<=3){assert.ok(availableTargets().length>0);chooseTargets();click('COMPLETE ACTION');}
        else {assert.equal(availableTargets().length,0);click('SKIP');}
      } else if(role==='Doctor' || (role==='Werewolf' && round>1)) {
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===protectedName);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
      } else click('SKIP');
    }
    if(round===4)break;
    click('CONTINUE →');click('END DISCUSSION →');
    for(let i=0;i<8;i++){assert.equal(document.querySelector('.voter-name').textContent,names[i]);click('SKIP VOTE');}
    click('CONTINUE →');
  }
});

test('Wolf Hunter can use two configured shots on separate nights', async () => {
  const names=['A','B','C','D','E','F','G'];
  startSetup(names,{templarUses:2,doctorRepeatProtect:true,firstNightSafe:false},false);
  for(const role of ['Werewolf','Werewolf','Doctor','Wolf Hunter','Villager','Villager','Villager']) click('Add '+role);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:2,doctor:1,templar:1,villager:3});
  const lineup=deal(names,counts), wolves=lineup.filter(p=>p.role==='werewolf').map(p=>p.name), protectedName=lineup.find(p=>p.role==='villager').name;
  click(/START GAME/);
  for(let round=1;round<=2;round++) {
    click('CONTINUE →');
    for(let i=0;i<(round===1?7:6);i++) {
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Werewolf' || role==='Doctor' || role==='Wolf Hunter') {
        const desired=role==='Wolf Hunter'?wolves[round-1]:protectedName;
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target,`${role} cannot select ${desired}`);ui.fireEvent.click(target);click('COMPLETE ACTION');
      } else click('SKIP');
    }
    if(round===2){assert.ok(ui.screen.getByText(new RegExp(`${wolves[1]} died`)));break;}
    click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');
  }
});

test('Necromancer can revive twice when configured, then runs out', async () => {
  const names=['A','B','C','D','E','F'];startSetup(names,{necromancerUses:2,firstNightSafe:false},false);
  for(const role of ['Werewolf','Necromancer','Villager','Villager','Villager','Villager']) click('Add '+role);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,necromancer:1,villager:4});
  const villagers=deal(names,counts).filter(p=>p.role==='villager').map(p=>p.name);
  click(/START GAME/);
  for(let round=1;round<=4;round++) {
    click('CONTINUE →');
    for(let i=0;i<(round===1?6:5);i++) {
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      if(role==='Werewolf') {
        const desired=round===1?villagers[0]:round===2?villagers[1]:round===3?villagers[0]:villagers[2];
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
      } else if(role==='Necromancer' && (round===2 || round===3)) {
        const desired=round===2?villagers[0]:villagers[1];
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
      } else if(role==='Necromancer' && round===4) {assert.equal(availableTargets().length,0);assert.match(document.querySelector('.turn-help').textContent,/No revivals left/);click('SKIP');}
      else click('SKIP');
    }
    if(round===4) break;
    click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');
  }
});

test('information role settings save in their role screens', () => {
  startSetup(['A','B','C','D'],{},false);
  click('View Celebrity details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.change(ui.screen.getByLabelText('Celebrity audience'),{target:{value:'3'}});click('Close role details');
  click('View Intelligence Chief details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.change(ui.screen.getByLabelText('Intelligence report interval'),{target:{value:'1'}});click('Close role details');
  click('View Detective details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.click(ui.screen.getByLabelText("Show visitors' names"));click('Close role details');
  const saved=JSON.parse(localStorage.getItem('werewolf.settings'));
  assert.equal(saved.celebrityAudience,3);assert.equal(saved.intelligenceInterval,1);assert.equal(saved.detectiveShowNames,false);
});

test('intelligence interval can provide a report on the first night', () => {
  startSetup(['A','B','C','D'],{intelligenceInterval:1},false);
  for(const role of ['Werewolf','Intelligence Chief','Villager','Villager'])click('Add '+role);
  click(/START GAME/);click('CONTINUE →');let found=false;
  for(let i=0;i<4;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Intelligence Chief'){found=true;assert.match(document.querySelector('.panel.description > p').textContent,/Get names tonight/);assert.ok(ui.screen.getByText(/Your player report is ready/));click('VIEW INTEL');finishPrivateResult();}
    else click('SKIP');
  }
  assert.ok(found);
});

test('Detective can see a visitor count instead of names', async () => {
  const names=['A','B','C','D','E'];startSetup(names,{detectiveShowNames:false,firstNightSafe:false,doctorRepeatProtect:true},false);
  for(const role of ['Werewolf','Doctor','Detective','Villager','Villager'])click('Add '+role);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,doctor:1,detective:1,villager:2});
  const targetName=deal(names,counts).find(p=>p.role==='villager').name;
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<5;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(['Werewolf','Doctor','Detective'].includes(role)){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===targetName);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
  let checked=false;
  for(let i=0;i<5;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Detective'){const report=ui.screen.getByText(/Last night’s visitors to/).textContent;assert.match(report,/: \d+ visitors?$/);checked=true;chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Werewolf' || role==='Doctor'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===targetName);ui.fireEvent.click(target);click('COMPLETE ACTION');}
    else click('SKIP');
  }
  assert.ok(checked);
});

test('a disguised Madman Detective uses the same count-only report format', () => {
  startSetup(['A','B','C','D','E'],{detectiveShowNames:false},false);
  for(const role of ['Werewolf','Madman','Villager','Villager','Villager'])click('Add '+role);
  const disguises=Object.keys(roles).filter(r=>roles[r].team==='village' && !['villager','madman'].includes(r));
  Math.random=()=> (disguises.indexOf('detective')+0.01)/disguises.length;
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<5;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Detective'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
  let checked=false;
  for(let i=0;i<5;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Detective'){assert.match(ui.screen.getByText(/Last night’s visitors to/).textContent,/: 0 visitors$/);checked=true;chooseTargets();click('COMPLETE ACTION');}
    else if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
  }
  assert.ok(checked);
});

test('Seer and Sick Man role settings save and affect descriptions and private results', async () => {
  const names=['A','B','C','D'];startSetup(names,{},false);
  for(const role of ['Werewolf','Seer','Sick Man','Villager'])click('Add '+role);
  click('View Seer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Show exact role'));click('Close role details');
  click('View Sick Man details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.change(ui.screen.getByLabelText('Sick Man starting nights'),{target:{value:'5'}});
  ui.fireEvent.change(ui.screen.getByLabelText('Sick Man Doctor visit bonus'),{target:{value:'1'}});click('Close role details');
  const stored=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(stored.seerShowExactRole,false);assert.equal(stored.sickStartingNights,5);assert.equal(stored.sickDoctorBonus,1);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,seer:1,sickman:1,villager:1});
  const wolf=deal(names,counts).find(p=>p.role==='werewolf').name;
  click(/START GAME/);click('CONTINUE →');let sawSeer=false,sawSick=false;
  for(let i=0;i<4;i++){
    click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
    if(role==='Seer'){sawSeer=true;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===wolf);ui.fireEvent.click(target);click('COMPLETE ACTION');assert.ok(ui.screen.getByText(`${wolf} is a Werewolf.`));finishPrivateResult();}
    else if(role==='Sick Man'){sawSick=true;assert.ok(ui.screen.getByText(/Nights left without help: 5/));click('SKIP');}
    else click('SKIP');
  }
  assert.ok(sawSeer && sawSick);
});

test('Mayor, Chef and Visitor settings save from role details',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const [role,labels] of [['Mayor',['Double vote after a meeting']],['Chef',['Neutral roles count as one team']],['Visitor',['Danger when visiting a Werewolf or Serial Killer','Danger when the host is attacked']]]){
   click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
   for(const label of labels)ui.fireEvent.click(ui.screen.getByLabelText(label));
   click('Close role details');
 }
 const saved=JSON.parse(localStorage.getItem('werewolf.settings'));
 assert.equal(saved.mayorDoubleVote,false);assert.equal(saved.chefNeutralsTogether,false);assert.equal(saved.visitorDangerousRoles,false);assert.equal(saved.visitorAttackedTarget,false);
});

for(const enabled of [true,false])test(`Mayor double vote ${enabled?'on':'off'} changes the result`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{mayorDoubleVote:enabled,firstNightSafe:false},false);
 for(const role of ['Werewolf','Mayor','Doctor','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,mayor:1,doctor:1,villager:3});
 const mayor=deal(names,counts).find(p=>p.role==='mayor').name;const [a,b,other]=names.filter(n=>n!==mayor);
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Mayor')click('DECLARE EMERGENCY ASSEMBLY');else if(role==='Werewolf'||role==='Doctor'){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===a);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<6;i++){
   assert.equal(document.querySelector('.voter-name').textContent,names[i]);
   const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
   const desired=voter===mayor||voter===b?a:voter===a||voter===other?b:null;
   if(desired){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('VOTE');}else click('SKIP VOTE');
 }
 assert.ok(ui.screen.getByText(enabled?new RegExp(`${a} was voted out`):/No one was voted out/));
});

test('Chef uses configured neutral-team rule for the private report',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{chefNeutralsTogether:false},false);
 for(const role of ['Werewolf','Chef','Jester','Survivor','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,chef:1,jester:1,survivor:1,villager:2});
 const lineup=deal(names,counts),targets=lineup.filter(p=>['jester','survivor'].includes(p.role)).map(p=>p.name);
 click(/START GAME/);click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Chef'){for(const name of targets){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===name);ui.fireEvent.click(target);}click('COMPLETE ACTION');assert.ok(ui.screen.getByText(/players are on different teams/));checked=true;finishPrivateResult();}
   else click('SKIP');
 }
 assert.ok(checked);
});

for(const danger of [true,false])test(`Visitor dangerous-role option ${danger?'on':'off'} changes night outcome`,async()=>{
 const names=['A','B','C','D','E'];startSetup(names,{visitorDangerousRoles:danger,firstNightSafe:false},false);
 for(const role of ['Werewolf','Visitor','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,visitor:1,villager:3});
 const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf').name,visitor=lineup.find(p=>p.role==='visitor').name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<5;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Visitor'){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===wolf);ui.fireEvent.click(target);click('COMPLETE ACTION');}else if(role==='Werewolf'){chooseTargets(1,visitor);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(Boolean(ui.screen.queryByText(new RegExp(`${visitor} died`))),danger);
});

test('Bodyguard, Police, News Reporter and Team Checker options save in role details',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const [role,label] of [['Bodyguard','Protect players on any team'],['Police','Block the same player two nights in a row'],['News Reporter','Allow newspaper drawings'],['Team Checker','Identify the Friends team']]) {
   click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText(label));click('Close role details');
 }
 const saved=JSON.parse(localStorage.getItem('werewolf.settings'));
 assert.equal(saved.bodyguardProtectAll,true);assert.equal(saved.policeRepeatTarget,true);assert.equal(saved.journalistDrawing,false);assert.equal(saved.psychicShowFriends,false);
});

test('News Reporter can publish a headline without drawing when drawing is disabled',()=>{
 startSetup(['A','B','C','D'],{journalistDrawing:false},false);
 for(const role of ['Werewolf','News Reporter','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let saw=false;
 for(let i=0;i<4;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='News Reporter'){saw=true;assert.equal(ui.screen.queryByLabelText('Draw your newspaper picture'),null);ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Big news'}});click('PUBLISH IN THE MORNING');}else click('SKIP');
 }
 assert.ok(saw);assert.ok(ui.screen.getByText('Big news'));assert.equal(document.querySelector('.newspaper img'),null);
});

test('Police can repeat a detention when enabled while blocking remains silent',()=>{
 startSetup(['A','B','C','D','E','F'],{firstNightSafe:false,policeRepeatTarget:true});
 click('Remove Seer');click('Add Sheriff');click('Remove Doctor');click('Add Police');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(['Werewolf','Sheriff','Police'].includes(role)){const desired=role==='Werewolf'?'B':role==='Sheriff'?'C':'E';const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(/B died/));assert.equal(ui.screen.queryByText(/C died/),null);
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let saw=false;
 for(let i=0;i<5;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Police'){const oldTarget=availableTargets().find(b=>b.querySelector('strong')?.textContent==='E');assert.ok(oldTarget);saw=true;ui.fireEvent.click(oldTarget);click('COMPLETE ACTION');}
   else if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}
   else if(role==='Sheriff'){assert.equal(ui.screen.queryByText(/detained|blocked/i),null);click('SAVE BULLET FOR LATER');}
   else click('SKIP');
 }
 assert.ok(saw);
});

for(const showFriends of [true,false])test(`Team Checker ${showFriends?'identifies':'conceals'} the Friends team`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{psychicShowFriends:showFriends},false);
 for(const role of ['Werewolf','Team Checker','Friends Maker','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,psychic:1,charmer:1,villager:3});
 const lineup=deal(names,counts),friend=lineup.find(p=>p.role==='villager').name,charmer=lineup.find(p=>p.role==='charmer').name;
 click(/START GAME/);
 for(let round=1;round<=2;round++){
   click('CONTINUE →');
   for(let i=0;i<6;i++){
     click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
     if(role==='Friends Maker' && round===1){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===friend);ui.fireEvent.click(target);click('COMPLETE ACTION');}
     else if(role==='Team Checker'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===charmer);ui.fireEvent.click(target);click('COMPLETE ACTION');if(round===2)assert.ok(ui.screen.getByText(`${charmer} is on the ${showFriends?'Friends':'Neutral'} team.`));finishPrivateResult();}
     else if(role==='Werewolf' && round===2){chooseTargets();click('COMPLETE ACTION');}
     else click('SKIP');
   }
   if(round===1){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('Bodyguard protects a neutral target when any-team protection is enabled',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{bodyguardProtectAll:true,firstNightSafe:false},false);
 for(const role of ['Werewolf','Sheriff','Bodyguard','Jester','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,bodyguard:1,jester:1,villager:2});
 const lineup=deal(names,counts),jester=lineup.find(p=>p.role==='jester').name,guard=lineup.find(p=>p.role==='bodyguard').name,villager=lineup.find(p=>p.role==='villager').name,otherVillager=lineup.filter(p=>p.role==='villager')[1].name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(['Werewolf','Sheriff','Bodyguard'].includes(role)){const name=role==='Werewolf'?villager:jester;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${guard} died`)));assert.equal(ui.screen.queryByText(new RegExp(`${jester} died`)),null);
});

test('individual Villager waits persist and the longest applicable wait wins',async()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try {
   startSetup(['A','B','C','D'],{allRolesWait:true,allRolesWaitSeconds:2},false);
   for(const role of ['Werewolf','Villager','Villager','Muter'])click('Add '+role);
   for(const [role,seconds] of [['Villager','1'],['Muter','3']]){
     click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
     ui.fireEvent.change(ui.screen.getByLabelText(`${role} minimum wait seconds`),{target:{value:seconds}});click('Close role details');
   }
   assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.settings')).roleWaitSeconds,{villager:1,muted:3});
   click('View Villager details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(ui.screen.getByLabelText('Villager minimum wait seconds').value,'1');click('Close role details');
   click(/START GAME/);click('CONTINUE →');let sawMuted=false,sawVillager=false,sawWolf=false;
   for(let i=0;i<4;i++){
     click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
     const expected=role==='Muter'?3:2;
     if(role==='Muter')sawMuted=true;else if(role==='Villager')sawVillager=true;else if(role==='Werewolf')sawWolf=true;
     assert.ok(ui.screen.getByRole('status').textContent.includes(`${expected} seconds`));
     assert.ok(ui.screen.getByRole('button',{name:role==='Muter'?'SKIP MUTE':'SKIP'}).disabled);
     now+=expected*1000;await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});
     assert.equal(ui.screen.getByRole('button',{name:role==='Muter'?'SKIP MUTE':'SKIP'}).disabled,false);click(role==='Muter'?'SKIP MUTE':'SKIP');
   }
   assert.ok(sawMuted && sawVillager && sawWolf);
 } finally {Date.now=originalNow;}
});

test('Random button adds unique roster players without saving them to the library',()=>{
 localStorage.setItem('werewolf.names','[]');localStorage.setItem('werewolf.library.v1',JSON.stringify([{name:'Alex',avatar:''}]));Math.random=()=>0;
 ui.render(React.createElement(App));click(/START GAME/);
 for(let i=0;i<16;i++)click('RANDOM');
 const names=JSON.parse(localStorage.getItem('werewolf.names'));
 const library=JSON.parse(localStorage.getItem('werewolf.library.v1'));
 const avatars=JSON.parse(localStorage.getItem('werewolf.avatars.v1'));
 assert.equal(names.length,16);assert.equal(new Set(names.map(n=>n.toLowerCase())).size,16);assert.ok(!names.includes('Alex'));
 assert.deepEqual(library,[{name:'Alex',avatar:''}]);assert.ok(names.every(n=>!library.some(p=>p.name===n)));
 const assigned=names.map(n=>avatars[n.toLowerCase()]).filter(Boolean);assert.equal(assigned.length,16);assert.equal(new Set(assigned).size,16);
 assert.ok(assigned.every(a=>a.startsWith('./werewolf/avatars/')));
 assert.match(document.querySelector('.avatar-notice').textContent,/added to this game/);
 for(let i=0;i<8;i++)click('RANDOM');
 const fullNames=JSON.parse(localStorage.getItem('werewolf.names'));const fullAvatars=JSON.parse(localStorage.getItem('werewolf.avatars.v1'));
 assert.equal(fullNames.length,24);assert.equal(new Set(fullNames.map(n=>fullAvatars[n.toLowerCase()])).size,24);
 assert.ok(fullNames.some(n=>fullAvatars[n.toLowerCase()].startsWith('data:image/svg+xml,')));
 click('RANDOM');assert.match(ui.screen.getByRole('alert').textContent,/up to 24 players/);
});

test('Wolf Pup death lets the pack choose two targets',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{firstNightSafe:false,wolfPupAttackCount:3,wolfPupPassive:false},false);
 for(const role of ['Werewolf','Wolf Pup','Sheriff','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,wolfpup:1,sheriff:1,villager:5});
 const lineup=deal(names,counts),pup=lineup.find(p=>p.role==='wolfpup').name, firstVictim=lineup.find(p=>p.role==='villager').name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<8;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Wolf Pup'){assert.equal(availableTargets().length,0);click('SKIP');}
   else if(['Werewolf','Sheriff'].includes(role)){const desired=role==='Sheriff'?pup:firstVictim;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${pup} died`)));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Werewolf'){assert.ok(ui.screen.getByText(/Choose 2 targets/));chooseTargets(2);click('COMPLETE ACTION');checked=true;}else click('SKIP');
 }
 assert.ok(checked);assert.equal((ui.screen.getByText(/died/).textContent.match(/died/g)||[]).length,2);
});

test('random players remain in the roster after reopening but not the player library',()=>{
 localStorage.setItem('werewolf.names','[]');Math.random=()=>0;ui.render(React.createElement(App));click(/START GAME/);click('RANDOM');
 const name=JSON.parse(localStorage.getItem('werewolf.names'))[0],avatar=JSON.parse(localStorage.getItem('werewolf.avatars.v1'))[name.toLowerCase()];
 click('PLAYER LIBRARY');assert.ok(ui.screen.getByText('PLAYER LIBRARY EMPTY'));
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);
 assert.ok(ui.screen.getByRole('button',{name:`Edit ${name}`}));assert.equal(JSON.parse(localStorage.getItem('werewolf.avatars.v1'))[name.toLowerCase()],avatar);
 click('PLAYER LIBRARY');assert.ok(ui.screen.getByText('PLAYER LIBRARY EMPTY'));
});

test('Rabid and Hypnotizer Wolf settings save in their role details',()=>{
 startSetup(['A','B','C','D'],{},false);
 click('View Infecting Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Allow turning players into Werewolves'));click('Close role details');
 click('View Hypnotizer Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.change(ui.screen.getByLabelText('Hypnosis uses per game'),{target:{value:'2'}});click('Close role details');
 const settings=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(settings.rabidCanInfect,false);assert.equal(settings.hypnoMaxUses,2);
});

for(const enabled of [true,false])test(`Rabid infection is ${enabled?'enabled':'disabled'} on first night`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{rabidCanInfect:enabled},false);
 for(const role of ['Infecting Wolf','Doctor','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{rabidwolf:1,doctor:1,villager:4});
 const targetName=deal(names,counts).find(p=>p.role==='villager').name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Infecting Wolf'){
     if(enabled){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===targetName);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
     else {assert.equal(availableTargets().length,0);assert.ok(ui.screen.getByText(/You cannot turn anyone into a Werewolf tonight/));click('SKIP');}
   } else if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');} else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
   const player=ui.screen.getByRole('heading',{level:2}).textContent;
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(player===targetName){assert.equal(role,enabled?'Werewolf':'Villager');checked=true;}
   if(role==='Doctor'||role==='Werewolf'||role==='Infecting Wolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checked);
});

test('Hypnotist gets configured uses across nights, then runs out',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{hypnoMaxUses:2,doctorRepeatProtect:true},false);
 for(const role of ['Werewolf','Hypnotizer Wolf','Doctor','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,hypnowolf:1,doctor:1,villager:5});
 const villagers=deal(names,counts).filter(p=>p.role==='villager').map(p=>p.name),protectedName=villagers[0];
 click(/START GAME/);
 for(let round=1;round<=3;round++){
   click('CONTINUE →');let saw=false;
   for(let i=0;i<8;i++){
     click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
     if(role==='Hypnotizer Wolf'){
       if(round<=2){assert.ok(ui.screen.getByRole('button',{name:'HYPNOTIZE'}));const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===villagers[round]);assert.ok(target);ui.fireEvent.click(target);click('HYPNOTIZE');}
       else {assert.equal(ui.screen.queryByRole('button',{name:'HYPNOTIZE'}),null);click('SKIP');}
       saw=true;
     } else if(role==='Doctor' || (role==='Werewolf' && round>1)){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===protectedName);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
   }
   assert.ok(saw);
   if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<8;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('remaining Werewolf role settings save from their detail screens',()=>{
 startSetup(['A','B','C','D'],{},false);
 click('View Werewolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Randomly break tied Werewolf votes'));click('Close role details');
 for(const role of ['Lone Werewolf']){click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.change(ui.screen.getByLabelText(`${role} attack interval`),{target:{value:'2'}});click('Close role details');}
 const settings=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(settings.wolfRandomTies,true);assert.equal(settings.loneWolfInterval,2);
});

for(const role of ['Lone Werewolf'])test(`${role} follows its configured independent attack interval`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,doctorRepeatProtect:true},false);
 for(const r of [role,'Doctor','Villager','Villager','Villager','Villager'])click('Add '+r);
 click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.change(ui.screen.getByLabelText(`${role} attack interval`),{target:{value:'2'}});click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{[role==='Lone Werewolf'?'lonewolf':'strongwolf']:1,doctor:1,villager:4});
 const protectedName=deal(names,counts).find(p=>p.role==='villager').name;
 click(/START GAME/);
 for(let round=1;round<=3;round++){
   click('CONTINUE →');let saw=false;
   for(let i=0;i<6;i++){
     click(/SHOW YOUR ROLE/);const current=ui.screen.getByRole('heading',{level:2}).textContent;
     if(current===role){saw=true;if(round===2){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===protectedName);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else{assert.equal(availableTargets().length,0);assert.ok(ui.screen.getByText(/You cannot attack on your own tonight/));click('SKIP');}}
     else if(current==='Doctor'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===protectedName);ui.fireEvent.click(target);click('COMPLETE ACTION');}
     else click('SKIP');
   }
   assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
   if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

for(const randomTies of [true,false])test(`pack vote tie ${randomTies?'randomly chooses a target':'causes no kill'}`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,wolfRandomTies:randomTies},false);
 for(const role of ['Werewolf','Werewolf','Villager','Villager','Villager','Villager'])click('Add '+role);
 const victims=[];let votes=0;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Werewolf'){const target=availableTargets().find(b=>!victims.includes(b.querySelector('strong')?.textContent));assert.ok(target);victims.push(target.querySelector('strong').textContent);votes++;ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(votes,2);
 if(randomTies){const report=ui.screen.getByText(/ died/).textContent;assert.equal((report.match(/ died/g)||[]).length,1);assert.ok(victims.slice(0,2).some(name=>report.includes(`${name} died`)));}
 else assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('Survivor shields are configurable, saved, and tracked independently',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,survivor:2,villager:3});const protectedSurvivor=deal(names,counts).find(p=>p.role==='survivor').name;
 for(const role of ['Werewolf','Survivor','Survivor','Villager','Villager','Villager'])click('Add '+role);
 click('View Survivor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Survivor shields per game').value,'3');
 ui.fireEvent.change(ui.screen.getByLabelText('Survivor shields per game'),{target:{value:'1'}});
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).survivorShieldCount,1);
 click('Close role details');click('View Survivor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Survivor shields per game').value,'1');click('Close role details');
 click(/START GAME/);click('CONTINUE →');let seen=0;
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Survivor'){assert.match(document.querySelector('.panel.description > p').textContent,/1 shield left/);click('USE SHIELD (1 LEFT)');seen++;}else if(role==='Werewolf'){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===protectedSurvivor);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(seen,2);click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Survivor'){assert.ok(ui.screen.getByText('No shields remaining.'));assert.equal(ui.screen.queryByRole('button',{name:/USE SHIELD/}),null);click('SKIP');seen++;}
   else if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(seen,4);
});

test('Neutral role minimum waits persist and apply on a private turn',async()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try {
  startSetup(['A','B','C','D'],{},false);for(const role of ['Werewolf','Jester','Villager','Villager'])click('Add '+role);
  click('View Jester details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  ui.fireEvent.change(ui.screen.getByLabelText('Jester minimum wait seconds'),{target:{value:'1'}});click('Close role details');
  assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).roleWaitSeconds.jester,1);
  click(/START GAME/);click('CONTINUE →');let seen=false;
  for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Jester'){
   seen=true;assert.match(ui.screen.getByRole('status').textContent,/1 seconds/);assert.ok(ui.screen.getByRole('button',{name:'SKIP'}).disabled);
   now+=1000;await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});
  }click('SKIP');}assert.ok(seen);
 }finally{Date.now=originalNow;}
});

test('Mind Flayer starting stock and guaranteed regeneration persist and affect play',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{},false);
 for(const role of ['Werewolf','Mind Flayer','Villager','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 click('View Mind Flayer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Mind Flayer starting parasites').value,'3');assert.equal(ui.screen.getByLabelText('Mind Flayer regeneration chance').value,'20');
 ui.fireEvent.change(ui.screen.getByLabelText('Mind Flayer starting parasites'),{target:{value:'1'}});
 ui.fireEvent.change(ui.screen.getByLabelText('Mind Flayer regeneration chance'),{target:{value:'100'}});click('Close role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).mindStartingParasites,1);
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).mindRegenPercent,100);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,mindflayer:1,villager:6});
 const mind=deal(names,counts).find(p=>p.role==='mindflayer').name;
 click(/START GAME/);
 let living=8;
 for(let round=1;round<=3;round++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<living;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Mind Flayer'){
    saw=true;assert.match(document.querySelector('.panel.description > p').textContent,new RegExp(`${round===2?0:1} tiny creatures? left`));assert.equal(document.querySelector('.panel.description > p').textContent.includes('put 1 on a player'),round!==2);assert.match(document.querySelector('.panel.description > p').textContent,/Skip to get 1 more/);assert.ok(ui.screen.getByText(new RegExp(`Tiny creatures left: ${round===2?0:1}\\.`)));
    if(round===2){assert.match(document.querySelector('.turn-help').textContent,/skip and try to get one/);assert.equal(ui.screen.queryByRole('button',{name:'PLACE TINY CREATURE'}),null);click('SKIP AND TRY TO GET ONE');finishPrivateResult();}
    else {chooseTargets();click('PLACE TINY CREATURE');}
   }else if(role==='Werewolf' && round>1){chooseTargets(1,mind);click('COMPLETE ACTION');}else click('SKIP');
  }
  assert.ok(saw);
  if(round<3){if(round===2)living--;click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<living;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

for(const order of ['police-first','police-last'])test(`Police silently refunds Mind Flayer stock and placement: ${order}`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{mindStartingParasites:1},false);
 for(const role of ['Werewolf','Mind Flayer','Police','Villager','Villager','Villager'])click('Add '+role);
 const random=order==='police-first'?0.999:0;Math.random=()=>random;
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,mindflayer:1,police:1,villager:3});
 const lineup=deal(names,counts),mind=lineup.find(p=>p.role==='mindflayer').name;
 click(/START GAME/);click('CONTINUE →');let targetName,policeIndex,mindIndex;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Police'){policeIndex=i;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===mind);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else if(role==='Mind Flayer'){mindIndex=i;const target=availableTargets()[0];targetName=target.querySelector('strong').textContent;ui.fireEvent.click(target);click('PLACE TINY CREATURE');}
  else click('SKIP');
 }
 assert.equal(policeIndex<mindIndex,order==='police-first');
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Mind Flayer'){assert.ok(ui.screen.getByText(/Tiny creatures left: 1\. Players with a tiny creature: None\./));assert.ok(availableTargets().some(b=>b.querySelector('strong')?.textContent===targetName));break;}
  if(role==='Police')click('SKIP BLOCK');else if(role==='Werewolf'){chooseTargets(1,mind);click('COMPLETE ACTION');}else click('SKIP');
 }
});

test('Police silently cancels guaranteed Mind Flayer regeneration',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{mindStartingParasites:1,mindRegenPercent:100},false);
 for(const role of ['Werewolf','Mind Flayer','Police','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,mindflayer:1,police:1,villager:3});
 const mind=deal(names,counts).find(p=>p.role==='mindflayer').name;click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Police'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===mind);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else if(role==='Mind Flayer'){click('SKIP AND TRY TO GET ONE');finishPrivateResult();}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let saw=false;for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Mind Flayer'){saw=true;assert.ok(ui.screen.getByText(/Tiny creatures left: 1\./));assert.equal(ui.screen.queryByText(/You got one tiny creature/),null);break;}
  if(role==='Police')click('SKIP BLOCK');else if(role==='Werewolf'){chooseTargets(1,mind);click('COMPLETE ACTION');}else click('SKIP');
 }assert.ok(saw);
});

for(const protectedBet of [true,false])test(`Gambler betting protection ${protectedBet?'prevents':'does not prevent'} a night attack`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
 for(const role of ['Werewolf','Gambler','Villager','Villager','Villager','Villager'])click('Add '+role);
 click('View Gambler details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const protection=ui.screen.getByLabelText('Night protection while betting');assert.equal(protection.checked,true);
 if(!protectedBet)ui.fireEvent.click(protection);assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).gamblerBetProtection,protectedBet);
 click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,gambler:1,villager:4});
 const lineup=deal(names,counts),gambler=lineup.find(p=>p.role==='gambler').name,villager=lineup.find(p=>p.role==='villager').name,otherVillager=lineup.filter(p=>p.role==='villager')[1].name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf' || role==='Gambler'){const desired=role==='Werewolf'?gambler:villager;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(!!ui.screen.queryByText(new RegExp(`${gambler} died`)),!protectedBet);
});

test('Gambler configured for one prediction escapes only after the following night',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{},false);
 for(const role of ['Werewolf','Gambler','Villager','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 click('View Gambler details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Gambler correct predictions').value,'2');
 ui.fireEvent.change(ui.screen.getByLabelText('Gambler correct predictions'),{target:{value:'1'}});click('Close role details');
 click('View Gambler details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(ui.screen.getByLabelText('Gambler correct predictions').value,'1');click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,gambler:1,villager:6});
 const lineup=deal(names,counts),gambler=lineup.find(p=>p.role==='gambler').name,[predicted,victim]=lineup.filter(p=>p.role==='villager').map(p=>p.name);
 const selectName=name=>{const b=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(b,`cannot select ${name}`);ui.fireEvent.click(b);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<8;i++){click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Gambler'){assert.ok(ui.screen.getByText(/Correct predictions: 0 \/ 1/));selectName(predicted);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<8;i++){const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];if(voter===predicted)click('SKIP VOTE');else{selectName(predicted);click('VOTE');}}
 assert.equal(ui.screen.queryByText(/left the village and won/),null);click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<7;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Gambler'){assert.match(document.querySelector('.panel.description > p').textContent,/Survive tonight to win and leave in the morning/);assert.doesNotMatch(document.querySelector('.panel.description > p').textContent,/survive the next night/);assert.ok(ui.screen.getByText(/Correct predictions: 1 \/ 1/));assert.ok(ui.screen.getByText(/If you live through tonight/));click('SKIP BET');}
  else if(role==='Werewolf'){selectName(victim);click('COMPLETE ACTION');}else click('SKIP');}
 assert.ok(ui.screen.getByText(new RegExp(`${gambler} left the village and won`)));
});

for(const reflect of [true,false])test(`Raven marked attack reflection ${reflect?'enabled':'disabled'} in gameplay`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{},false);
 for(const role of ['Werewolf','Raven','Villager','Villager','Villager','Villager'])click('Add '+role);
 click('View Raven details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const checkbox=ui.screen.getByLabelText('Reflect attacks from marked players');assert.equal(checkbox.checked,true);if(!reflect)ui.fireEvent.click(checkbox);
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).ravenReflectAttackers,reflect);click('Close role details');
 click('View Raven details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(ui.screen.getByLabelText('Reflect attacks from marked players').checked,reflect);click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,raven:1,villager:4});
 const lineup=deal(names,counts),raven=lineup.find(p=>p.role==='raven').name,wolf=lineup.find(p=>p.role==='werewolf').name,villager=lineup.find(p=>p.role==='villager').name;
 const select=name=>{const b=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(b,`cannot select ${name}`);ui.fireEvent.click(b);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Raven'){assert.match(document.querySelector('.panel.description > p').textContent,/Mark 1 player tonight/);select(wolf);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Raven'){assert.match(document.querySelector('.panel.description > p').textContent,/kill your 1 marked player/);select(villager);click('COMPLETE ACTION');}else if(role==='Werewolf'){select(raven);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(!!ui.screen.queryByText(new RegExp(`${wolf} died`)),reflect);
 assert.equal(!!ui.screen.queryByText(new RegExp(`${raven} died`)),!reflect);
});

test('Serial Killer attack interval persists and controls three consecutive nights',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,survivorShieldCount:5},false);
 for(const role of ['Werewolf','Serial Killer','Survivor','Villager','Villager','Villager'])click('Add '+role);
 click('View Serial Killer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const interval=ui.screen.getByLabelText('Serial Killer attack interval');assert.equal(interval.value,'1');ui.fireEvent.change(interval,{target:{value:'2'}});click('Close role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).serialKillerInterval,2);
 click('View Serial Killer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(ui.screen.getByLabelText('Serial Killer attack interval').value,'2');click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,serialkiller:1,survivor:1,villager:3});
 const survivor=deal(names,counts).find(p=>p.role==='survivor').name;click(/START GAME/);
 for(let round=1;round<=3;round++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Survivor')click(/USE SHIELD/);
   else if(role==='Serial Killer' || role==='Werewolf'){
    if(role==='Serial Killer'){saw=true;assert.equal(document.querySelector('.panel.description > p').textContent.includes('No attack tonight'),round!==2);if(round!==2){assert.equal(availableTargets().length,0);assert.ok(ui.screen.getByText(/You cannot attack on your own tonight/));click('SKIP');continue;}}
    const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===survivor);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
   }else click('SKIP');
  }
  assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('Serial Killer interval respects first-night safety when set to every night',()=>{
 startSetup(['A','B','C','D','E'],{serialKillerInterval:1},false);
 for(const role of ['Werewolf','Serial Killer','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let saw=false;
 for(let i=0;i<5;i++){click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Serial Killer'){saw=true;assert.equal(availableTargets().length,0);assert.ok(ui.screen.getByText(/No killing ability on the first night/));}click('SKIP');}
 assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('Thief interval persists and a protected target prevents role theft',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,survivorShieldCount:5},false);
 for(const role of ['Werewolf','Thief','Survivor','Villager','Villager','Villager'])click('Add '+role);
 click('View Thief details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const interval=ui.screen.getByLabelText('Thief attack interval');assert.equal(interval.value,'1');ui.fireEvent.change(interval,{target:{value:'2'}});click('Close role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).thiefAttackInterval,2);
 click('View Thief details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(ui.screen.getByLabelText('Thief attack interval').value,'2');click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,thief:1,survivor:1,villager:3});
 const survivor=deal(names,counts).find(p=>p.role==='survivor').name;click(/START GAME/);
 for(let round=1;round<=3;round++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Survivor')click(/USE SHIELD/);
   else if(role==='Thief' || role==='Werewolf'){
    if(role==='Thief'){saw=true;assert.equal(document.querySelector('.panel.description > p').textContent.includes('No attack tonight'),round!==2);if(round!==2){assert.equal(availableTargets().length,0);assert.ok(ui.screen.getByText(/You cannot attack on your own tonight/));assert.equal(ui.screen.queryByRole('button',{name:'SKIP THEFT'}),null);click('SKIP');continue;}}
    const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===survivor);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
   }else click('SKIP');
  }
  assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('successful scheduled Thief attack changes their role on the next night',async()=>{
 const names=['A','B','C','D','E','F','G'];startSetup(names,{thiefAttackInterval:2,firstNightSafe:false,survivorShieldCount:5},false);
 for(const role of ['Werewolf','Thief','Survivor','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,thief:1,survivor:1,villager:4});
 const lineup=deal(names,counts),thief=lineup.find(p=>p.role==='thief').name,survivor=lineup.find(p=>p.role==='survivor').name,victim=lineup.find(p=>p.role==='villager').name;
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};click(/START GAME/);
 for(let round=1;round<=3;round++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<(round===3?6:7);i++){
   const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(player===thief){saw=true;if(round===3){assert.equal(role,'Villager');assert.match(document.querySelector('.panel.description > p').textContent,/You win with the village/);assert.ok(ui.screen.getByText(/You stole this role and joined its team/));click('SKIP');}else if(round===1){assert.equal(role,'Thief');click('SKIP');}else {select(victim);click('COMPLETE ACTION');}}
   else if(role==='Werewolf'){select(survivor);click('COMPLETE ACTION');}
   else if(role==='Survivor')click(/USE SHIELD/);else click('SKIP');
  }
  assert.ok(saw);
  if(round<3){if(round===2)assert.ok(ui.screen.getByText(new RegExp(`${victim} died`)));click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<(round===1?7:6);i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

for(const order of ['police-first','police-last'])test(`Police silently prevents Thief attack in either turn order: ${order}`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
 for(const role of ['Werewolf','Thief','Police','Survivor','Villager','Villager'])click('Add '+role);
 Math.random=()=>order==='police-first'?0.999:0;
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,thief:1,police:1,survivor:1,villager:2});
 const lineup=deal(names,counts),thief=lineup.find(p=>p.role==='thief').name,survivor=lineup.find(p=>p.role==='survivor').name,victim=lineup.find(p=>p.role==='villager').name;
 const select=name=>{const b=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(b,`cannot select ${name}`);ui.fireEvent.click(b);};
 click(/START GAME/);click('CONTINUE →');let policeIndex,thiefIndex;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Police'){policeIndex=i;select(thief);click('COMPLETE ACTION');}
  else if(role==='Thief'){thiefIndex=i;select(victim);click('COMPLETE ACTION');}
  else if(role==='Werewolf'){select(survivor);click('COMPLETE ACTION');}
  else if(role==='Survivor')click(/USE SHIELD/);else click('SKIP');
 }
 assert.equal(policeIndex<thiefIndex,order==='police-first');assert.ok(ui.screen.getByText('No one was killed tonight.'));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let saw=false;
 for(let i=0;i<6;i++){
  const player=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(player===thief){saw=true;assert.equal(role,'Thief');assert.equal(ui.screen.queryByText(/You stole this role/),null);assert.ok(availableTargets().some(b=>b.querySelector('strong')?.textContent===victim));break;}
  if(role==='Police')click('SKIP BLOCK');else if(role==='Werewolf'){select(survivor);click('COMPLETE ACTION');}else if(role==='Survivor')click(/USE SHIELD/);else click('SKIP');
 }assert.ok(saw);
});

for(const betrayal of [true,false])test(`White Werewolf pack betrayal ${betrayal?'enabled':'disabled'} in role selection`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
 for(const role of ['Werewolf','White Werewolf','Villager','Villager','Villager','Villager'])click('Add '+role);
 click('View White Werewolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const checkbox=ui.screen.getByLabelText('Allow votes against Werewolves you know');assert.equal(checkbox.checked,true);if(!betrayal)ui.fireEvent.click(checkbox);
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).whiteWolfBetrayPack,betrayal);click('Close role details');
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,whitewolf:1,villager:4});
 const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf').name,villager=lineup.find(p=>p.role==='villager').name,otherVillager=lineup.filter(p=>p.role==='villager')[1].name;
 click(/START GAME/);click('CONTINUE →');let saw=false;
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='White Werewolf'){saw=true;assert.equal(availableTargets().some(b=>b.querySelector('strong')?.textContent===wolf),betrayal);}
  if(role==='Werewolf' || role==='White Werewolf'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===villager);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }assert.ok(saw);
});

test('Friends Maker waits until configured night before choosing a friend',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,survivorShieldCount:5},false);
 for(const role of ['Werewolf','Friends Maker','Survivor','Villager','Villager','Villager'])click('Add '+role);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Friends Maker first friend night').value,'1');ui.fireEvent.change(ui.screen.getByLabelText('Friends Maker first friend night'),{target:{value:'2'}});click('Close role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).charmerFirstNight,2);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,charmer:1,survivor:1,villager:3});
 const lineup=deal(names,counts),survivor=lineup.find(p=>p.role==='survivor').name,friend=lineup.find(p=>p.role==='villager').name;
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};click(/START GAME/);
 for(let round=1;round<=3;round++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Friends Maker'){saw=true;const description=document.querySelector('.panel.description > p').textContent;assert.match(description,round===1?/Wait until night 2/:round===2?/Choose your 1 friend/:/already have your friend/);if(round===1){assert.ok(ui.screen.getByText(/starting on night 2/));assert.equal(availableTargets().length,0);click('SKIP');}
    else if(round===2){select(friend);click('COMPLETE ACTION');}else {assert.ok(ui.screen.getByText(new RegExp(`Your friend: ${friend}`)));click('SKIP');}}
   else if(role==='Werewolf'){select(survivor);click('COMPLETE ACTION');}else if(role==='Survivor')click(/USE SHIELD/);else click('SKIP');
  }
  assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('every role has a consistent, accessible current-settings power estimate on its card and description',async()=>{
 const {ROLE_POWER}=await vite.ssrLoadModule('/src/role-power.ts');
 assert.deepEqual(Object.keys(ROLE_POWER).sort(),Object.keys(roles).sort());
 startSetup(['A','B','C','D'],{},false);
 assert.equal(document.querySelectorAll('.random-role-card .role-power-card').length,0);
 for(const [id,meta] of Object.entries(roles)){
  assert.equal(rolePower(id,defaults),ROLE_POWER[id]);
  const score=rolePower(id,{...defaults,...legacyRoleRules});assert.ok(Number.isInteger(score)&&score>=1&&score<=10);
  const button=ui.screen.getByRole('button',{name:`View ${meta.name} details`});
  const badge=button.querySelector('.role-power-card');assert.equal(badge.textContent,String(score));
  assert.ok(button.getAttribute('aria-describedby').split(' ').includes(badge.id));assert.match(badge.getAttribute('aria-label'),new RegExp(`Power ${score} out of 10`));
  ui.fireEvent.click(button);const dialog=ui.screen.getByRole('dialog');
  assert.equal(dialog.querySelector('.role-power-detail').textContent,`POWER ${score}/10`);
  assert.ok(ui.within(dialog).getByText('Estimated power with your current settings'));
  click('Close role details');
 }
});

test('each role description offers a skins section',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const meta of Object.values(roles)){
  click(`View ${meta.name} details`);const dialog=ui.screen.getByRole('dialog');
  const section=dialog.querySelector('.role-detail-skins');assert.ok(section);assert.equal(section.open,false);
  const summary=ui.within(dialog).getByText('SKINS').closest('summary');ui.fireEvent.click(summary);
  assert.equal(section.open,true);if(['Celebrity','Friends Maker'].includes(meta.name)) assert.ok(ui.within(dialog).getByRole('group',{name:`${meta.name} skins`}));else assert.ok(ui.within(dialog).getByText('No additional skins are available.'));
  assert.ok(ui.within(dialog).getByText('ROLE SETTINGS'));click('Close role details');
 }
});

test('Celebrity skins can be selected, persist, and update role cards and private gameplay',()=>{
 startSetup(['A','B','C','D','E','F'],{firstNightSafe:true},false);
 for(const role of ['Werewolf','Celebrity','Villager','Villager','Villager','Villager'])click('Add '+role);
 const card=()=>ui.screen.getByRole('button',{name:'View Celebrity details'}).querySelector('img');
 assert.match(card().getAttribute('src'),/celebrity-new\.webp$/);
 click('View Celebrity details');ui.fireEvent.click(ui.screen.getByText('SKINS'));
 const modal=()=>ui.screen.getByRole('dialog');
 const skin=name=>ui.within(modal()).getByRole('button',{name:`${name} Celebrity skin`});
 assert.equal(skin('Default').getAttribute('aria-pressed'),'true');
 for(const [name,file,id] of [['Spotlight','celebrity-spotlight.webp','spotlight'],['Gala','celebrity-gala.webp','gala']]){
  ui.fireEvent.click(skin(name));assert.equal(skin(name).getAttribute('aria-pressed'),'true');assert.equal(JSON.parse(localStorage.getItem('werewolf.celebritySkin')),id);
  assert.ok(ui.within(modal()).getByAltText('Celebrity role artwork').getAttribute('src').endsWith(file));
 }
 click('Close role details');assert.match(card().getAttribute('src'),/celebrity-gala\.webp$/);
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);
 assert.match(card().getAttribute('src'),/celebrity-gala\.webp$/);
 click('View Celebrity details');ui.fireEvent.click(ui.screen.getByText('SKINS'));assert.equal(skin('Gala').getAttribute('aria-pressed'),'true');
 ui.fireEvent.click(skin('Default'));assert.match(ui.within(modal()).getByAltText('Celebrity role artwork').getAttribute('src'),/celebrity-new\.webp$/);
 ui.fireEvent.click(skin('Spotlight'));click('Close role details');assert.match(card().getAttribute('src'),/celebrity-spotlight\.webp$/);
 for(const role of ['Werewolf','Celebrity','Villager','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let saw=false;
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Celebrity'){saw=true;assert.match(document.querySelector('.role-art').getAttribute('src'),/celebrity-spotlight\.webp$/);}click('SKIP');
 }assert.ok(saw);
});

test('invalid saved Celebrity skin falls back safely to the existing artwork',()=>{
 localStorage.setItem('werewolf.celebritySkin',JSON.stringify('unknown'));startSetup(['A','B','C','D'],{},false);
 assert.match(ui.screen.getByRole('button',{name:'View Celebrity details'}).querySelector('img').getAttribute('src'),/celebrity-new\.webp$/);
 click('View Celebrity details');ui.fireEvent.click(ui.screen.getByText('SKINS'));
 assert.equal(ui.screen.getByRole('button',{name:'Default Celebrity skin'}).getAttribute('aria-pressed'),'true');
});

test('Friends Maker skins are selectable, persist independently, and appear in game',()=>{
 localStorage.setItem('werewolf.celebritySkin',JSON.stringify('gala'));
 startSetup(['A','B','C','D','E','F'],{},false);
 const card=()=>ui.screen.getByRole('button',{name:'View Friends Maker details'}).querySelector('img');
 assert.match(card().getAttribute('src'),/charmer-new\.webp$/);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('SKINS'));
 const modal=()=>ui.screen.getByRole('dialog');const skin=name=>ui.within(modal()).getByRole('button',{name:`${name} Friends Maker skin`});
 assert.equal(skin('Default').getAttribute('aria-pressed'),'true');
 for(const [name,file,id] of [['Moonlight','charmer-moonlight.webp','moonlight'],['Starlight','charmer-starlight.webp','starlight'],['Sapphire','charmer-sapphire.webp','sapphire'],['Sunrise','charmer-sunrise.webp','sunrise']]){
  ui.fireEvent.click(skin(name));assert.equal(skin(name).getAttribute('aria-pressed'),'true');assert.equal(JSON.parse(localStorage.getItem('werewolf.charmerSkin')),id);
  assert.ok(ui.within(modal()).getByAltText('Friends Maker role artwork').getAttribute('src').endsWith(file));
 }
 assert.equal(JSON.parse(localStorage.getItem('werewolf.celebritySkin')),'gala');click('Close role details');assert.match(card().getAttribute('src'),/charmer-sunrise\.webp$/);
 assert.match(ui.screen.getByRole('button',{name:'View Celebrity details'}).querySelector('img').getAttribute('src'),/celebrity-gala\.webp$/);
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);assert.match(card().getAttribute('src'),/charmer-sunrise\.webp$/);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('SKINS'));assert.equal(skin('Sunrise').getAttribute('aria-pressed'),'true');
 ui.fireEvent.click(skin('Default'));assert.match(ui.within(modal()).getByAltText('Friends Maker role artwork').getAttribute('src'),/charmer-new\.webp$/);
 ui.fireEvent.click(skin('Sunrise'));click('Close role details');assert.match(card().getAttribute('src'),/charmer-sunrise\.webp$/);
 for(const role of ['Werewolf','Friends Maker','Villager','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let saw=false;
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Friends Maker'){saw=true;assert.match(document.querySelector('.role-art').getAttribute('src'),/charmer-sunrise\.webp$/);chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }assert.ok(saw);
});

test('unknown saved Friends Maker skin falls back to the current default artwork',()=>{
 localStorage.setItem('werewolf.charmerSkin',JSON.stringify('unknown'));startSetup(['A','B','C','D'],{},false);
 assert.match(ui.screen.getByRole('button',{name:'View Friends Maker details'}).querySelector('img').getAttribute('src'),/charmer-new\.webp$/);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('SKINS'));
 assert.equal(ui.screen.getByRole('button',{name:'Default Friends Maker skin'}).getAttribute('aria-pressed'),'true');
});

test('game settings check and dash controls remain accessible, toggle, and persist',()=>{
 startSetup(['A','B','C','D'],{},false);
 const checked=ui.screen.getByRole('checkbox',{name:'Secret voting'});
 const unchecked=ui.screen.getByRole('checkbox',{name:'Wait time for passive roles'});
 assert.equal(checked.checked,true);assert.equal(unchecked.checked,false);
 for(const control of [checked,unchecked]){
  const visual=control.parentElement.querySelector('.setting-check-visual');assert.ok(visual);
  assert.equal(visual.getAttribute('aria-hidden'),'true');assert.ok(visual.querySelector('.setting-check-on'));assert.ok(visual.querySelector('.setting-check-off'));
 }
 ui.fireEvent.click(checked.closest('label'));ui.fireEvent.click(unchecked.closest('label'));
 assert.equal(checked.checked,false);assert.equal(unchecked.checked,true);
 const settings=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(settings.secretVotes,false);assert.equal(settings.passiveWait,true);
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);
 assert.equal(ui.screen.getByRole('checkbox',{name:'Secret voting'}).checked,false);
 assert.equal(ui.screen.getByRole('checkbox',{name:'Wait time for passive roles'}).checked,true);
});

test('Random cards open descriptions with a shared persistent uniqueness option',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const team of ['VILLAGERS','WEREWOLVES','NEUTRALS']){
  click(`View random ${team} details`);const dialog=ui.screen.getByRole('dialog');
  assert.ok(ui.within(dialog).getByRole('heading',{name:`RANDOM ${team}`}));
  assert.ok(ui.within(dialog).getByText(/Each Random card picks a role/));
  const checkbox=ui.within(dialog).getByRole('checkbox',{name:'One player per random role'});
  if(team==='VILLAGERS'){assert.equal(checkbox.checked,false);ui.fireEvent.click(checkbox);}else assert.equal(checkbox.checked,true);
  click('Close random role details');
 }
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).randomUniqueRoles,true);
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);click('View random NEUTRALS details');
 assert.equal(ui.screen.getByRole('checkbox',{name:'One player per random role'}).checked,true);click('Close random role details');
});

test('every role has an independently saved chance slider for Random cards',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const meta of Object.values(roles)){
  click(`View ${meta.name} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
  const slider=ui.screen.getByRole('slider',{name:`${meta.name} random role chance`});assert.equal(slider.value,'100');
  assert.equal(slider.min,'0');assert.equal(slider.max,'100');click('Close role details');
 }
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 ui.fireEvent.change(ui.screen.getByRole('slider',{name:'Doctor random role chance'}),{target:{value:'35'}});
 assert.ok(ui.screen.getByText('35%'));click('Close role details');
 click('View Seer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.change(ui.screen.getByRole('slider',{name:'Seer random role chance'}),{target:{value:'0'}});click('Close role details');
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.settings')).roleChances,{doctor:35,seer:0});
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByRole('slider',{name:'Doctor random role chance'}).value,'35');click('Close role details');
});

test('Random card exclusions show a recoverable error; manually added roles ignore chances',()=>{
 const chances=Object.fromEntries(Object.entries(roles).filter(([,meta])=>meta.team==='village').map(([id])=>[id,0]));
 startSetup(['A','B','C','D'],{roleChances:chances},false);
 click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add random VILLAGERS role');click(/START GAME/);
 assert.match(ui.screen.getByRole('alert').textContent,/Not enough eligible village roles/);
 click('Remove random VILLAGERS role');click('Add Villager');click(/START GAME/);
 assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));
});

test('Random unique setting prevents repeating a manually selected role',()=>{
 const chances=Object.fromEntries(Object.entries(roles).filter(([,meta])=>meta.team==='village').map(([id])=>[id,0]));chances.villager=100;
 startSetup(['A','B','C','D'],{roleChances:chances,randomUniqueRoles:true},false);
 click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add random VILLAGERS role');click(/START GAME/);
 assert.match(ui.screen.getByRole('alert').textContent,/Not enough eligible village roles/);
 click('View random VILLAGERS details');ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'One player per random role'}));click('Close random role details');click(/START GAME/);
 assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));
});

test('Random card resolves to the only role with a nonzero chance',()=>{
 const chances=Object.fromEntries(Object.entries(roles).filter(([,meta])=>meta.team==='village').map(([id])=>[id,0]));chances.seer=100;
 startSetup(['A','B','C','D'],{roleChances:chances},false);
 click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add random VILLAGERS role');click(/START GAME/);click('CONTINUE →');
 let seers=0;for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Seer'){seers++;chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}else click('SKIP');
 }assert.equal(seers,1);
});

test('distribution expands three difficulty modes and persists the chance-following setting',()=>{
 startSetup(['A','B','C','D','E','F'],{},false);
 const toggle=ui.screen.getByRole('button',{name:'RANDOM DISTRIBUTION'});assert.equal(toggle.getAttribute('aria-expanded'),'false');
 click('RANDOM DISTRIBUTION');assert.equal(toggle.getAttribute('aria-expanded'),'true');
 for(const mode of ['EASY Favors Villagers','BALANCED Even matchup','HARD Favors Werewolves'])assert.ok(ui.screen.getByRole('button',{name:mode}));
 const follow=ui.screen.getByRole('checkbox',{name:'Distribution follows role chances'});assert.equal(follow.checked,false);ui.fireEvent.click(follow);
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).distributionFollowChances,true);
 click('EASY Favors Villagers');assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/6 \/ 6/);
 click('BALANCED Even matchup');assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/6 \/ 6/);
 click('HARD Favors Werewolves');assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/6 \/ 6/);
 click('RANDOM DISTRIBUTION');assert.equal(toggle.getAttribute('aria-expanded'),'false');
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);click('RANDOM DISTRIBUTION');
 assert.equal(ui.screen.getByRole('checkbox',{name:'Distribution follows role chances'}).checked,true);
});

test('distribution excludes zero-chance roles when enabled and recovers when disabled',()=>{
 const chances=Object.fromEntries(Object.keys(roles).map(id=>[id,0]));
 startSetup(['A','B','C','D'],{roleChances:chances,distributionFollowChances:true},false);
 click('Add Villager');click('RANDOM DISTRIBUTION');click('BALANCED Even matchup');
 assert.match(ui.screen.getByRole('alert').textContent,/at least one eligible/);assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/1 \/ 4/);
 ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Distribution follows role chances'}));click('BALANCED Even matchup');
 assert.equal(ui.screen.queryByRole('alert'),null);assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/4 \/ 4/);
});

test('automatic distribution excludes Neutrals for four players and includes one for five',()=>{
 for(const count of [4,5]){
  startSetup(Array.from({length:count},(_,i)=>`Player ${i+1}`),{},false);
  click('RANDOM DISTRIBUTION');click('EASY Favors Villagers');
  const neutralCount=Object.values(roles).filter(meta=>meta.team==='neutral').reduce((sum,meta)=>{
   const card=ui.screen.getByRole('button',{name:`View ${meta.name} details`}).closest('.role-choice');
   return sum+Number(card.querySelector('.stepper span').textContent);
  },0);
  assert.equal(neutralCount,count===4?0:1);assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,new RegExp(`${count} / ${count}`));
  ui.cleanup();localStorage.clear();
 }
});

test('distribution explains when all Neutral chances are zero in a five-player game',()=>{
 const chances=Object.fromEntries(Object.entries(roles).filter(([,role])=>role.team==='neutral').map(([id])=>[id,0]));
 startSetup(['A','B','C','D','E'],{roleChances:chances,distributionFollowChances:true},false);
 click('RANDOM DISTRIBUTION');click('BALANCED Even matchup');
 assert.match(ui.screen.getByRole('alert').textContent,/eligible Neutral role/);
 ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Distribution follows role chances'}));click('BALANCED Even matchup');
 assert.equal(ui.screen.queryByRole('alert'),null);assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/5 \/ 5/);
});

test('dragging the chance slider does not swipe to another role or reset the value',()=>{
 startSetup(['A','B','C','D'],{},false);
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const slider=ui.screen.getByRole('slider',{name:'Doctor random role chance'});
 ui.fireEvent.touchStart(slider,{touches:[{clientX:280,clientY:400}]});
 ui.fireEvent.change(slider,{target:{value:'30'}});
 ui.fireEvent.touchEnd(slider,{changedTouches:[{clientX:100,clientY:400}]});
 assert.ok(ui.screen.getByRole('heading',{name:'DOCTOR'}));assert.equal(slider.value,'30');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).roleChances.doctor,30);
 ui.fireEvent.keyDown(slider,{key:'ArrowRight'});assert.ok(ui.screen.getByRole('heading',{name:'DOCTOR'}));
 const image=ui.screen.getByAltText('Doctor role artwork');
 ui.fireEvent.touchStart(image,{touches:[{clientX:280,clientY:250}]});
 ui.fireEvent.touchEnd(image,{changedTouches:[{clientX:100,clientY:250}]});
 assert.equal(ui.screen.queryByRole('heading',{name:'DOCTOR'}),null,'swiping artwork should still navigate');
 click('Previous role');assert.equal(ui.screen.getByRole('slider',{name:'Doctor random role chance'}).value,'30');
});

test('discussion slider and manual controls are bounded and persist through reopening',()=>{
 startSetup(['A','B','C','D'],{},false);const slider=ui.screen.getByRole('slider',{name:'Discussion time'});assert.equal(slider.value,'60');assert.equal(slider.min,'30');assert.equal(slider.max,'180');assert.equal(slider.step,'30');assert.equal(ui.screen.getByRole('checkbox',{name:'Manual discussion controls'}).checked,true);
 ui.fireEvent.change(slider,{target:{value:'30'}});ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Manual discussion controls'}));const saved=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(saved.discussionMinutes,0.5);assert.equal(saved.manualDiscussionControls,false);
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);assert.equal(ui.screen.getByRole('slider',{name:'Discussion time'}).value,'30');assert.equal(ui.screen.getByRole('checkbox',{name:'Manual discussion controls'}).checked,false);
});

test('role number controls use compact plus and minus buttons with their original limits',()=>{
 startSetup(['A','B','C','D'],{},false);
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const wait=ui.screen.getByRole('spinbutton',{name:'Doctor minimum wait seconds'});
 assert.equal(wait.value,'0');assert.ok(ui.screen.getByRole('button',{name:'Decrease Doctor minimum wait seconds'}).disabled);
 click('Increase Doctor minimum wait seconds');click('Increase Doctor minimum wait seconds');assert.equal(wait.value,'2');
 ui.fireEvent.change(wait,{target:{value:'100'}});assert.equal(wait.value,'15');assert.ok(ui.screen.getByRole('button',{name:'Increase Doctor minimum wait seconds'}).disabled);
 click('Close role details');click('View Survivor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const shields=ui.screen.getByRole('spinbutton',{name:'Survivor shields per game'});assert.equal(shields.value,'3');
 click('Decrease Survivor shields per game');assert.equal(shields.value,'2');click('Increase Survivor shields per game');assert.equal(shields.value,'3');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).survivorShieldCount,3);
});

test('settings number controls have angular indicators and the chance slider stays compact',()=>{
 startSetup(['A','B','C','D'],{},false);
 const duration=ui.screen.getByRole('slider',{name:'Discussion time'});assert.equal(duration.min,'30');assert.equal(duration.max,'180');
 const roleAdd=ui.screen.getByRole('button',{name:'Add Villager'});
 assert.equal(roleAdd.querySelector('.number-control-glyph'),null,'role-card buttons remain unchanged');
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const slider=ui.screen.getByRole('slider',{name:'Doctor random role chance'});
 assert.equal(slider.closest('.chance-control').querySelector('.chance-scale'),null);
 const help=document.getElementById(slider.getAttribute('aria-describedby'));
 assert.ok(help?.classList.contains('visually-hidden'));assert.match(help.textContent,/0% excludes this role/);
 assert.ok(ui.screen.getByText('100%'));assert.ok(ui.screen.getByRole('button',{name:'Increase Doctor minimum wait seconds'}).querySelector('.number-control-glyph'));
});

test('distribution uniqueness option persists and does not silently duplicate roles',()=>{
 const chances=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));chances.werewolf=100;chances.villager=100;
 startSetup(['A','B','C','D'],{distributionFollowChances:true,roleChances:chances},false);
 click('Add Villager');click('RANDOM DISTRIBUTION');const unique=ui.screen.getByRole('checkbox',{name:'One player per distribution role'});
 assert.equal(unique.checked,false);ui.fireEvent.click(unique);assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).distributionUniqueRoles,true);
 click('BALANCED Even matchup');assert.match(ui.screen.getByRole('alert').textContent,/Not enough different eligible roles/);
 assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/1 \/ 4/);
 ui.fireEvent.click(unique);click('BALANCED Even matchup');assert.equal(ui.screen.queryByRole('alert'),null);
 assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/4 \/ 4/);
});

test('Random card chance setting can ignore or respect zero chance roles',()=>{
 const chances=Object.fromEntries(Object.entries(roles).filter(([,meta])=>meta.team==='village').map(([id])=>[id,0]));
 startSetup(['A','B','C','D'],{roleChances:chances},false);
 click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add random VILLAGERS role');
 click('View random VILLAGERS details');const follow=ui.screen.getByRole('checkbox',{name:'Random cards follow role chances'});
 assert.equal(follow.checked,true);click('Close random role details');click(/START GAME/);assert.match(ui.screen.getByRole('alert').textContent,/Not enough eligible village roles/);
 click('View random NEUTRALS details');ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Random cards follow role chances'}));click('Close random role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).randomFollowChances,false);click(/START GAME/);
 assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));
});

test('role settings and player library checkboxes share the angular check and dash styling',()=>{
 startSetup(['A','B','C','D'],{},false);click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 for(const checkbox of ui.screen.getAllByRole('checkbox')){
  const visual=checkbox.parentElement.querySelector('.setting-check-visual');assert.ok(visual);assert.equal(visual.getAttribute('aria-hidden'),'true');
 }
 const self=ui.screen.getByLabelText('Protect yourself');assert.equal(self.checked,true);ui.fireEvent.click(self);assert.equal(self.checked,false);
 ui.cleanup();localStorage.clear();ui.render(React.createElement(App));click(/START GAME/);click('Add player');
 const remember=ui.screen.getByRole('checkbox',{name:/Add to player library/});assert.ok(remember.parentElement.querySelector('.setting-check-visual'));
 const before=remember.checked;ui.fireEvent.click(remember);assert.notEqual(remember.checked,before);
});

test('every role can complete a safe first night without attack deaths', async t => {
  for (const [id,meta] of Object.entries(roles)) await t.test(meta.name, () => {
    startSetup(['A','B','C','D','E','F'],{firstNightSafe:true});
    for(let i=0;i<3;i++) click('Remove Villager');
    click('Remove Doctor');click('Remove Seer');
    for(let i=0;i<4;i++) click('Add Villager');
    click(`Add ${meta.name}`);click(/START GAME/);click('CONTINUE →');
    const seen=[];for(let i=0;i<6;i++)seen.push(actCurrentRole());
    if(id==='madman'){assert.ok(!seen.includes('Madman'));assert.ok(seen.includes('Police'));}
    else assert.ok(seen.includes(meta.name));
    assert.ok(ui.screen.getByText('No one was killed tonight.'));
    ui.cleanup();localStorage.clear();Math.random=originalRandom;
  });
});

test('safe first night preserves Mayor and Survivor abilities, safe visit, and plays through village victory',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:true,survivorShieldCount:1},false);
 for(const role of ['Werewolf','Mayor','Survivor','Visitor','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,mayor:1,survivor:1,visitor:1,villager:2});
 const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf').name,villager=lineup.find(p=>p.role==='villager').name,otherVillager=lineup.filter(p=>p.role==='villager')[1].name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Mayor'){assert.equal(ui.screen.queryByRole('button',{name:'DECLARE EMERGENCY ASSEMBLY'}),null);assert.ok(ui.screen.getByText(/emergency assembly is saved/));click('SKIP');}
  else if(role==='Survivor'){assert.equal(ui.screen.queryByRole('button',{name:/USE SHIELD/}),null);assert.ok(ui.screen.getByText(/shields are saved/));click('SKIP');}
  else if(role==='Visitor'){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===wolf);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else click('SKIP');
 }
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Mayor')click('DECLARE EMERGENCY ASSEMBLY');
  else if(role==='Survivor')click('USE SHIELD (1 LEFT)');
  else if(role==='Werewolf'||role==='Visitor'){const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===(role==='Visitor'?otherVillager:villager));ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else click('SKIP');
 }
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<6;i++){
  const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];
  const desired=voter===wolf?villager:wolf;const target=availableTargets().find(x=>x.querySelector('strong')?.textContent===desired);ui.fireEvent.click(target);click('VOTE');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${wolf} was voted out`)));click('CONTINUE →');assert.ok(ui.screen.getByRole('heading',{name:'VILLAGE WINS'}));
});

test('role instructions update as settings change and match the night turn',async()=>{
 const names=['A','B','C','D'];startSetup(names,{firstNightSafe:true},false);
 for(const role of ['Werewolf','Doctor','Villager','Villager'])click('Add '+role);
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const description=()=>ui.screen.getByRole('dialog').querySelector('#role-details-description').textContent;
 assert.match(description(),/you can pick yourself/i);
 ui.fireEvent.click(ui.screen.getByLabelText('Protect yourself'));
 ui.fireEvent.click(ui.screen.getByLabelText('Protect the same player on two nights in a row'));
 assert.match(description(),/you cannot protect yourself/i);assert.match(description(),/you can pick the same player two nights in a row/i);
 const expected=description();click('Close role details');click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Doctor'){assert.equal(document.querySelector('.panel.description > p').textContent,expected);chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
});

test('the remaining portraits can be selected and appear on the night handoff',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
 ui.render(React.createElement(App));click(/START GAME/);
 for(let i=0;i<4;i++){
  click('Edit A');click('Choose or change game avatar');click(/Game avatars/);
  const choice=ui.screen.getByRole('button',{name:`Choose avatar ${16+i}`});
  const path=`./werewolf/avatars/player${[20,21,23,24][i]}.webp`;
  assert.equal(choice.querySelector('img').getAttribute('src'),path);
  ui.fireEvent.click(choice);click('SAVE PLAYER');
  assert.equal(JSON.parse(localStorage.getItem('werewolf.avatars.v1')).a,path);
 }
 click(/CHOOSE ROLES/);for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let sawA=false;
 for(let i=0;i<4;i++){
  if(ui.screen.getByRole('heading',{level:2}).textContent==='A'){sawA=true;assert.equal(document.querySelector('.pass-avatar img').getAttribute('src'),'./werewolf/avatars/player24.webp');}
  click(/SHOW YOUR ROLE/);click('SKIP');
 }
 assert.ok(sawA);
});

test('safe first-night warning is shown once, and Wolf Hunter says water with power points during play',()=>{
 startSetup(['A','B','C','D'],{firstNightSafe:true},false);
 for(const role of ['Werewolf','Wolf Hunter','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let seen=false;
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Wolf Hunter'){
   seen=true;assert.ok(ui.screen.getByText(/No killing ability on the first night/));
   const description=document.querySelector('.panel.description').textContent;
   assert.match(description,/Use water/);assert.doesNotMatch(description,/holy|cannot attack on the first night/i);
   assert.equal(document.querySelector('.role-power-game').textContent,String(ROLE_POWER.templar));
   assert.ok(document.querySelector('.role-art-frame .role-power-game'));assert.match(document.querySelector('.role-power-game').getAttribute('aria-label'),/out of 10/);
   assert.ok(ui.screen.getByRole('button',{name:'SAVE WATER FOR LATER'}));
  }
  click('SKIP');
 }
 assert.ok(seen);
});

test('button sounds and vibration work, stay private, respect settings and never fire for disabled controls',()=>{
 const previousAudio=Object.getOwnPropertyDescriptor(window,'AudioContext');
 const previousVibrate=Object.getOwnPropertyDescriptor(window.navigator,'vibrate');
 const vibrations=[],notes=[];
 class AudioContextMock {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  createOscillator(){return {type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){notes.push('tap');},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  close(){return Promise.resolve();}
 }
 Object.defineProperty(window,'AudioContext',{configurable:true,value:AudioContextMock});
 Object.defineProperty(window.navigator,'vibrate',{configurable:true,value:duration=>{vibrations.push(duration);return true;}});
 try {
  startSetup(['A','B','C','D'],{sounds:true,haptics:true},false);
  notes.length=0;vibrations.length=0;
  click('Add Werewolf');assert.deepEqual(notes,['tap']);assert.deepEqual(vibrations,[8]);
  click('Add Villager');assert.deepEqual(notes,['tap','tap']);assert.deepEqual(vibrations,[8,8]);
  const disabled=ui.screen.getByRole('button',{name:/START GAME/});assert.equal(disabled.disabled,true);
  ui.fireEvent.click(disabled);assert.equal(notes.length,2);assert.equal(vibrations.length,2);
  click('Go back');click('Go back');click('SETTINGS');ui.fireEvent.click(ui.screen.getByLabelText('Button sounds'));assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).buttonSounds,false);
  click('DONE');click('START GAME');click(/CHOOSE ROLES/);notes.length=0;vibrations.length=0;click('Add Doctor');assert.equal(notes.length,0);assert.deepEqual(vibrations,[8]);
  click('Go back');click('Go back');click('SETTINGS');ui.fireEvent.click(ui.screen.getByLabelText('Button vibration'));assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).haptics,false);
  click('DONE');click('START GAME');click(/CHOOSE ROLES/);notes.length=0;vibrations.length=0;click('Add Seer');assert.equal(notes.length,0);assert.equal(vibrations.length,0);
  click('Go back');click('Go back');click('SETTINGS');ui.fireEvent.click(ui.screen.getByLabelText('Button sounds'));assert.equal(notes.length,1,'enabling sound previews the tap');
  ui.fireEvent.click(ui.screen.getByLabelText('Button vibration'));assert.deepEqual(vibrations,[8],'enabling vibration gives a tap');
  assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).haptics,true);
 } finally {
  ui.cleanup();
  if(previousAudio)Object.defineProperty(window,'AudioContext',previousAudio);else delete window.AudioContext;
  if(previousVibrate)Object.defineProperty(window.navigator,'vibrate',previousVibrate);else delete window.navigator.vibrate;
 }
});

test('unavailable sound or vibration cannot stop button actions',()=>{
 const oldAudio=Object.getOwnPropertyDescriptor(window,'AudioContext'),oldVibrate=Object.getOwnPropertyDescriptor(window.navigator,'vibrate');
 Object.defineProperty(window,'AudioContext',{configurable:true,value:class {constructor(){throw Error('unavailable');}}});
 Object.defineProperty(window.navigator,'vibrate',{configurable:true,value:()=>{throw Error('blocked');}});
 try {startSetup(['A','B','C','D'],{sounds:true,haptics:true},false);click('Add Werewolf');assert.match(ui.screen.getByRole('button',{name:/START GAME/}).textContent,/1 \/ 4/);}
 finally{ui.cleanup();if(oldAudio)Object.defineProperty(window,'AudioContext',oldAudio);else delete window.AudioContext;if(oldVibrate)Object.defineProperty(window.navigator,'vibrate',oldVibrate);else delete window.navigator.vibrate;}
});

test('older saved music-off settings still give button sounds and a master mute',()=>{
 const old=Object.getOwnPropertyDescriptor(window,'AudioContext');const notes=[];
 class MockAudio {constructor(){this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){notes.push(1);},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}close(){return Promise.resolve();}}
 Object.defineProperty(window,'AudioContext',{configurable:true,value:MockAudio});
 try {
  startSetup(['A','B','C','D'],{sounds:false},false);
  notes.length=0;click('Add Werewolf');assert.equal(notes.length,1,'old music mute must not mute new button feedback');
  click('Add Villager');click('Add Villager');click('Add Villager');click(/START GAME/);
  click('SETTINGS');assert.equal(ui.screen.queryByLabelText('Background music'),null);assert.equal(ui.screen.getByLabelText('Button sounds').checked,true);click('TURN ALL OFF');click('DONE');
  assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).buttonSounds,false);
  notes.length=0;click('CONTINUE →');assert.equal(notes.length,0,'master mute silences taps too');
 } finally {ui.cleanup();if(old)Object.defineProperty(window,'AudioContext',old);else delete window.AudioContext;}
});

test('button audio falls back to a local sound file without Web Audio',()=>{
 const oldContext=Object.getOwnPropertyDescriptor(window,'AudioContext'),oldWebkit=Object.getOwnPropertyDescriptor(window,'webkitAudioContext'),oldAudio=window.Audio;const played=[];
 Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
 window.Audio=class {constructor(src){this.src=src;}play(){played.push(this.src);return Promise.resolve();}};
 try {startSetup(['A','B','C','D'],{sounds:false,buttonSounds:true},false);played.length=0;click('Add Werewolf');assert.deepEqual(played,['./werewolf/audio/buttons/v1/button-add.wav']);}
 finally{ui.cleanup();window.Audio=oldAudio;if(oldContext)Object.defineProperty(window,'AudioContext',oldContext);else delete window.AudioContext;if(oldWebkit)Object.defineProperty(window,'webkitAudioContext',oldWebkit);else delete window.webkitAudioContext;}
});

test('removed avatar 18 is cleared from saved players and available as a Friends Maker skin',()=>{
 const old='./werewolf/avatars/player22.webp',updated='./werewolf/avatars/player22-covered.webp';
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
 localStorage.setItem('werewolf.avatars.v1',JSON.stringify({a:old,b:updated}));
 localStorage.setItem('werewolf.library.v1',JSON.stringify([{name:'A',avatar:old}]));
 ui.render(React.createElement(App));click(/START GAME/);
 assert.equal(ui.screen.getByRole('button',{name:'Edit A'}).querySelector('img'),null);
 assert.equal(ui.screen.getByRole('button',{name:'Edit B'}).querySelector('img'),null);
 click('Edit A');click('Choose or change game avatar');click(/Game avatars/);
 assert.ok(![...document.querySelectorAll('.avatar-picker img')].some(img=>img.getAttribute('src')?.includes('player22')));
 ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('SKINS'));click('Sunrise Friends Maker skin');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.charmerSkin')),'sunrise');
 assert.equal(ui.screen.getByRole('button',{name:'Sunrise Friends Maker skin'}).querySelector('img').getAttribute('src'),'./werewolf/charmer-sunrise.webp');
});

test('Police notice remains configurable while the Pup and Hypnotist rules are permanent', async()=>{
 const {defaults,roleDescription}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 assert.equal(defaults.policeNotifyBlocked,true);
 assert.match(roleDescription('police',defaults),/morning report/);
 assert.match(roleDescription('hypnowolf',defaults),/cannot vote to attack/);
 assert.match(roleDescription('wolfpup',defaults),/cannot attack/);
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
 ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);
 click('View Police details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const checkbox=ui.screen.getByLabelText('Show blocked abilities in the morning');assert.equal(checkbox.checked,true);ui.fireEvent.click(checkbox);click('Close role details');
 for(const role of ['Hypnotizer Wolf','Wolf Pup']){
   click(`View ${role} details`);ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
   assert.equal(ui.screen.queryByLabelText('Only hypnotize, do not attack'),null);
   assert.equal(ui.screen.queryByLabelText('Do not attack before death'),null);
   assert.equal(ui.screen.queryByLabelText('Wolf Pup revenge targets'),null);click('Close role details');
 }
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).policeNotifyBlocked,false);
});

for(const enabled of [true,false]) for(const order of ['before','after']) test(`Police morning report notice ${enabled?'on':'off'}, Police ${order} Doctor`,()=>{
 startSetup(['A','B','C','D','E','F'],{policeNotifyBlocked:enabled});click('Remove Seer');click('Add Police');
 if(order==='before') Math.random=()=>0.999;
 click(/START GAME/);click('CONTINUE →');const doctor=order==='before'?'F':'E';
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Doctor'||role==='Police'){
     const desired=role==='Police'?doctor:'B';const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
   }else click('SKIP');
 }
 if(enabled){
   assert.ok(ui.screen.getByText(`${doctor}'s ability was blocked last night`));
   assert.equal(ui.screen.queryByText(/Police/i),null);
 }else assert.equal(ui.screen.queryByText(/ability was blocked last night/),null);
 assert.equal(ui.screen.queryByRole('button',{name:'SHOW PRIVATE MESSAGE'}),null);
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('Hypnotist and Pup never attack even with old saved settings',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,hypnoOnly:false,wolfPupPassive:false},false);
 for(const role of ['Hypnotizer Wolf','Wolf Pup','Villager','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let sawPup=false,sawHypno=false;
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Wolf Pup'){sawPup=true;assert.equal(availableTargets().length,0);click('SKIP');}
   else if(role==='Hypnotizer Wolf'){
     sawHypno=true;assert.ok(ui.screen.getByRole('button',{name:'HYPNOTIZE'}));
     assert.equal(ui.screen.queryByRole('button',{name:'COMPLETE ACTION'}),null);
     assert.equal(ui.screen.queryByRole('button',{name:'CHOOSE HYPNOSIS'}),null);
     chooseTargets();click('HYPNOTIZE');
   } else click('SKIP');
 }
 assert.ok(sawPup && sawHypno);assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('Police morning report lists multiple blocked players',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{policeNotifyBlocked:true},false);
 for(const role of ['Werewolf','Police','Police','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,police:2,villager:3});
 const targets=deal(names,counts).filter(p=>p.role==='villager').slice(0,2).map(p=>p.name);let selected=0;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Police'){const desired=targets[selected++];const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target,`target ${targets[selected-1]} available ${availableTargets().map(b=>b.querySelector('strong')?.textContent).join(',')}`);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 for(const name of targets)assert.ok(ui.screen.getByText(`${name}'s ability was blocked last night`));
 assert.equal(ui.screen.queryByRole('button',{name:'SHOW PRIVATE MESSAGE'}),null);
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('passive Wolf Pup revenge also follows execution',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{wolfPupPassive:true},false);
 for(const role of ['Werewolf','Wolf Pup','Villager','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,wolfpup:1,villager:6});
 const pup=deal(names,counts).find(p=>p.role==='wolfpup').name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<8;i++){click(/SHOW YOUR ROLE/);click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<8;i++){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===pup);if(target){ui.fireEvent.click(target);click('VOTE');}else click('SKIP VOTE');}
 assert.ok(ui.screen.getByText(new RegExp(`${pup} was voted out`)));
 click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<7;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Werewolf'){assert.ok(ui.screen.getByText(/Choose 2 targets/));chooseTargets(2);click('COMPLETE ACTION');checked=true;}else click('SKIP');
 }
 assert.ok(checked);assert.equal((ui.screen.getByText(/died/).textContent.match(/died/g)||[]).length,2);
});

test('hypnosis-only works on the safe first night and is not offered after its last use',()=>{
 startSetup(['A','B','C','D','E','F'],{hypnoOnly:true},false);
 for(const role of ['Hypnotizer Wolf','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Hypnotizer Wolf'){assert.ok(ui.screen.getByRole('button',{name:'HYPNOTIZE'}));chooseTargets();click('HYPNOTIZE');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let checked=false;
 for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Hypnotizer Wolf'){assert.equal(availableTargets().length,0);assert.equal(ui.screen.queryByRole('button',{name:'HYPNOTIZE'}),null);checked=true;}
   click('SKIP');
 }
 assert.ok(checked);
});

test('a Police-blocked Hypnotist keeps the use for the next night',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{policeNotifyBlocked:false},false);
 for(const role of ['Hypnotizer Wolf','Police','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{hypnowolf:1,police:1,villager:4});
 const lineup=deal(names,counts),hypno=lineup.find(p=>p.role==='hypnowolf').name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Police'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===hypno);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else if(role==='Hypnotizer Wolf'){chooseTargets();click('HYPNOTIZE');}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Hypnotizer Wolf'){assert.ok(ui.screen.getByRole('button',{name:'HYPNOTIZE'}));checked=true;break;}
  if(role==='Police') click('SKIP BLOCK');else click('SKIP');
 }
 assert.ok(checked);
});

test('holding a role excludes it from random, suppresses opening, persists and can be undone',async()=>{
 startSetup(['A','B','C','D'],{randomFollowChances:false},false);
 const card=ui.screen.getByRole('button',{name:'View Doctor details'});
 const OldPointer=window.PointerEvent;
 window.PointerEvent=class extends window.MouseEvent {constructor(type,init={}){super(type,init);Object.defineProperty(this,'isPrimary',{value:true});Object.defineProperty(this,'pointerId',{value:1});}};
 const down=()=>ui.fireEvent.pointerDown(card,{button:0,clientX:20,clientY:20});
 const up=()=>ui.fireEvent.pointerUp(card,{button:0,clientX:20,clientY:20});
 try{
   down();await ui.act(()=>new Promise(resolve=>setTimeout(resolve,350)));assert.equal(card.classList.contains('role-random-excluded'),false);await ui.act(()=>new Promise(resolve=>setTimeout(resolve,200)));up();ui.fireEvent.click(card);
   assert.equal(ui.screen.queryByRole('dialog'),null);assert.ok(card.classList.contains('role-random-excluded'));
   assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.settings')).disabledRandomRoles,['doctor']);
   // Movement cancels a hold, allowing phone scrolling instead of changing a role.
   down();ui.fireEvent.pointerMove(card,{button:0,clientX:20,clientY:60});await ui.act(()=>new Promise(resolve=>setTimeout(resolve,550)));up();
   assert.ok(card.classList.contains('role-random-excluded'));
   down();await ui.act(()=>new Promise(resolve=>setTimeout(resolve,550)));up();ui.fireEvent.click(card);
   assert.equal(card.classList.contains('role-random-excluded'),false);assert.equal(ui.screen.queryByRole('dialog'),null);
   down();await ui.act(()=>new Promise(resolve=>setTimeout(resolve,550)));up();ui.fireEvent.click(card);
   ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);
   const restored=ui.screen.getByRole('button',{name:'View Doctor details'});assert.ok(restored.classList.contains('role-random-excluded'));
   click('View Doctor details');assert.ok(ui.screen.getByRole('dialog'));click('Close role details');
   click('Add Doctor');assert.equal(restored.closest('.role-choice').querySelector('.stepper span').textContent,'1');
 }finally{window.PointerEvent=OldPointer;}
});

test('disabled roles block Random cards and distribution even when chances are off',()=>{
 const excluded=Object.keys(roles).filter(id=>roles[id].team==='village');
 startSetup(['A','B','C','D'],{disabledRandomRoles:excluded,randomFollowChances:false,distributionFollowChances:false},false);
 click('Add Werewolf');click('Add Villager');click('Add Villager');click('Add random VILLAGERS role');click(/START GAME/);
 assert.match(ui.screen.getByRole('alert').textContent,/Enable more roles/);
 click('RANDOM DISTRIBUTION');click('BALANCED Even matchup');assert.match(ui.screen.getByRole('alert').textContent,/Enable more roles/);
});

test('known wolves see each teammate role and personal choices, while Lone Wolf sees neither',async()=>{
 const names=Array.from({length:14},(_,i)=>`P${i+1}`);startSetup(names,{firstNightSafe:false},false);
 for(const role of ['Werewolf','Werewolf','Strong Werewolf','Lone Werewolf','Wolf Pup','Hypnotizer Wolf',...Array(8).fill('Villager')])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:2,strongwolf:1,lonewolf:1,wolfpup:1,hypnowolf:1,villager:8});
 Math.random=()=>0.25;const lineup=deal(names,counts), victim=lineup.find(p=>p.role==='villager').name;
 const hypnotist=lineup.find(p=>p.role==='hypnowolf'), pup=lineup.find(p=>p.role==='wolfpup'), lone=lineup.find(p=>p.role==='lonewolf');
 const earlier=[];let sawPup=false,sawLone=false,sawStrong=false;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<14;i++){
  const player=ui.screen.getByRole('heading',{level:2}).textContent;const me=lineup.find(p=>p.name===player);
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(['Werewolf','Strong Werewolf','Hypnotizer Wolf','Wolf Pup'].includes(role)){
   if(player!==pup.name)assert.match(document.querySelector('.wolf-team-list').textContent,new RegExp(`${pup.name} is Wolf Pup`));
   assert.doesNotMatch(document.querySelector('.wolf-team-list').textContent,new RegExp(`${lone.name} is Lone Werewolf`));
   for(const previous of earlier)assert.ok(ui.screen.getByLabelText(`${previous.name} chose ${victim} to ${previous.role==='hypnowolf'?'hypnotize':'attack'}`));
   if(role==='Wolf Pup'){sawPup=true;assert.equal(availableTargets().length,0);click('SKIP');continue;}
   if(role==='Strong Werewolf'){
    sawStrong=true;assert.equal(document.querySelectorAll('.wolf-choice-markers .wolf-choice').length,3);
    assert.equal(ui.screen.queryByLabelText(`${lone.name} chose ${victim} to attack`),null);
   }
   const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===victim);assert.ok(target);ui.fireEvent.click(target);
   assert.ok(ui.screen.getByLabelText(`Your choice: ${victim}`));
   assert.ok(ui.screen.getByLabelText(`Your choice: ${victim}`).closest('.target-portrait'),'your mark stays inside the avatar');
   assert.equal(target.querySelectorAll(':scope > .wolf-choice-markers, :scope > .wolf-target-count').length,0,'no badges below the avatar');
   if(role==='Strong Werewolf'){
    click('TEAM CHOICES');const dialog=ui.screen.getByRole('dialog',{name:'TEAM CHOICES'});
    for(const previous of earlier)assert.ok(dialog.textContent.includes(previous.name));
    assert.ok(dialog.textContent.includes('intentions, not confirmed kills'));
    assert.ok(dialog.textContent.includes(me.name+' (you)'));
    assert.ok(!dialog.textContent.includes(lone.name+' (you)'));
    click('Close team choices');assert.equal(ui.screen.queryByRole('dialog',{name:'TEAM CHOICES'}),null);
    assert.equal(target.getAttribute('aria-pressed'),'true','reading details does not change your choice');
   }
   assert.match(ui.screen.getByLabelText(`Your choice: ${victim}`).textContent,new RegExp(String(me.id+1).padStart(2,'0')));
   click(role==='Hypnotizer Wolf'?'HYPNOTIZE':'COMPLETE ACTION');earlier.push(me);
  }else if(role==='Lone Werewolf'){
   sawLone=true;assert.equal(document.querySelectorAll('.wolf-choice, .wolf-team-badge, .wolf-team-list').length,0);
   const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===victim);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
  }else {assert.equal(document.querySelectorAll('.wolf-choice, .wolf-team-badge, .wolf-team-list').length,0);click('SKIP');}
 }
 assert.ok(sawPup && sawLone && sawStrong);assert.ok(earlier.some(p=>p.id===hypnotist.id));
 assert.ok(ui.screen.getByText(new RegExp(`${victim} died`)));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<13;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let checkedReset=false;
 for(let i=0;i<13;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(['Werewolf','Strong Werewolf','Hypnotizer Wolf','Wolf Pup'].includes(role)){
   assert.equal(document.querySelectorAll('.wolf-choice').length,0,'old choices must not carry into the next night');checkedReset=true;break;
  }
  if(role==='Lone Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checkedReset);
});

test('White Werewolf looks like an ordinary Werewolf to known teammates',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
 for(const role of ['Werewolf','White Werewolf','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,whitewolf:1,villager:4});const white=deal(names,counts).find(p=>p.role==='whitewolf');
 click(/START GAME/);click('CONTINUE →');let seen=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'){assert.match(document.querySelector('.wolf-team-list').textContent,new RegExp(`${white.name} is Werewolf`));assert.doesNotMatch(document.querySelector('.wolf-team-list').textContent,new RegExp(`${white.name} is White Werewolf`));seen=true;chooseTargets();click('COMPLETE ACTION');}
  else if(role==='White Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(seen);
});

for(const exact of [true,false]) test(`Seer popup shows only the ${exact?'apparent role':'allowed wolf reading'} with the target portrait`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{seerShowExactRole:exact},false);
 for(const role of ['Werewolf','Seer','Serial Killer','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,seer:1,serialkiller:1,villager:3});
 const target=deal(names,counts).find(p=>p.role==='serialkiller').name;
 click(/START GAME/);click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Seer'){
   const button=availableTargets().find(b=>b.querySelector('strong')?.textContent===target);assert.ok(button);ui.fireEvent.click(button);click('COMPLETE ACTION');
   const dialog=ui.screen.getByRole('dialog',{name:'ROLE CHECK'});assert.equal(dialog.getAttribute('aria-modal'),'true');
   assert.equal(dialog.querySelector('.private-info-person strong').textContent,target);assert.match(dialog.textContent,exact?/is Villager/:/is not a Werewolf/);assert.doesNotMatch(dialog.textContent,/Serial Killer/);
   const roleArt=dialog.querySelector('.private-info-role-art img');if(exact)assert.match(roleArt.getAttribute('src'),/villager\.webp$/);else assert.equal(roleArt,null);
   assert.ok(document.querySelector('.page.action'),'role screen remains behind the popup');assert.equal(document.activeElement,ui.within(dialog).getByRole('button',{name:'OK · HIDE RESULT'}));
   click('OK · HIDE RESULT');checked=true;
  }else click('SKIP');
 }
 assert.ok(checked);
});

test('Celebrity popup shows the correct player and selected Celebrity skin only to its recipient',async()=>{
 const names=['A','B','C','D'];startSetup(names,{},false);
 for(const role of ['Werewolf','Celebrity','Villager','Villager'])click('Add '+role);
 click('View Celebrity details');ui.fireEvent.click(ui.screen.getByText('SKINS'));click('Spotlight Celebrity skin');click('Close role details');
 const {deal,celebrityReveals}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,celebrity:1,villager:2});
 const lineup=deal(names,counts),star=lineup.find(p=>p.role==='celebrity'),reveal=celebrityReveals(lineup,[],[],()=>0), recipient=Number(Object.keys(reveal)[0]);
 click(/START GAME/);click('CONTINUE →');let checked=false;
 for(let i=0;i<4;i++){
  const player=ui.screen.getByRole('heading',{level:2}).textContent;ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  if(player===lineup[recipient].name){
   const dialog=ui.screen.getByRole('dialog',{name:'CELEBRITY'});assert.equal(dialog.querySelector('.private-info-person strong').textContent,star.name);assert.match(dialog.querySelector('.private-info-role-art img').getAttribute('src'),/celebrity-spotlight\.webp$/);
   assert.equal(document.querySelector('fieldset.role-turn-content').disabled,true);click('OK · HIDE INFO');checked=true;
  }else assert.equal(ui.screen.queryByRole('dialog'),null);
  click('SKIP');
 }
 assert.ok(checked);
});

test('Rabid conversion and Friends Maker friendship show private popups only after they succeed',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{},false);
 for(const role of ['Infecting Wolf','Friends Maker','Villager','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{rabidwolf:1,charmer:1,villager:6});
 const lineup=deal(names,counts),villagers=lineup.filter(p=>p.role==='villager'),infected=villagers[0],friend=villagers[1],charmer=lineup.find(p=>p.role==='charmer');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<8;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Infecting Wolf' || role==='Friends Maker'){
   const desired=role==='Infecting Wolf'?infected.name:friend.name;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
  }else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<8;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let conversion=false,friendship=false;
 for(let i=0;i<8;i++){
  const player=ui.screen.getByRole('heading',{level:2}).textContent;ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  if(player===infected.name){const dialog=ui.screen.getByRole('dialog',{name:'YOUR NEW ROLE'});assert.match(dialog.textContent,/Infecting Wolf turned you into a Werewolf/);assert.match(dialog.querySelector('.private-info-role-art img').getAttribute('src'),/werewolf\.webp$/);click('OK · HIDE INFO');conversion=true;}
  else if(player===friend.name || player===charmer.name){const dialog=ui.screen.getByRole('dialog',{name:'YOUR FRIEND'});assert.match(dialog.textContent,/Friends team/);assert.equal(dialog.querySelector('.private-info-role-art'),null);click('OK · HIDE INFO');friendship=true;}
  else assert.equal(ui.screen.queryByRole('dialog'),null);
  const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'||role==='Infecting Wolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(conversion && friendship);
});

test('Chef result popup shows both guests without revealing their roles',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{},false);
 for(const role of ['Werewolf','Chef','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,chef:1,villager:4});
 const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf'),villager=lineup.find(p=>p.role==='villager');
 click(/START GAME/);click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Chef'){
   for(const name of [wolf.name,villager.name]){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);}
   click('COMPLETE ACTION');const dialog=ui.screen.getByRole('dialog',{name:'DIFFERENT TEAMS'});
   assert.match(dialog.textContent,/different teams/);assert.deepEqual([...dialog.querySelectorAll('.private-info-person strong')].map(el=>el.textContent),[wolf.name,villager.name]);
   assert.equal(dialog.querySelector('.private-info-role-art'),null);click('OK · HIDE RESULT');checked=true;
  }else click('SKIP');
 }
 assert.ok(checked);
});

test('Police-delayed Seer report opens as a private popup on the next turn',()=>{
 startSetup(['A','B','C','D','E','F'],{policeNotifyBlocked:false});click('Remove Villager');click('Add Police');click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(['Seer','Doctor','Police'].includes(role)){const name=role==='Seer'?'A':role==='Police'?'D':'B';const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');assert.equal(ui.screen.queryByRole('dialog'),null);}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  const player=ui.screen.getByRole('heading',{level:2}).textContent;ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  if(player==='E'){
   const dialog=ui.screen.getByRole('dialog',{name:'PREVIOUS NIGHT · ROLE CHECK'});assert.match(dialog.textContent,/A is Werewolf/);assert.equal(dialog.querySelector('.private-info-person strong').textContent,'A');assert.match(dialog.querySelector('.private-info-role-art img').getAttribute('src'),/werewolf\.webp$/);click('OK · HIDE INFO');checked=true;break;
  }
  while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'}))click('OK · HIDE INFO');
  const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Werewolf'||role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else if(role==='Police')click('SKIP BLOCK');else click('SKIP');
 }
 assert.ok(checked);
});

for(const reveal of [true,false])test(`morning report shows multiple deaths ${reveal?'with':'without'} role art`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,revealDead:reveal},false);
 for(const role of ['Werewolf','Sheriff','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,villager:4});const victims=deal(names,counts).filter(p=>p.role==='villager').slice(0,2);
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'||role==='Sheriff'){const name=role==='Werewolf'?victims[0].name:victims[1].name;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByRole('heading',{name:'2 DEATHS'}));assert.equal(document.querySelectorAll('.morning-death').length,2);
 for(const victim of victims){const card=ui.screen.getByRole('article',{name:reveal?`${victim.name} died, Villager`:`${victim.name} died`});assert.equal(card.querySelector('h3').textContent,victim.name);assert.equal(!!card.querySelector('.morning-role'),reveal);if(reveal)assert.match(card.querySelector('.morning-role img').getAttribute('src'),/villager\.webp$/);}
 assert.equal(ui.screen.getByRole('button',{name:'CONTINUE →'}).querySelector('.hold-label').textContent,'CONTINUE →');
 assert.ok(ui.screen.getByRole('button',{name:'CONTINUE →'}).getAttribute('aria-describedby').split(' ').includes('morning-next-step'));click('CONTINUE →');assert.ok(ui.screen.getByText('DISCUSS YOUR SUSPECTS'));
});

test('morning report lists a blocked player who died and clears the notice next night',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,policeNotifyBlocked:true},false);
 for(const role of ['Werewolf','Doctor','Police','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,doctor:1,police:1,villager:3});const lineup=deal(names,counts),doctor=lineup.find(p=>p.role==='doctor');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(['Werewolf','Doctor','Police'].includes(role)){const name=role==='Doctor'?lineup.find(p=>p.role==='villager').name:doctor.name;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByRole('heading',{name:'1 DEATH'}));assert.ok(ui.screen.getByText(`${doctor.name}'s ability was blocked last night`));assert.equal(ui.screen.queryByRole('button',{name:'SHOW PRIVATE MESSAGE'}),null);
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else if(role==='Police')click('SKIP BLOCK');else click('SKIP');
 }
 assert.equal(ui.screen.queryByText(/ability was blocked last night/),null);
});

test('morning report leaves out a block made by a blocked Police player',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{policeNotifyBlocked:true},false);
 for(const role of ['Werewolf','Police','Police','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,police:2,villager:3});
 const lineup=deal(names,counts),officers=lineup.filter(p=>p.role==='police'),victim=lineup.find(p=>p.role==='villager');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Police'){const desired=name===officers[0].name?officers[1].name:victim.name;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===desired);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(`${officers[1].name}'s ability was blocked last night`));assert.equal(ui.screen.queryByText(`${victim.name}'s ability was blocked last night`),null);
});

test('Hypnotizer Wolf settings save 1–5 uses or every night and 1–5 nights or the whole game',()=>{
 startSetup(['A','B','C','D'],{},false);click('View Hypnotizer Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const uses=ui.screen.getByLabelText('Hypnosis uses per game'),duration=ui.screen.getByLabelText('Hypnosis lasts');
 assert.deepEqual([...uses.options].map(x=>x.value),['1','2','3','4','5','0']);
 assert.deepEqual([...duration.options].map(x=>x.value),['1','2','3','4','5','0']);
 assert.equal(uses.value,'1');assert.equal(duration.value,'0');
 ui.fireEvent.change(uses,{target:{value:'0'}});ui.fireEvent.change(duration,{target:{value:'3'}});
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).hypnoMaxUses,0);assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).hypnoDuration,3);
 click('Close role details');ui.cleanup();ui.render(React.createElement(App));click(/START GAME/);click(/CHOOSE ROLES/);click('View Hypnotizer Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 assert.equal(ui.screen.getByLabelText('Hypnosis uses per game').value,'0');assert.equal(ui.screen.getByLabelText('Hypnosis lasts').value,'3');
});

test('after the Pup dies both special wolves choose two targets in the next night',async()=>{
 const names=Array.from({length:16},(_,i)=>`P${i+1}`);startSetup(names,{firstNightSafe:false,hypnoMaxUses:1},false);
 for(const role of ['Infecting Wolf','Hypnotizer Wolf','Wolf Pup','Sheriff',...Array(12).fill('Villager')])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{rabidwolf:1,hypnowolf:1,wolfpup:1,sheriff:1,villager:12});
 const lineup=deal(names,counts),pup=lineup.find(p=>p.role==='wolfpup'),villagers=lineup.filter(p=>p.role==='villager');
 const choose=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`cannot select ${name}`);ui.fireEvent.click(target);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<16;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Infecting Wolf'){choose(villagers[0].name);click('COMPLETE ACTION');}
  else if(role==='Hypnotizer Wolf')click('SAVE HYPNOSIS FOR LATER');
  else if(role==='Sheriff'){choose(pup.name);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${pup.name} died`)));click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<15;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let infection=false,hypnosis=false;
 for(let i=0;i<15;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Infecting Wolf'){
   const button=ui.screen.getByRole('button',{name:'COMPLETE ACTION'});assert.ok(button.disabled);choose(villagers[1].name);assert.ok(button.disabled);choose(villagers[2].name);assert.equal(button.disabled,false);ui.fireEvent.click(button);infection=true;
  } else if(role==='Hypnotizer Wolf'){
   const button=ui.screen.getByRole('button',{name:'HYPNOTIZE'});assert.ok(button.disabled);choose(villagers[3].name);assert.ok(button.disabled);choose(villagers[4].name);assert.equal(button.disabled,false);ui.fireEvent.click(button);hypnosis=true;
  } else if(role==='Werewolf'){choose(villagers[5].name);choose(villagers[6].name);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(infection && hypnosis);assert.ok(ui.screen.getByText(/died/));
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<13;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 const converted=new Set();let usedUp=false;
 for(let i=0;i<13;i++){
  const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if([villagers[1].name,villagers[2].name].includes(name)){assert.equal(role,'Werewolf');converted.add(name);}
  if(role==='Hypnotizer Wolf'){assert.equal(ui.screen.queryByRole('button',{name:'HYPNOTIZE'}),null);usedUp=true;click('SKIP');}
  else if(role==='Werewolf'||role==='Infecting Wolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(converted.size,2);assert.ok(usedUp);
});

test('one-night hypnosis stops the Doctor only in the next night',async()=>{
 const names=['A','B','C','D','E','F','G','H'];startSetup(names,{hypnoDuration:1,doctorRepeatProtect:true},false);
 for(const role of ['Werewolf','Hypnotizer Wolf','Doctor',...Array(5).fill('Villager')])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,hypnowolf:1,doctor:1,villager:5});
 const lineup=deal(names,counts),doctor=lineup.find(p=>p.role==='doctor'),villagers=lineup.filter(p=>p.role==='villager');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`cannot choose ${name}`);ui.fireEvent.click(target);};
 click(/START GAME/);
 for(let night=1;night<=3;night++){
  click('CONTINUE →');const living=night===3?7:8;
  for(let i=0;i<living;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Hypnotizer Wolf'){if(night===1){pick(doctor.name);click('HYPNOTIZE');}else click('SKIP');}
   else if(role==='Doctor'){pick(villagers[night===3?1:0].name);click('COMPLETE ACTION');}
   else if(role==='Werewolf' && night>1){pick(villagers[night===3?1:0].name);click('COMPLETE ACTION');}
   else click('SKIP');
  }
  if(night===2)assert.ok(ui.screen.getByText(new RegExp(`${villagers[0].name} died`)));
  if(night===3)assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(night<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<(night===1?8:7);i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('every-night hypnosis stays available after the first use',()=>{
 startSetup(['A','B','C','D','E','F'],{hypnoMaxUses:0,hypnoDuration:1},false);
 for(const role of ['Hypnotizer Wolf','Doctor','Villager','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Hypnotizer Wolf'){chooseTargets();click('HYPNOTIZE');}else if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Hypnotizer Wolf'){assert.ok(ui.screen.getByRole('button',{name:'HYPNOTIZE'}));checked=true;break;}
  if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checked);
});

test('main-menu role rulebook lists every role and searches without revealing game roles',async()=>{
 const {defaults,roleDescription}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 ui.render(React.createElement(App));click('ROLE RULEBOOK');
 const book=ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'});
 assert.equal(book.querySelectorAll('.role-rulebook-entry').length,Object.keys(roles).length);
 for(const [id,role] of Object.entries(roles)){
  const entry=book.querySelector(`[data-role="${id}"]`);assert.ok(entry,id);assert.equal(entry.querySelector('h4').textContent,role.name);
  assert.equal(entry.querySelector('p').textContent,roleDescription(id,defaults));
 }
 assert.ok(ui.within(book).getByRole('region',{name:'VILLAGERS'}));assert.ok(ui.within(book).getByRole('region',{name:'WEREWOLVES'}));assert.ok(ui.within(book).getByRole('region',{name:'NEUTRALS'}));
 assert.ok(ui.within(book).getByText(/First night is safe/));
 ui.fireEvent.change(ui.within(book).getByLabelText('Find a role'),{target:{value:'Hypnotizer Wolf'}});
 assert.equal(book.querySelectorAll('.role-rulebook-entry').length,1);assert.ok(book.querySelector('[data-role="hypnowolf"]'));
 ui.fireEvent.change(ui.within(book).getByLabelText('Find a role'),{target:{value:'turn into a Werewolf'}});assert.equal(book.querySelectorAll('.role-rulebook-entry').length,0);assert.ok(ui.within(book).getByText(/No roles found/));
 ui.fireEvent.change(ui.within(book).getByLabelText('Find a role'),{target:{value:'not a role'}});assert.ok(ui.within(book).getByText(/No roles found/));
 click('Close role rulebook');assert.equal(ui.screen.queryByRole('dialog'),null);assert.ok(ui.screen.getByRole('button',{name:'ROLE RULEBOOK'}));
});

test('role rulebook reflects changed settings and preserves the current night action',()=>{
 startSetup(['A','B','C','D'],{},false);
 for(const role of ['Werewolf','Doctor','Villager','Villager'])click('Add '+role);
 click('View Doctor details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Protect yourself'));click('Close role details');
 click('View Hypnotizer Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 ui.fireEvent.change(ui.screen.getByLabelText('Hypnosis uses per game'),{target:{value:'0'}});ui.fireEvent.change(ui.screen.getByLabelText('Hypnosis lasts'),{target:{value:'3'}});click('Close role details');
 click('View Infecting Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Allow turning players into Werewolves'));click('Close role details');
 click(/START GAME/);assert.ok(ui.screen.getByRole('button',{name:'Open role rulebook'}));click('CONTINUE →');let checked=false;
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Doctor'){
   chooseTargets();const selected=document.querySelector('.target.selected strong').textContent;
   click('Open role rulebook');const book=ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'});
   assert.match(book.querySelector('[data-role="doctor"] p').textContent,/cannot protect yourself/);
   assert.match(book.querySelector('[data-role="hypnowolf"] p').textContent,/each night/);assert.match(book.querySelector('[data-role="hypnowolf"] p').textContent,/lasts 3 nights/);
   assert.match(book.querySelector('[data-role="rabidwolf"] p').textContent,/cannot turn players into Werewolves/);
   assert.doesNotMatch(book.querySelector('[data-role="wolfpup"] p').textContent,/Infecting Wolf can turn/);
   assert.equal(book.querySelectorAll('.role-rulebook-entry').length,Object.keys(roles).length);
   click('Close role rulebook');assert.equal(document.querySelector('.target.selected strong').textContent,selected);click('COMPLETE ACTION');checked=true;
  }else click('SKIP');
 }
 assert.ok(checked);assert.ok(ui.screen.getByText('No one was killed tonight.'));
 click('Open role rulebook');assert.ok(ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'}));click('Close role rulebook');click('CONTINUE →');
 assert.ok(ui.screen.getByRole('button',{name:'Open role rulebook'}));
});


test('main-menu rulebook uses saved role settings after reload',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({firstNightSafe:false,doctorSelfProtect:false,hypnoDuration:2}));
 ui.render(React.createElement(App));click('ROLE RULEBOOK');
 const book=ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'});
 assert.match(book.querySelector('[data-role="doctor"] p').textContent,/cannot protect yourself/);
 assert.match(book.querySelector('[data-role="hypnowolf"] p').textContent,/lasts 2 nights/);
 assert.equal(ui.within(book).queryByText(/First night is safe/),null);
});


test('power points update on cards, details and in play when Seer settings change',()=>{
 startSetup(['A','B','C','D'],{},false);
 const card=ui.screen.getByRole('button',{name:'View Seer details'});assert.equal(card.querySelector('.role-power-card').textContent,'10');
 click('View Seer details');assert.match(document.querySelector('.role-power-detail').textContent,/10\/10/);
 ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 ui.fireEvent.click(ui.screen.getByLabelText('Show exact role'));
 assert.match(document.querySelector('.role-power-detail').textContent,/8\/10/);click('Close role details');
 assert.equal(ui.screen.getByRole('button',{name:'View Seer details'}).querySelector('.role-power-card').textContent,'8');
 for(const role of ['Werewolf','Seer','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let found=false;
 for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Seer'){assert.equal(document.querySelector('.role-power-game').textContent,'8');found=true;chooseTargets();click('COMPLETE ACTION');finishPrivateResult();}else click('SKIP');}
 assert.ok(found);
});

test('Friends Maker wolf secretly attacks a packmate without giving ordinary wolves the same target',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 startSetup(['A','B','C','D','E'],{},false);
 for(const role of ['Werewolf','Werewolf','Friends Maker','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));counts.werewolf=2;counts.charmer=1;counts.villager=2;
 const dealt=engine.deal(['A','B','C','D','E'],counts);
 const wolves=dealt.filter(p=>p.role==='werewolf');const friend=wolves[0], other=wolves[1];
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Friends Maker'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===friend.name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let checkedFriend=false,checkedOther=false;
 for(let i=0;i<5;i++){
  const current=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);
  if(current===friend.name){
   const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===other.name);assert.ok(target,'friend can attack known packmate');
   ui.fireEvent.click(target);click('COMPLETE ACTION');checkedFriend=true;
  }else if(current===other.name){
   const target=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent===friend.name);assert.ok(target.disabled,'ordinary wolf cannot attack friend');
   assert.equal(document.querySelector(`[aria-label="${friend.name} chose ${other.name} to attack"]`),null,'betrayal marker is hidden');
   const villager=dealt.find(p=>p.role==='villager');const victim=availableTargets().find(b=>b.querySelector('strong')?.textContent===villager.name);assert.ok(victim);ui.fireEvent.click(victim);click('COMPLETE ACTION');checkedOther=true;
  }else click('SKIP');
 }
 assert.ok(checkedFriend&&checkedOther);assert.ok(ui.screen.getByRole('heading',{level:3,name:other.name}));assert.ok(ui.screen.getByText('2 DEATHS'));
});

test('Infecting Wolf brings Lone Wolf into the known team without changing its role',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 startSetup(['A','B','C','D','E'],{},false);
 for(const role of ['Infecting Wolf','Lone Werewolf','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{rabidwolf:1,lonewolf:1,villager:3});
 const lineup=engine.deal(['A','B','C','D','E'],counts);const lone=lineup.find(p=>p.role==='lonewolf'),infect=lineup.find(p=>p.role==='rabidwolf');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Infecting Wolf'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===lone.name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}
  else click('SKIP');
 }
 assert.ok(ui.screen.getByText('No one was killed tonight.'));click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 let sawLone=false,sawInfect=false,sawNotice=false;
 for(let i=0;i<5;i++){
  const current=ui.screen.getByRole('heading',{level:2}).textContent;
  ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  const notice=ui.screen.queryByRole('dialog',{name:'YOUR WEREWOLF TEAM'});
  if(notice){assert.equal(current,lone.name);assert.match(notice.textContent,/still the Lone Werewolf/);sawNotice=true;}
  while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'}))click('OK · HIDE INFO');
  const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(current===lone.name){
   assert.equal(role,'Lone Werewolf');assert.match(document.querySelector('.wolf-team-list').textContent,new RegExp(`${infect.name} is Infecting Wolf`));
   const teammate=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent===infect.name);assert.ok(teammate.disabled);
   chooseTargets();click('COMPLETE ACTION');sawLone=true;
  }else if(current===infect.name){
   assert.match(document.querySelector('.wolf-team-list').textContent,new RegExp(`${lone.name} is Lone Werewolf`));
   const teammate=[...document.querySelectorAll('button.target')].find(b=>b.querySelector('strong')?.textContent===lone.name);assert.ok(teammate.disabled);
   chooseTargets();click('COMPLETE ACTION');sawInfect=true;
  }else click('SKIP');
 }
 assert.ok(sawLone&&sawInfect&&sawNotice);
});

test('Strong Wolf cannot kill on an even night when another wolf can attack',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{firstNightSafe:false,doctorRepeatProtect:true},false);
 for(const role of ['Werewolf','Strong Werewolf','Doctor','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,strongwolf:1,doctor:1,villager:3});
 const villagers=engine.deal(names,counts).filter(p=>p.role==='villager');const protectedName=villagers[0].name, other=villagers[1].name;
 click(/START GAME/);
 for(let round=1;round<=2;round++){
  click('CONTINUE →');
  for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(['Werewolf','Strong Werewolf','Doctor'].includes(role)){
    if(role==='Strong Werewolf' && round===2)assert.ok(ui.screen.getByText(/Your attack works only if no other teammate can attack/));
    const name=role==='Strong Werewolf' && round===2?other:protectedName;
    const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
   }else click('SKIP');
  }
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(round===1){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('Lone Wolf failed 25% attack does not kill while another wolf can attack',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{firstNightSafe:false},false);Math.random=()=>0.9;
 for(const role of ['Werewolf','Lone Werewolf','Villager','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,lonewolf:1,villager:4});
 const villagers=engine.deal(names,counts).filter(p=>p.role==='villager');const wolfVictim=villagers[0].name,loneVictim=villagers[1].name;
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf' || role==='Lone Werewolf'){
   const name=role==='Werewolf'?wolfVictim:loneVictim;const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);
   assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
  }else click('SKIP');
 }
 assert.ok(ui.screen.getByRole('heading',{level:3,name:wolfVictim}));
 assert.equal(ui.screen.queryByRole('heading',{level:3,name:loneVictim}),null);
});

test('infected friend remains on Friends team in their private role notice',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{},false);for(const role of ['Infecting Wolf','Friends Maker','Villager','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{rabidwolf:1,charmer:1,villager:4});const lineup=engine.deal(names,counts);const friend=lineup.find(p=>p.role==='villager');
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Infecting Wolf'||role==='Friends Maker'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===friend.name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  const current=ui.screen.getByRole('heading',{level:2}).textContent;
  ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  if(current===friend.name){const notice=ui.screen.getByRole('dialog',{name:'YOUR NEW ROLE'});assert.match(notice.textContent,/still on the Friends team/);assert.doesNotMatch(notice.textContent,/now on the Werewolf team/);checked=true;break;}
  while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'}))click('OK · HIDE INFO');
  const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Infecting Wolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checked);
});

test('two-wolf stalemate awards both teams and counts the dead Friends Maker in rankings',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E'];
 startSetup(names,{},false);for(const role of ['Werewolf','Wolf Pup','Friends Maker','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,wolfpup:1,charmer:1,villager:2});
 const lineup=engine.deal(names,counts),pup=lineup.find(p=>p.role==='wolfpup'),wolf=lineup.find(p=>p.role==='werewolf'),charmer=lineup.find(p=>p.role==='charmer'),villagers=lineup.filter(p=>p.role==='villager');
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`target ${name} available`);ui.fireEvent.click(target);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<5;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Friends Maker'){select(pup.name);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<5;i++){const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];if(voter===charmer.name||voter===pup.name)click('SKIP VOTE');else{select(charmer.name);click('VOTE');}}
 assert.match(ui.screen.getByText(new RegExp(`${charmer.name} was voted out`)).textContent,/voted out/);click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Werewolf'){select(villagers[0].name);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<3;i++){const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];if(voter===villagers[1].name)click('SKIP VOTE');else{select(villagers[1].name);click('VOTE');}}
 click('CONTINUE →');assert.ok(ui.screen.getByRole('heading',{name:'FRIENDS AND WEREWOLVES WIN'}));assert.ok(ui.screen.getByRole('group',{name:'Match rankings'}));
 const records=JSON.parse(localStorage.getItem('werewolf.rankings.v1'));for(const name of [wolf.name,pup.name,charmer.name])assert.equal(records.find(r=>r.name===name).wins,1);
});

test('blocked wolf lets Strong Wolf attack on an even night',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F','G'];
 startSetup(names,{firstNightSafe:false,doctorRepeatProtect:true},false);
 for(const role of ['Werewolf','Strong Werewolf','Police','Doctor','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,strongwolf:1,police:1,doctor:1,villager:3});
 const lineup=engine.deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf'),villagers=lineup.filter(p=>p.role==='villager');
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`target ${name}`);ui.fireEvent.click(target);};
 click(/START GAME/);
 for(let round=1;round<=2;round++){
  click('CONTINUE →');for(let i=0;i<7;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Police'){if(round===2){select(wolf.name);click('COMPLETE ACTION');}else click('SKIP BLOCK');}
   else if(['Doctor','Werewolf','Strong Werewolf'].includes(role)){select(role==='Strong Werewolf'&&round===2?villagers[1].name:villagers[0].name);click('COMPLETE ACTION');}
   else click('SKIP');
  }
  if(round===1){assert.ok(ui.screen.getByText('No one was killed tonight.'));click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<7;i++)click('SKIP VOTE');click('CONTINUE →');}
  else assert.ok(ui.screen.getByRole('heading',{level:3,name:villagers[1].name}));
 }
});

for(const seed of [0,0.999])test(`Friends Maker messages arrive next night and friends can only reply (${seed})`,async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E'];
 startSetup(names,{doctorRepeatProtect:true},false);Math.random=()=>seed;
 for(const role of ['Werewolf','Friends Maker','Doctor','Villager','Villager'])click('Add '+role);
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const enabled=ui.screen.getByLabelText('Private messages to your friend');assert.equal(enabled.checked,false);ui.fireEvent.click(enabled);click('Close role details');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).charmerMessages,true);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,charmer:1,doctor:1,villager:2});
 const lineup=engine.deal(names,counts), charmer=lineup.find(p=>p.role==='charmer'), friend=lineup.find(p=>p.role==='villager'), protectedPlayer=lineup.filter(p=>p.role==='villager')[1];
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`select ${name}`);ui.fireEvent.click(target);};
 click(/START GAME/);let sawReply=false,sawLetter=false;
 for(let round=1;round<=3;round++){
  click('CONTINUE →');
  for(let i=0;i<5;i++){
   const name=ui.screen.getByRole('heading',{level:2}).textContent;
   ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
   let message=ui.screen.queryByRole('dialog',{name:'PRIVATE MESSAGE'});
   if(message){
    if(round===2 && name===friend.name){
     assert.match(message.textContent,/Meet by the oak/);assert.equal(message.querySelector('.private-info-role-art'),null);
     ui.fireEvent.change(ui.within(message).getByLabelText('Your reply'),{target:{value:'I agree'}});ui.fireEvent.click(ui.within(message).getByRole('button',{name:'SEND REPLY'}));
     assert.ok(ui.within(message).getByText('Meet by the oak'));
     assert.equal(ui.within(message).queryByLabelText('Your reply'),null);
     assert.equal(ui.within(message).queryByRole('button',{name:'SEND REPLY'}),null);
     assert.ok(ui.within(message).getByRole('status'));sawLetter=true;
    }else if(round===3 && name===charmer.name){
     assert.match(message.textContent,/I agree/);assert.equal(ui.within(message).queryByLabelText('Your reply'),null);click('OK · HIDE INFO');sawReply=true;
    }else assert.fail(`Message arrived to ${name} on night ${round}`);
   }
   while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'}))click('OK · HIDE INFO');
   const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(name===friend.name)assert.equal(ui.screen.queryByRole('region',{name:'Message your friend'}),null);
   if(role==='Friends Maker' && round===1){
    select(friend.name);ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a private message'),{target:{value:'Meet by the oak'}});click('SEND MESSAGE');
    assert.equal(ui.screen.queryByPlaceholderText('Write a private message'),null);
    assert.equal(ui.screen.queryByRole('button',{name:'SEND MESSAGE'}),null);
    assert.equal(ui.screen.queryByRole('region',{name:'Message your friend'}),null);
    assert.ok(ui.screen.getByText(/You cannot send again tonight/));click('COMPLETE ACTION');
   }else if(role==='Friends Maker'){assert.ok(ui.screen.getByPlaceholderText('Write a private message'),'new night restores one message allowance');click('SKIP');}
   else if(role==='Doctor'){select(protectedPlayer.name);click('COMPLETE ACTION');}
   else if(role==='Werewolf' && round>1){select(protectedPlayer.name);click('COMPLETE ACTION');}
   else click('SKIP');
  }
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(round<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
 assert.ok(sawLetter&&sawReply);
});

test('Friends Maker messaging stays hidden when the option is off',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E'];
 startSetup(names,{},false);for(const role of ['Werewolf','Friends Maker','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,charmer:1,villager:3});const lineup=engine.deal(names,counts),friend=lineup.find(p=>p.role==='villager');
 click(/START GAME/);click('CONTINUE →');let checked=false;
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Friends Maker'){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===friend.name);ui.fireEvent.click(target);assert.equal(ui.screen.queryByPlaceholderText('Write a private message'),null);click('COMPLETE ACTION');checked=true;}else click('SKIP');
 }
 assert.ok(checked);assert.equal(ui.screen.queryByText(/Message ready for next night/),null);
});

test('Police can block a new friendship and its message without revealing it',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{charmerMessages:true},false);for(const role of ['Werewolf','Friends Maker','Police','Villager','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,charmer:1,police:1,villager:3});const lineup=engine.deal(names,counts),friend=lineup.find(p=>p.role==='villager'),charmer=lineup.find(p=>p.role==='charmer');
 const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Friends Maker'){select(friend.name);ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a private message'),{target:{value:'Secret message'}});click('SEND MESSAGE');click('COMPLETE ACTION');}
  else if(role==='Police'){select(charmer.name);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(ui.screen.queryByText('Secret message'),null);click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  const name=ui.screen.getByRole('heading',{level:2}).textContent;ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
  if(name===friend.name){assert.equal(ui.screen.queryByRole('dialog',{name:'PRIVATE MESSAGE'}),null);assert.equal(ui.screen.queryByRole('dialog',{name:'YOUR FRIEND'}),null);checked=true;break;}
  while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'}))click('OK · HIDE INFO');const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else if(role==='Police')click('SKIP BLOCK');else if(role==='Friends Maker'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checked);
});

test('role power reacts to ability settings on details and cards including Wolf Pup',()=>{
 startSetup(['A','B','C','D'],{},false);
 const cardScore=name=>ui.screen.getByRole('button',{name:`View ${name} details`}).querySelector('.role-power-card').textContent;
 assert.equal(cardScore('Wolf Pup'),'4');assert.ok(Number(cardScore('Werewolf'))>4);
 click('View Infecting Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));ui.fireEvent.click(ui.screen.getByLabelText('Allow turning players into Werewolves'));click('Close role details');
 assert.equal(cardScore('Wolf Pup'),'3');click('View Wolf Pup details');assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 3/10');click('Close role details');
 click('View Seer details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 10/10');ui.fireEvent.click(ui.screen.getByLabelText('Show exact role'));assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 8/10');click('Close role details');assert.equal(cardScore('Seer'),'8');
 click('View Hypnotizer Wolf details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 for(const [uses,points] of [[1,6],[2,7],[3,8],[4,9],[5,10]]){ui.fireEvent.change(ui.screen.getByLabelText('Hypnosis uses per game'),{target:{value:String(uses)}});assert.equal(document.querySelector('.role-power-detail').textContent,`POWER ${points}/10`);}
 ui.fireEvent.change(ui.screen.getByLabelText('Hypnosis lasts'),{target:{value:'1'}});assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 5/10');click('Close role details');assert.equal(cardScore('Hypnotizer Wolf'),'5');
 click('View Friends Maker details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 8/10');ui.fireEvent.click(ui.screen.getByLabelText('Private messages to your friend'));assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 9/10');click('Close role details');assert.equal(cardScore('Friends Maker'),'9');
});

test('Madman is a village card with artwork, not a global setting',()=>{
 startSetup(['A','B','C','D'],{madmanCount:1},false);
 const add=ui.screen.getByRole('button',{name:'Add Madman'});
 assert.ok(add.closest('.role-team-village'));
 assert.equal(ui.screen.queryByText('Madmen (disguised roles)'),null);
 click('View Madman details');
 const dialog=ui.screen.getByRole('dialog');
 assert.ok(ui.within(dialog).getByAltText('Madman role artwork').getAttribute('src').endsWith('/madman.webp'));
 assert.match(dialog.querySelector('#role-details-description').textContent,/different village role/);
 click('Close role details');
 for(const name of ['Werewolf','Madman','Villager','Villager'])click(`Add ${name}`);
 click(/START GAME/);click('CONTINUE →');
 const seen=[];
 for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);const heading=ui.screen.getByRole('heading',{level:2}).textContent;seen.push(heading);assert.doesNotMatch(document.querySelector('.panel.description > p').textContent,/Madman|different village role|wrong info/);if(heading==='Police'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}
 assert.ok(seen.includes('Police'));assert.ok(!seen.includes('Madman'));
 assert.ok(ui.screen.getByText('No one was killed tonight.'));
});

test('each Madman disguise takes its turn without working as a real village role',async t=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 const disguises=Object.keys(roles).filter(engine.isEligibleMadmanRole);
 for(const disguise of disguises) await t.test(roles[disguise].name,()=>{
  const names=['A','B','C','D','E'];
  startSetup(names,{firstNightSafe:false,intelligenceInterval:1,policeNotifyBlocked:true},false);
  for(const role of ['Werewolf','Madman','Villager','Villager','Villager'])click(`Add ${role}`);
  const randomValue=(disguises.indexOf(disguise)+0.01)/disguises.length;
  Math.random=()=>randomValue;
  const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,madman:1,villager:3});
  const dealt=engine.deal(names,counts);
  const victim=dealt.find(p=>p.role==='villager').name;
  const wolf=dealt.find(p=>p.role==='werewolf').name;
  const other=dealt.filter(p=>p.role==='villager')[1].name;
  click(/START GAME/);Math.random=()=>0;click('CONTINUE →');
  let sawDisguise=false;
  const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`target ${name}`);ui.fireEvent.click(target);};
  for(let i=0;i<names.length;i++){
   click(/SHOW YOUR ROLE/);
   const role=ui.screen.getByRole('heading',{level:2}).textContent;
   assert.notEqual(role,'Madman');
   if(role==='Werewolf'){pick(victim);click('COMPLETE ACTION');}
   else if(role!==roles[disguise].name)click('SKIP');
   else {
    sawDisguise=true;
    if(role==='News Reporter'){ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Fake news'}});click('PUBLISH IN THE MORNING');}
    else if(role==='Mayor')click('DECLARE EMERGENCY ASSEMBLY');
    else if(['Celebrity','Sick Man','Necromancer'].includes(role))click('SKIP');
    else if(role==='Intelligence Chief'){click('VIEW INTEL');finishPrivateResult();}
    else if(role==='Chef'){pick(victim);pick(other);click('COMPLETE ACTION');finishPrivateResult();}
    else if(role==='Muter'){pick(other);click('MUTE PLAYER');assert.equal(document.querySelector('.morning-muted'),null);}
    else {pick(['Police','Visitor'].includes(role)?wolf:['Sheriff','Wolf Hunter','Vote Marker'].includes(role)?other:victim);click('COMPLETE ACTION');finishPrivateResult();}
   }
  }
  assert.ok(sawDisguise,`missing disguise ${disguise}`);
  assert.ok(document.body.textContent.includes(victim+' died'),`wolf attack was stopped by ${disguise}`);
  assert.ok(!document.body.textContent.includes(other+' died'),`${disguise} killed another player`);
  assert.equal(ui.screen.queryByText('Fake news'),null);
  assert.equal(ui.screen.queryByText(/called an emergency meeting/),null);
  assert.equal(ui.screen.queryByLabelText('Blocked abilities'),null);
  if(disguise==='muted')assert.equal(document.querySelector('.morning-muted'),null);
  if(disguise==='instigator'){
   click('CONTINUE →');click('END DISCUSSION →');
   for(let i=0;i<4;i++)click('SKIP VOTE');
   assert.ok(ui.screen.getByRole('heading',{name:'NO ONE WAS VOTED OUT',exact:true}));
  }
  ui.cleanup();localStorage.clear();Math.random=originalRandom;
 });
});

test('a dead Madman keeps the disguise in the morning and is revealed at game end',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D'];
 startSetup(names,{firstNightSafe:false,revealDead:true},false);
 for(const role of ['Werewolf','Madman','Villager','Villager'])click(`Add ${role}`);
 const disguises=Object.keys(roles).filter(engine.isEligibleMadmanRole);const rng=(disguises.indexOf('doctor')+0.01)/disguises.length;Math.random=()=>rng;
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,madman:1,villager:2});
 const lineup=engine.deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf'),mad=lineup.find(p=>p.role==='madman');
 click(/START GAME/);Math.random=()=>0;click('CONTINUE →');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Werewolf'){pick(mad.name);click('COMPLETE ACTION');}
  else if(role==='Doctor'){pick(mad.name);click('COMPLETE ACTION');}else click('SKIP');
 }
 const death=ui.screen.getByRole('article',{name:`${mad.name} died, Doctor`});assert.ok(death);assert.doesNotMatch(death.textContent,/Madman/);
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<3;i++){
  if(ui.screen.getByRole('heading',{level:2}).textContent.startsWith(wolf.name+','))click('SKIP VOTE');
  else {pick(wolf.name);click('VOTE');}
 }
 click('CONTINUE →');
 const result=[...document.querySelectorAll('.result-row')].find(row=>row.querySelector('strong').textContent===mad.name);
 assert.match(result.textContent,/Doctor.*Madman/);assert.doesNotMatch(result.textContent,/Former Madman/);
});

test('a hypnotized ordinary Villager is not immune to the Sheriff',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{},false);
 for(const role of ['Hypnotizer Wolf','Sheriff','Doctor','Villager','Villager','Villager'])click(`Add ${role}`);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{hypnowolf:1,sheriff:1,doctor:1,villager:3});
 const lineup=engine.deal(names,counts),doctor=lineup.find(p=>p.role==='doctor');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Hypnotizer Wolf'){pick(doctor.name);click('HYPNOTIZE');}
  else if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Sheriff'){pick(doctor.name);click('COMPLETE ACTION');}
  else if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${doctor.name} died`)));
});

test('the Sheriff cannot shoot a real disguised Madman',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{firstNightSafe:false},false);for(const role of ['Werewolf','Sheriff','Madman','Villager','Villager','Villager'])click(`Add ${role}`);
 const disguises=Object.keys(roles).filter(engine.isEligibleMadmanRole),rng=(disguises.indexOf('doctor')+0.01)/disguises.length;Math.random=()=>rng;
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,madman:1,villager:3});
 const lineup=engine.deal(names,counts),mad=lineup.find(p=>p.role==='madman'),victim=lineup.find(p=>p.role==='villager');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 click(/START GAME/);Math.random=()=>0;click('CONTINUE →');
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Sheriff'){pick(mad.name);click('COMPLETE ACTION');}
  else if(role==='Werewolf'){pick(victim.name);click('COMPLETE ACTION');}
  else if(role==='Doctor'){pick(mad.name);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(ui.screen.getByText(new RegExp(`${victim.name} died`)));
 assert.equal(ui.screen.queryByText(new RegExp(`${mad.name} died`)),null);
});

test('a Madman Necromancer cannot revive a dead player',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E','F'];
 startSetup(names,{firstNightSafe:false},false);for(const role of ['Werewolf','Madman','Villager','Villager','Villager','Villager'])click(`Add ${role}`);
 const disguises=Object.keys(roles).filter(engine.isEligibleMadmanRole),rng=(disguises.indexOf('necromancer')+0.01)/disguises.length;Math.random=()=>rng;
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,madman:1,villager:4});
 const lineup=engine.deal(names,counts),victims=lineup.filter(p=>p.role==='villager');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,`missing target ${name}`);ui.fireEvent.click(target);};
 click(/START GAME/);Math.random=()=>0;
 for(let night=1;night<=2;night++){
  click('CONTINUE →');
  for(let i=0;i<(night===1?6:5);i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Werewolf'){pick(victims[night-1].name);click('COMPLETE ACTION');}
   else if(role==='Necromancer' && night===2){pick(victims[0].name);click('COMPLETE ACTION');}else click('SKIP');
  }
  assert.ok(ui.screen.getByText(new RegExp(`${victims[night-1].name} died`)));
  if(night===1){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');}
  else assert.equal(ui.screen.queryByText(/came back to life/),null);
 }
});

test('a Madman Seer never gets Madman as a random role result',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts');const names=['A','B','C','D','E'];
 startSetup(names,{},false);for(const role of ['Werewolf','Madman','Villager','Villager','Villager'])click(`Add ${role}`);
 const disguises=Object.keys(roles).filter(engine.isEligibleMadmanRole),rng=(disguises.indexOf('seer')+0.01)/disguises.length;Math.random=()=>rng;
 click(/START GAME/);Math.random=()=>0.999999;click('CONTINUE →');let checked=false;
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Seer'){
   chooseTargets();click('COMPLETE ACTION');const dialog=ui.screen.getByRole('dialog',{name:'ROLE CHECK'});
   assert.doesNotMatch(dialog.textContent,/Madman/);checked=true;click('OK · HIDE RESULT');
  }else click('SKIP');
 }
 assert.ok(checked);
});

test('main menu offers Sound & Feel without a download button or link',()=>{
 ui.render(React.createElement(App));
 assert.equal(ui.screen.queryByRole('link',{name:/download/i}),null);
 assert.equal(ui.screen.queryByRole('button',{name:/download/i}),null);
 assert.equal(document.querySelector('a[download]'),null);
 assert.ok(ui.screen.getByRole('button',{name:'SETTINGS'}));
 assert.ok(ui.screen.getByRole('button',{name:'START GAME'}));
 assert.ok(ui.screen.getByRole('button',{name:'ROLE RULEBOOK'}));
});


test('home menu keeps play and rule controls without a game download link', () => {
  ui.render(React.createElement(App));
  assert.ok(ui.screen.getByRole('button', {name: 'START GAME'}));
  assert.ok(ui.screen.getByRole('button', {name: 'HOW TO PLAY'}));
  assert.ok(ui.screen.getByRole('button', {name: 'ROLE RULEBOOK'}));
  assert.equal(ui.screen.queryByRole('link', {name: /download/i}), null);
  assert.equal(ui.screen.queryByText('DOWNLOAD GAME'), null);
});

function ruleFixRandom(seed) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
async function ruleFixLineup(names, counts, targetRole, targetIndex) {
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  const full=Object.fromEntries(Object.keys(roles).map(r=>[r,counts[r]||0]));
  for(let seed=1;seed<1000;seed++) {
    Math.random=ruleFixRandom(Math.imul(seed,2654435761)>>>0);const lineup=deal(names,full);
    if(lineup[targetIndex].role===targetRole){Math.random=ruleFixRandom(Math.imul(seed,2654435761)>>>0);return lineup;}
  }
  throw new Error('Could not arrange the requested turn order');
}
for(const mayorIndex of [0,6])test(`Mayor declaration waits for every action and private message, Mayor at index ${mayorIndex}`,async()=>{
  const names=['A','B','C','D','E','F','G'];
  startSetup(names,{firstNightSafe:false,journalistDrawing:false},false);
  for(const role of ['Werewolf','Mayor','Seer','Doctor','News Reporter','Celebrity','Villager'])click('Add '+role);
  const lineup=await ruleFixLineup(names,{werewolf:1,mayor:1,seer:1,doctor:1,journalist:1,celebrity:1,villager:1},'mayor',mayorIndex);
  const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
  click(/START GAME/);click('CONTINUE →');let messages=0,investigations=0;
  for(let i=0;i<7;i++){
    assert.equal(document.querySelector('.morning-report'),null,'night must not end early');
    ui.fireEvent.click(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}));
    while(ui.screen.queryByRole('button',{name:'OK · HIDE INFO'})){messages++;click('OK · HIDE INFO');}
    const role=ui.screen.getByRole('heading',{level:2}).textContent;
    assert.equal(document.querySelector('.assembly-announcement'),null);
    if(role==='Mayor')click('DECLARE EMERGENCY ASSEMBLY');
    else if(role==='News Reporter'){ui.fireEvent.change(ui.screen.getByPlaceholderText('Write a headline'),{target:{value:'Turns done'}});click('PUBLISH IN THE MORNING');}
    else if(role==='Seer'){select(lineup.find(p=>p.role==='werewolf').name);click('COMPLETE ACTION');assert.ok(ui.screen.getByRole('button',{name:'OK · HIDE RESULT'}));investigations++;finishPrivateResult();}
    else if(role==='Doctor'||role==='Werewolf'){select(lineup.find(p=>p.role==='villager').name);click('COMPLETE ACTION');}
    else click('SKIP');
    if(i<6)assert.ok(document.querySelector('.player-pass'),'next player must still get a turn');
  }
  assert.equal(investigations,1);assert.ok(messages>=1,'Celebrity/private messages were not skipped');
  assert.ok(ui.screen.getByText('Turns done'));
  assert.ok(ui.screen.getByText('No one was killed tonight.'));
  const dialog=ui.screen.getByRole('dialog',{name:'EMERGENCY VILLAGE ASSEMBLY!'});
  assert.ok(ui.within(dialog).getByText(new RegExp(lineup[mayorIndex].name+' declared their Mayoralty')));
  assert.ok(ui.screen.getByRole('button',{name:'CONTINUE →'}).disabled);
  click('GOT IT!');assert.equal(document.querySelector('.assembly-announcement'),null);
  click('CONTINUE →');assert.ok(ui.screen.getByText('DISCUSS YOUR SUSPECTS'));
});

test('Police cancels a queued Mayor declaration without a public reveal or spent ability',async()=>{
  const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);
  for(const role of ['Werewolf','Mayor','Police','Doctor','Villager','Villager'])click('Add '+role);
  const lineup=await ruleFixLineup(names,{werewolf:1,mayor:1,police:1,doctor:1,villager:2},'mayor',0);
  const mayor=lineup.find(p=>p.role==='mayor').name;
  const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Mayor')click('DECLARE EMERGENCY ASSEMBLY');else if(role==='Police'){select(mayor);click('COMPLETE ACTION');}else if(role==='Werewolf'||role==='Doctor'){select(lineup.find(p=>p.role==='villager').name);click('COMPLETE ACTION');}else click('SKIP');}
  assert.equal(document.querySelector('.assembly-announcement'),null);
  assert.equal(ui.screen.queryByText(/called an emergency meeting/),null);
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
  click(/SHOW YOUR ROLE/);assert.equal(ui.screen.getByRole('heading',{level:2}).textContent,'Mayor');assert.ok(ui.screen.getByRole('button',{name:'DECLARE EMERGENCY ASSEMBLY'}));
});

test('Gambler night-death success is counted once, survives the day vote, and escapes only after the next night',async()=>{
  const names=['A','B','C','D','E','F','G','H'];startSetup(names,{firstNightSafe:false,gamblerPredictions:1},false);
  for(const role of ['Werewolf','Gambler','Villager','Villager','Villager','Villager','Villager','Villager'])click('Add '+role);
  const lineup=await ruleFixLineup(names,{werewolf:1,gambler:1,villager:6},'gambler',0);
  const predicted=lineup.find(p=>p.role==='villager').name;
  const select=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
  click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<8;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Gambler'||role==='Werewolf'){select(predicted);click('COMPLETE ACTION');}else click('SKIP');}
  assert.ok(ui.screen.getByText(new RegExp(predicted+' died')));assert.equal(ui.screen.queryByText(/left the village and won/),null);
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<7;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
  for(let i=0;i<7;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Gambler'){assert.match(document.querySelector('.panel.description > p').textContent,/Survive tonight to win and leave in the morning/);assert.doesNotMatch(document.querySelector('.panel.description > p').textContent,/survive the next night/);assert.ok(ui.screen.getByText(/Correct predictions: 1 \/ 1/));assert.ok(ui.screen.getByText(/If you live through tonight/));assert.equal(ui.screen.queryByText(/Wrong guess: (?:you )?die tonight/),null);click('SKIP BET');}else if(role==='Werewolf'){select(lineup.find(p=>p.role==='villager' && p.name!==predicted).name);click('COMPLETE ACTION');}else click('SKIP');}
  assert.ok(ui.screen.getByText(new RegExp(lineup[0].name+' left the village and won')));
});

test('renamed roles appear in selection, role details and searchable rulebook',()=>{
  startSetup(['A','B','C','D'],{},false);
  for(const [oldName,newName]of [['Charmer','Friends Maker'],['Hypnosis Wolf','Hypnotizer Wolf'],['Journalist','News Reporter']]){
    assert.equal(ui.screen.queryByRole('button',{name:'Add '+oldName}),null);
    assert.ok(ui.screen.getByRole('button',{name:'Add '+newName}));
    click('View '+newName+' details');
    assert.ok(ui.screen.getByRole('heading',{name:newName.toUpperCase(),exact:true}));
    assert.ok(ui.screen.getByAltText(newName+' role artwork'));click('Close role details');
  }
  click('Go back');click('Go back');click('ROLE RULEBOOK');
  const book=ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'});
  for(const name of ['Friends Maker','Hypnotizer Wolf','News Reporter']){
    ui.fireEvent.change(ui.within(book).getByPlaceholderText('Find a role'),{target:{value:name}});
    assert.ok(ui.within(book).getByRole('heading',{name,exact:true}));
    assert.equal(book.querySelectorAll('.role-rulebook-entry').length,1);
  }
});


test('smart first-batch descriptions use dealt roles, not the full catalogue',()=>{
  for(const withPup of [false,true]){
    const lineup=['werewolf','hypnowolf','rabidwolf','lonewolf','doctor',...Array(6).fill('villager'),...(withPup?['wolfpup','charmer']:[])];
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');
    const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!['werewolf','hypnowolf','rabidwolf','lonewolf','wolfpup'].includes(role))return;
      checked.push(role);
      assert.ok(text.split(/\s+/).length<=70,role);
      assert.ok(Array.from(text).length<=440,role);
      if(!withPup){assert.doesNotMatch(text,/Wolf Pup|Friends Maker/);}
      if(withPup && ['werewolf','hypnowolf','rabidwolf'].includes(role))assert.match(text,/Wolf Pup/);
      if(role==='hypnowolf')assert.match(text,/1 use left/);
      if(role==='lonewolf' && withPup)assert.match(text,/Friends Maker/);
    });
    assert.equal(checked.length,withPup?5:4);
    ui.cleanup();localStorage.clear();
  }
});


test('smart second-batch descriptions stay player-focused on actual private turns',()=>{
  const lineup=['doctor','seer','chef','mayor','journalist','werewolf','villager','villager','villager'];
  for(const enabled of [false,true]){
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{doctorSelfProtect:enabled,doctorRepeatProtect:enabled,seerShowExactRole:enabled,chefNeutralsTogether:enabled,mayorDoubleVote:enabled,journalistDrawing:enabled},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');
    const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!['doctor','seer','chef','mayor','journalist'].includes(role))return;
      checked.push(role);
      assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      assert.doesNotMatch(text,/Hypnotizer|Infecting|Wolf Pup|Police|Friends Maker/);
      if(role==='doctor')assert.ok(text.includes(enabled?'You can pick yourself':'You cannot protect yourself'));
      if(role==='seer'){assert.match(text,enabled?/see their role/:/looks like a Werewolf/);assert.doesNotMatch(text,/results can be wrong/);}
      if(role==='chef')assert.doesNotMatch(text,/Neutral|Friends/);
      if(role==='mayor'){assert.match(text,enabled?/vote counts twice/:/vote counts once/);assert.doesNotMatch(text,/private turn/);}
      if(role==='journalist'){assert.match(text,/10 characters/);assert.equal(text.includes('draw a picture'),enabled);}
    });
    assert.equal(checked.length,5);assert.ok(ui.screen.getByText('Night news'));
    ui.cleanup();localStorage.clear();
  }
});


test('smart third-batch descriptions explain only the active player’s role and settings',()=>{
  const batch=['sheriff','templar','bodyguard','necromancer','visitor'];
  const lineup=[...batch,'werewolf','villager','villager','villager'];
  for(const enabled of [false,true]){
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{firstNightSafe:false,sheriffEveryNight:enabled,templarUses:enabled?3:1,necromancerUses:enabled?3:1,bodyguardProtectAll:enabled,visitorDangerousRoles:enabled,visitorAttackedTarget:enabled},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');
    const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!batch.includes(role))return;checked.push(role);
      assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      assert.doesNotMatch(text,/Hypnotizer|Infecting|Wolf Pup|Police|Friends Maker|Serial Killer/);
      if(role==='sheriff')assert.match(text,enabled?/shoot once each night/:/1 bullet for the whole game/);
      if(['templar','necromancer'].includes(role))assert.ok(text.includes(enabled?'3 uses per game':'1 use per game'));
      if(role==='bodyguard')assert.match(text,enabled?/a player from any team/:/a village player/);
      if(role==='visitor'){assert.equal(text.includes('You die if you visit a Werewolf'),enabled);assert.equal(text.includes('player you visit is attacked'),enabled);}
    });
    assert.equal(checked.length,5);
    ui.cleanup();localStorage.clear();
  }
});


test('smart fourth-batch descriptions follow settings on actual private turns',()=>{
  const batch=['police','detective','psychic','instigator','celebrity'];
  const lineup=[...batch,'werewolf','villager','villager','villager'];
  for(const enabled of [false,true]){
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{policeNotifyBlocked:enabled,policeRepeatTarget:enabled,detectiveShowNames:enabled,psychicShowFriends:enabled,instigatorMaxUses:enabled?3:1,celebrityAudience:enabled?3:1},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');
    const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!batch.includes(role))return;checked.push(role);
      assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      assert.doesNotMatch(text,/Hypnotizer|Infecting|Wolf Pup|Friends Maker|Serial Killer/);
      if(role==='police'){assert.match(text,enabled?/morning report/:/not announced/);assert.ok(text.includes(`You ${enabled?'can':'cannot'} pick the same player`));}
      if(role==='detective')assert.match(text,enabled?/see who visited them/:/see how many players visited them/);
      if(role==='psychic'){assert.match(text,/see their team/);assert.doesNotMatch(text,/Friends|neutral/);}
      if(role==='instigator')assert.ok(text.includes(enabled?'3 uses left':'1 use left'));
      if(role==='celebrity'){assert.equal(text,`You win with the village\n${enabled?'3 people know':'One person knows'} you because of your fame`);}
    });
    assert.equal(checked.length,5);
    ui.cleanup();localStorage.clear();
  }
});


test('smart fifth-batch descriptions are short and player-focused on private turns',()=>{
  const batch=['villager','muted','sickman','survivor','jester'];
  const lineup=[...batch,'werewolf'];
  for(const enabled of [false,true]){
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{firstNightSafe:enabled,sickStartingNights:enabled?5:1,sickDoctorBonus:enabled?3:0,survivorShieldCount:enabled?5:1},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');
    const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!batch.includes(role))return;checked.push(role);
      assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      assert.doesNotMatch(text,/Hypnotizer|Infecting|Wolf Pup|Police|Friends Maker|Doctor/);
      if(role==='villager')assert.match(text,/vote out the Werewolves/);
      if(role==='muted'){assert.match(text,/Each night you can mute someone/);assert.doesNotMatch(text,/You can speak normally|morning report names the muted player|Silence ends at the next night|choose another living player to silence/);}
      if(role==='sickman')assert.match(text,enabled?/You have 5 nights left without help/:/Without help, you die tonight/);
      if(role==='survivor'){assert.ok(text.includes(enabled?'5 shields left':'1 shield left'));assert.equal(text.includes('cannot use one tonight'),enabled);}
      if(role==='jester')assert.match(text,/vote you out/);
    });
    assert.equal(checked.length,5);ui.cleanup();localStorage.clear();
  }
});

test('Sick Man nights and Survivor shields update in descriptions across four actual nights',async()=>{
  const names=['A','B','C','D','E','F'];
  startSetup(names,{firstNightSafe:false,sickStartingNights:4,survivorShieldCount:3},false);
  for(const role of ['Werewolf','Sick Man','Survivor','Villager','Villager','Villager'])click('Add '+role);
  const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
  const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sickman:1,survivor:1,villager:3});
  const survivor=deal(names,counts).find(p=>p.role==='survivor').name;
  click(/START GAME/);
  for(let night=1;night<=4;night++){
    click('CONTINUE →');
    for(let i=0;i<6;i++){
      click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
      const text=document.querySelector('.panel.description > p').textContent;
      if(role==='Sick Man'){
        if(night<4)assert.ok(text.includes(`You have ${5-night} nights left without help`));
        else assert.match(text,/Without help, you die tonight/);
        assert.doesNotMatch(text,/Doctor/);click('SKIP');
      }else if(role==='Survivor'){
        if(night<4){assert.ok(text.includes(`${4-night} ${night===3?'shield':'shields'} left`));click(`USE SHIELD (${4-night} LEFT)`);}
        else{assert.match(text,/No shields left/);assert.equal(ui.screen.queryByRole('button',{name:/USE SHIELD/}),null);click('SKIP');}
      }else if(role==='Werewolf'){
        const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===survivor);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');
      }else click('SKIP');
    }
    if(night===4)break;
    click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');
  }
});


test('smart sixth-batch descriptions follow the active role and settings without unrelated abilities',()=>{
  const batch=['strongwolf','whitewolf','serialkiller','raven','thief'];
  const lineup=[...batch,'werewolf','villager','villager','villager'];
  for(const enabled of [false,true]){
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{firstNightSafe:enabled,whiteWolfBetrayPack:enabled,wolfRandomTies:enabled,serialKillerInterval:enabled?2:1,thiefAttackInterval:enabled?2:1,ravenReflectAttackers:enabled},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      if(!batch.includes(role))return;checked.push(role);
      assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      assert.doesNotMatch(text,/Hypnotizer|Infecting|Wolf Pup|Police|Friends Maker|Seer/);
      if(role==='raven'){assert.match(text,/Mark 1 player tonight/);assert.match(text,enabled?/they die instead/:/Marked players can still kill you/);}
      else if(enabled)assert.match(text,/No attacks tonight/);
      if(role==='strongwolf')assert.match(text,/You win with the Werewolves/);
      if(role==='whitewolf'){assert.match(text,/last player alive/);if(!enabled)assert.match(text,/cannot target wolves you know/);}
      if(role==='serialkiller')assert.doesNotMatch(text,/checked|checks/i);
      if(role==='thief')assert.match(text,/If your target dies and you survive, take their role/);
    });
    assert.equal(checked.length,5);ui.cleanup();localStorage.clear();
  }
});

test('smart final-batch private descriptions follow settings and never expose a disguised Madman',()=>{
  for(const enabled of [false,true]){
    const lineup=['charmer','gambler','mindflayer','intelligence','madman','werewolf','villager','villager','villager'];
    startSetup(lineup.map((_,i)=>`Player ${i+1}`),{charmerFirstNight:enabled?2:1,charmerMessages:enabled,gamblerBetProtection:enabled,mindStartingParasites:2,mindRegenPercent:enabled?100:0,intelligenceInterval:enabled?1:2},false);
    for(const role of lineup)click('Add '+roles[role].name);
    click(/START GAME/);click('CONTINUE →');const checked=[];
    for(let i=0;i<lineup.length;i++)actCurrentRole((role,text)=>{
      assert.notEqual(role,'madman');assert.doesNotMatch(text,/Madman|different village role/);
      if(!['charmer','gambler','mindflayer','intelligence'].includes(role))return;
      checked.push(role);assert.ok(text.split(/\s+/).length<=70);assert.ok(Array.from(text).length<=440);
      if(role==='charmer')assert.match(text,enabled?/Wait until night 2/:/Choose your 1 friend/);
      if(role==='gambler'){assert.match(text,enabled?/A bet saves you/:/A bet does not save you/);assert.doesNotMatch(text,/Doctor|revived/);}
      if(role==='mindflayer'){assert.match(text,/2 tiny creatures left/);assert.match(text,enabled?/Skip to get 1 more/:/Skipping gives no new creatures/);}
      if(role==='intelligence')assert.match(text,enabled?/Get names tonight/:/No report tonight/);
    });
    assert.equal(checked.length,4);ui.cleanup();localStorage.clear();
  }
});

test('smart Intelligence description alternates with actual report availability over three nights',async()=>{
 const names=['A','B','C','D','E','F'];
 startSetup(names,{firstNightSafe:false,intelligenceInterval:2,survivorShieldCount:5},false);
 for(const role of ['Werewolf','Intelligence Chief','Survivor','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,intelligence:1,survivor:1,villager:3});
 const survivor=deal(names,counts).find(p=>p.role==='survivor').name;
 click(/START GAME/);
 for(let night=1;night<=3;night++){
  click('CONTINUE →');let saw=false;
  for(let i=0;i<6;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Intelligence Chief'){
    saw=true;assert.match(document.querySelector('.panel.description > p').textContent,night===2?/Get names tonight/:/No report tonight/);
    assert.equal(!!ui.screen.queryByRole('button',{name:'VIEW INTEL'}),night===2);
    click(night===2?'VIEW INTEL':'SKIP');finishPrivateResult();
   }else if(role==='Werewolf'){
    ui.fireEvent.click(availableTargets().find(b=>b.querySelector('strong')?.textContent===survivor));click('COMPLETE ACTION');
   }else if(role==='Survivor')click(/USE SHIELD/);else click('SKIP');
  }
  assert.ok(saw);assert.ok(ui.screen.getByText('No one was killed tonight.'));
  if(night<3){click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');}
 }
});

test('smart threshold Gambler switches to Friends goal after a late bond without a false escape promise',async()=>{
 const names=['A','B','C','D','E','F','G'];startSetup(names,{firstNightSafe:false,charmerFirstNight:2,charmerMessages:false,gamblerPredictions:1},false);
 for(const role of ['Werewolf','Friends Maker','Gambler','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,charmer:1,gambler:1,villager:4});
 let lineup;
 for(let v=0;v<100;v++){Math.random=()=>v/100;const p=deal(names,counts);if(p.findIndex(p=>p.role==='charmer')<p.findIndex(p=>p.role==='gambler')){lineup=p;break;}}
 assert.ok(lineup);const gambler=lineup.find(p=>p.role==='gambler').name,[predicted,other]=lineup.filter(p=>p.role==='villager').map(p=>p.name);
 const select=name=>{const b=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(b,`missing ${name}`);ui.fireEvent.click(b);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<7;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Gambler'||role==='Werewolf'){select(predicted);click('COMPLETE ACTION');}else click('SKIP');
 }
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<6;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Friends Maker'){select(gambler);click('COMPLETE ACTION');}
  else if(role==='Gambler'){
   // The pending friendship stays secret until dawn: do not leak it through the description.
   assert.match(document.querySelector('.panel.description > p').textContent,/Survive tonight to win and leave/);click('SKIP BET');
  }else if(role==='Werewolf'){select(other);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(ui.screen.queryByText(/left the village and won/),null);
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');
 for(let i=0;i<5;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Gambler'){
   checked=true;assert.ok(ui.screen.getByText(/Correct predictions: 1 \/ 1/));
   assert.match(document.querySelector('.panel.description > p').textContent,/Your Friends team wins/);
   assert.doesNotMatch(document.querySelector('.panel.description > p').textContent,/win and leave|in the morning/);
   assert.equal(ui.screen.queryByText(/If you live through tonight/),null);click('SKIP BET');
  }else if(role==='Werewolf'){chooseTargets(1,gambler);click('COMPLETE ACTION');}else click('SKIP');
 }
 assert.ok(checked);assert.equal(ui.screen.queryByText(/left the village and won/),null);
});

test('Sound & Feel preserves legacy toggles, saves only device preferences and restores focus',()=>{
 const old={sounds:false,buttonSounds:true,haptics:false};
 localStorage.setItem('werewolf.settings',JSON.stringify(old));
 ui.render(React.createElement(App));
 const open=ui.screen.getByRole('button',{name:'SETTINGS'});open.focus();ui.fireEvent.click(open);
 const dialog=ui.screen.getByRole('dialog',{name:'SETTINGS'}),within=ui.within(dialog);
 assert.equal(within.queryByLabelText('Background music'),null);assert.equal(within.getByLabelText('Button sounds').checked,true);assert.equal(within.getByLabelText('Button vibration').checked,false);
 assert.equal(within.queryByLabelText('Music volume'),null);assert.equal(within.getByLabelText('Effects volume').value,'50');
 ui.fireEvent.change(within.getByLabelText('Effects volume'),{target:{value:'35'}});
 ui.fireEvent.change(within.getByLabelText('Vibration feel'),{target:{value:'standard'}});
 const preferences=JSON.parse(localStorage.getItem('werewolf.feedback.v1'));
 assert.deepEqual(preferences,{ambienceVolume:45,effectsVolume:35,hapticIntensity:'standard'});
 const legacy=JSON.parse(localStorage.getItem('werewolf.settings'));for(const [k,v] of Object.entries(old))assert.equal(legacy[k],v);
 ui.fireEvent.click(within.getByRole('button',{name:'DONE'}));assert.equal(document.activeElement,open);
 ui.cleanup();ui.render(React.createElement(App));click('SETTINGS');
 assert.equal(ui.screen.getByLabelText('Effects volume').value,'35');assert.equal(ui.screen.getByLabelText('Vibration feel').value,'standard');
});

test('Sound & Feel has honest unsupported-vibration help, zero-volume previews and all-off controls',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({sounds:true,buttonSounds:true,haptics:true}));
 ui.render(React.createElement(App));click('SETTINGS');
 const dialog=ui.screen.getByRole('dialog',{name:'SETTINGS'}),within=ui.within(dialog);
 if(typeof window.navigator.vibrate!=='function'){
  assert.ok(within.getByText(/This browser does not offer vibration/));assert.equal(within.getByRole('button',{name:'PREVIEW VIBRATION'}).disabled,true);
 }
 ui.fireEvent.change(within.getByLabelText('Effects volume'),{target:{value:'0'}});
 assert.equal(within.queryByRole('button',{name:'PREVIEW MUSIC'}),null);assert.equal(within.getByRole('button',{name:'PREVIEW TAP'}).disabled,true);
 ui.fireEvent.click(within.getByRole('button',{name:'TURN ALL OFF'}));
 const saved=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(saved.sounds,false);assert.equal(saved.buttonSounds,false);assert.equal(saved.haptics,false);
 assert.match(within.getByRole('status').textContent,/are off/);
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.feedback.v1')),{ambienceVolume:45,effectsVolume:0,hapticIntensity:'gentle'});
 ui.fireEvent(dialog,new window.Event('cancel',{bubbles:true,cancelable:true}));assert.equal(ui.screen.queryByRole('dialog',{name:'SETTINGS'}),null);
});

test('Sound & Feel malformed preferences recover and a tap preview fires exactly once without vibration',()=>{
 const previousAudio=Object.getOwnPropertyDescriptor(window,'AudioContext'),previousVibrate=Object.getOwnPropertyDescriptor(window.navigator,'vibrate');const sounds=[],vibrations=[];
 class Context {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){sounds.push('tap');},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  close(){return Promise.resolve();}
 }
 Object.defineProperty(window,'AudioContext',{configurable:true,value:Context});Object.defineProperty(window.navigator,'vibrate',{configurable:true,value:n=>vibrations.push(n)});
 try{
  localStorage.setItem('werewolf.feedback.v1','{"effectsVolume":"loud","ambienceVolume":999}');
  localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:true,haptics:true}));
  ui.render(React.createElement(App));click('SETTINGS');assert.equal(ui.screen.queryByLabelText('Music volume'),null);assert.equal(ui.screen.getByLabelText('Effects volume').value,'50');
  sounds.length=0;vibrations.length=0;click('PREVIEW TAP');assert.deepEqual(sounds,['tap']);assert.deepEqual(vibrations,[]);
  assert.match(ui.screen.getByRole('status').textContent,/Tap preview requested/);
  sounds.length=0;click('PREVIEW VIBRATION');assert.deepEqual(sounds,[]);assert.deepEqual(vibrations,[8]);
 }finally{ui.cleanup();if(previousAudio)Object.defineProperty(window,'AudioContext',previousAudio);else delete window.AudioContext;if(previousVibrate)Object.defineProperty(window.navigator,'vibrate',previousVibrate);else delete window.navigator.vibrate;}
});

test('Sound & Feel is reachable during a private turn without changing the player or action queue',()=>{
 startSetup(['A','B','C','D'],{sounds:false,buttonSounds:false,haptics:false});click(/START GAME/);click('CONTINUE →');click(/SHOW YOUR ROLE/);
 const heading=ui.screen.getByRole('heading',{level:2}).textContent;
 const roleText=document.querySelector('.panel.description > p').textContent;
 assert.equal(document.querySelector('main').dataset.feedbackScope,'private');
 click('SETTINGS');const dialog=ui.screen.getByRole('dialog',{name:'SETTINGS'});
 ui.fireEvent.change(ui.within(dialog).getByLabelText('Effects volume'),{target:{value:'20'}});ui.fireEvent.click(ui.within(dialog).getByRole('button',{name:'DONE'}));
 assert.equal(ui.screen.getByRole('heading',{level:2}).textContent,heading);assert.equal(document.querySelector('.panel.description > p').textContent,roleText);
});

test('reduced animation preference is device-only, survives reopening and does not change sound settings',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:true,haptics:false}));
 ui.render(React.createElement(App));assert.equal(document.querySelector('main').dataset.motion,'system');click('SETTINGS');
 const within=ui.within(ui.screen.getByRole('dialog',{name:'SETTINGS'}));assert.equal(within.getByLabelText('Reduce animations').checked,false);
 ui.fireEvent.click(within.getByLabelText('Reduce animations'));assert.equal(document.querySelector('main').dataset.motion,'reduced');assert.equal(JSON.parse(localStorage.getItem('werewolf.motion.v1')),'reduced');
 assert.equal(within.queryByLabelText('Background music'),null);assert.equal(within.getByLabelText('Button sounds').checked,true);assert.equal(within.getByLabelText('Button vibration').checked,false);
 click('DONE');ui.cleanup();ui.render(React.createElement(App));click('SETTINGS');assert.equal(ui.screen.getByLabelText('Reduce animations').checked,true);
 ui.fireEvent.click(ui.screen.getByLabelText('Reduce animations'));assert.equal(document.querySelector('main').dataset.motion,'system');
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.feedback.v1')),{ambienceVolume:45,effectsVolume:50,hapticIntensity:'gentle'});
});

test('invalid motion preferences fall back safely and Turn All Off reduces visual effects too',()=>{
 localStorage.setItem('werewolf.motion.v1',JSON.stringify({mode:'full',role:'madman'}));ui.render(React.createElement(App));assert.equal(document.querySelector('main').dataset.motion,'system');
 assert.equal(localStorage.getItem('werewolf.motion.v1'),'"system"');click('SETTINGS');click('TURN ALL OFF');
 assert.equal(ui.screen.getByLabelText('Reduce animations').checked,true);assert.equal(document.querySelector('main').dataset.motion,'reduced');assert.equal(localStorage.getItem('werewolf.motion.v1'),'"reduced"');
 assert.match(ui.screen.getByRole('status').textContent,/Animations are reduced/);
});

test('changing motion during a private turn keeps the same role, description and action queue',()=>{
 startSetup(['A','B','C','D'],{sounds:false,buttonSounds:false,haptics:false});click(/START GAME/);click('CONTINUE →');click(/SHOW YOUR ROLE/);
 const role=ui.screen.getByRole('heading',{level:2}).textContent,description=document.querySelector('.panel.description > p').textContent;
 click('SETTINGS');ui.fireEvent.click(ui.within(ui.screen.getByRole('dialog',{name:'SETTINGS'})).getByLabelText('Reduce animations'));click('DONE');
 assert.equal(ui.screen.getByRole('heading',{level:2}).textContent,role);assert.equal(document.querySelector('.panel.description > p').textContent,description);assert.equal(document.querySelector('main').dataset.motion,'reduced');
});

test('public reference and role detail dialogs retain native modal focus under StrictMode',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false}));
 ui.render(React.createElement(React.StrictMode,null,React.createElement(App)));
 const book=ui.screen.getByRole('button',{name:'ROLE RULEBOOK'});book.focus();ui.fireEvent.click(book);assert.ok(ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'}).open);assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'Close role rulebook'}));click('Close role rulebook');assert.equal(document.activeElement,book);
 click('START GAME');click(/CHOOSE ROLES/);const details=ui.screen.getByRole('button',{name:'View Doctor details'});details.focus();ui.fireEvent.click(details);assert.ok(ui.screen.getByRole('dialog',{name:'DOCTOR'}).open);assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'Close role details'}));click('Close role details');assert.equal(document.activeElement,details);
 const random=ui.screen.getByRole('button',{name:'View random VILLAGERS details'});random.focus();ui.fireEvent.click(random);assert.ok(ui.screen.getByRole('dialog',{name:'RANDOM VILLAGERS'}).open);click('Close random role details');assert.equal(document.activeElement,random);
});

test('avatar sheet content switch keeps the original form opener for focus restoration',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));ui.render(React.createElement(App));click('START GAME');click('Add player');
 const opener=ui.screen.getByRole('button',{name:'Choose or change game avatar'});opener.focus();ui.fireEvent.click(opener);assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'Game avatars'}));click('Game avatars');assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'Back to photo options'}));click('Back to photo options');assert.equal(document.activeElement,ui.screen.getByRole('button',{name:'Game avatars'}));click('CANCEL');assert.equal(document.activeElement,opener);
});

test('role detail power badge exposes a named graphic rather than a prohibited generic label',()=>{
 startSetup(['A','B','C','D']);click('View Doctor details');
 assert.ok(ui.screen.getByRole('img',{name:`Power ${rolePower('doctor',defaults)} out of 10, estimated for current settings`}));
});

test('handoff focus stays on a neutral heading, not the next reveal button',()=>{
 startSetup(['A','B','C','D'],{firstNightSafe:true});click(/START GAME/);click('CONTINUE →');
 assert.equal(document.activeElement,document.querySelector('.player-pass h2'));assert.equal(document.activeElement.tabIndex,-1);click(/SHOW YOUR ROLE/);click('SKIP');
 const heading=document.querySelector('.player-pass h2');assert.equal(document.activeElement,heading);ui.fireEvent.keyDown(heading,{key:'Enter',repeat:true});ui.fireEvent.keyUp(heading,{key:'Enter'});assert.ok(document.querySelector('.player-pass'));assert.equal(document.querySelector('.action'),null);
});
test('private target selection exposes pressed state without changing selection behavior',()=>{
 startSetup(['A','B','C','D'],{firstNightSafe:false});click(/START GAME/);click('CONTINUE →');let target;for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);target=availableTargets()[0];if(target)break;click('SKIP');}assert.ok(target);assert.equal(target.getAttribute('aria-pressed'),'false');ui.fireEvent.click(target);assert.equal(target.getAttribute('aria-pressed'),'true');assert.ok(target.classList.contains('selected'));ui.fireEvent.click(target);assert.equal(target.getAttribute('aria-pressed'),'false');assert.equal(target.classList.contains('selected'),false);
});


test('setup count guidance explains the minimum and random players are not added to the library',()=>{
 localStorage.setItem('werewolf.names','[]');Math.random=()=>0;ui.render(React.createElement(App));click('START GAME');
 const next=ui.screen.getByRole('button',{name:/CHOOSE ROLES/});assert.ok(next.disabled);assert.equal(next.getAttribute('aria-describedby'),'player-count-help');assert.equal(document.getElementById('player-count-help').textContent,'Add 4 more players.');
 for(let i=0;i<3;i++)click('RANDOM');assert.ok(next.disabled);assert.equal(document.getElementById('player-count-help').textContent,'Add 1 more player.');
 click('RANDOM');assert.equal(next.disabled,false);assert.match(document.getElementById('player-count-help').textContent,/Next: choose one role/);assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.library.v1')),[]);
 click(/CHOOSE ROLES/);assert.equal(document.getElementById('role-count-help'),null);
});

test('compact role counter retains missing/excess count gating and engine validation without helper text',()=>{
 startSetup(['A','B','C','D'],{},false);assert.equal(document.getElementById('role-count-help'),null);
 assert.ok(ui.screen.getByRole('button',{name:'START GAME 0 / 4'}).disabled);
 for(let i=0;i<4;i++)click('Add Villager');const start=ui.screen.getByRole('button',{name:'START GAME 4 / 4'});assert.equal(start.disabled,false);assert.equal(start.getAttribute('aria-describedby'),null);click('START GAME 4 / 4');assert.match(ui.screen.getByRole('alert').textContent,/keep wolves fewer than half/);
 click('Add Werewolf');assert.ok(ui.screen.getByRole('button',{name:'START GAME 5 / 4'}).disabled);assert.equal(ui.screen.queryByRole('alert'),null);
 click('Remove Villager');click('START GAME 4 / 4');assert.ok(document.querySelector('.night-intro'));
});

test('random help follows the existing unique option without altering manual counts',()=>{
 startSetup(['A','B','C','D']);assert.match(document.querySelector('.random-pick-help').textContent,/can repeat/);click('View random VILLAGERS details');ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'One player per random role'}));click('Close random role details');
 assert.match(document.querySelector('.random-pick-help').textContent,/do not repeat/);assert.equal(ui.screen.getByRole('button',{name:'START GAME 4 / 4'}).disabled,false);assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).randomUniqueRoles,true);
});

test('how to play opens public reference and returns without starting or exposing a match',()=>{
 ui.render(React.createElement(App));click('HOW TO PLAY');assert.ok(ui.screen.getByRole('heading',{name:'Keep night turns private'}));assert.ok(ui.screen.getByRole('heading',{name:'Keep the game open'}));
 const opener=ui.screen.getByRole('button',{name:'ROLE RULEBOOK'});opener.focus();ui.fireEvent.click(opener);assert.equal(ui.screen.getByRole('dialog',{name:'ROLE RULEBOOK'}).querySelectorAll('.role-rulebook-entry').length,35);click('Close role rulebook');assert.equal(document.activeElement,opener);assert.ok(ui.screen.getByRole('heading',{name:'THE RULEBOOK'}));click('GOT IT');assert.ok(ui.screen.getByRole('button',{name:'HOW TO PLAY'}));
});

test('optional setup guidance does not alter the chosen lineup or distribution settings',()=>{
 startSetup(['A','B','C','D']);const counts=[...document.querySelectorAll('.stepper span')].map(el=>el.textContent),settings=localStorage.getItem('werewolf.settings');
 assert.equal(ui.screen.queryByText('QUICK SETUP GUIDE'),null);click('RANDOM DISTRIBUTION');
 assert.deepEqual([...document.querySelectorAll('.stepper span')].map(el=>el.textContent),counts);assert.equal(localStorage.getItem('werewolf.settings'),settings);assert.match(document.querySelector('.distribution-options').textContent,/replaces your selected lineup/);assert.equal(ui.screen.getByRole('button',{name:'START GAME 4 / 4'}).disabled,false);
});

test('grouped settings retain role preferences and hidden duration values across toggles and reopening',()=>{
 startSetup(['A','B','C','D'],{passiveWait:false,allRolesWait:false,passiveWaitSeconds:4,allRolesWaitSeconds:9,roleWaitSeconds:{doctor:6},roleChances:{doctor:25},disabledRandomRoles:['seer'],randomUniqueRoles:true});
 const counts=[...document.querySelectorAll('.stepper span')].map(el=>el.textContent);
 for(const name of ['LINEUP TOOLS','VOTING & REVEALS','NIGHT SAFETY','TURN TIMING'])assert.ok(ui.screen.getByRole('region',{name}));
 for(const [toggle,label,expected] of [['Wait time for passive roles','Passive role wait seconds','4'],['Wait time for every role','Every role wait seconds','9']]){
  ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:toggle}));const range=ui.screen.getByRole('slider',{name:label});assert.equal(range.value,expected);assert.equal(range.closest('label').previousElementSibling.querySelector('input').getAttribute('aria-label'),toggle);ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:toggle}));assert.equal(ui.screen.queryByRole('slider',{name:label}),null);
 }
 const saved=JSON.parse(localStorage.getItem('werewolf.settings'));assert.equal(saved.passiveWaitSeconds,4);assert.equal(saved.allRolesWaitSeconds,9);assert.deepEqual(saved.roleWaitSeconds,{doctor:6});assert.deepEqual(saved.roleChances,{doctor:25});assert.deepEqual(saved.disabledRandomRoles,['seer']);assert.equal(saved.randomUniqueRoles,true);
 assert.deepEqual([...document.querySelectorAll('.stepper span')].map(el=>el.textContent),counts);
 ui.cleanup();ui.render(React.createElement(App));click('START GAME');click(/CHOOSE ROLES/);ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Wait time for passive roles'}));assert.equal(ui.screen.getByRole('slider',{name:'Passive role wait seconds'}).value,'4');assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.settings')).roleWaitSeconds,{doctor:6});
});

test('grouped timing controls still use the longest passive global and individual wait, never their sum',async()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try{
  startSetup(['A','B','C','D'],{passiveWait:false,allRolesWait:false,roleWaitSeconds:{villager:1,muted:3}},false);
  for(const [toggle,label,value] of [['Wait time for passive roles','Passive role wait seconds','4'],['Wait time for every role','Every role wait seconds','2']]){ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:toggle}));ui.fireEvent.change(ui.screen.getByRole('slider',{name:label}),{target:{value}});}
  for(const role of ['Werewolf','Villager','Villager','Muter'])click('Add '+role);click('START GAME 4 / 4');click('CONTINUE →');
  for(let i=0;i<4;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent,expected=role==='Werewolf'?2:role==='Muter'?3:4;
   assert.match(ui.screen.getByRole('status').textContent,new RegExp(`${expected} seconds`));assert.ok(ui.screen.getByRole('button',{name:role==='Muter'?'SKIP MUTE':'SKIP'}).disabled);now+=expected*1000;await ui.act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});assert.equal(ui.screen.getByRole('button',{name:role==='Muter'?'SKIP MUTE':'SKIP'}).disabled,false);click(role==='Muter'?'SKIP MUTE':'SKIP');
  }
  assert.ok(document.querySelector('.morning-report'));
 }finally{Date.now=originalNow;}
});

test('setup has no Preferences entry while device choices remain available from the home gear',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false,haptics:false}));ui.render(React.createElement(App));
 const opener=ui.screen.getByRole('button',{name:'SETTINGS'});opener.focus();ui.fireEvent.click(opener);const within=ui.within(ui.screen.getByRole('dialog',{name:'SETTINGS'}));ui.fireEvent.change(within.getByLabelText('Effects volume'),{target:{value:'25'}});ui.fireEvent.click(within.getByLabelText('Button sounds'));ui.fireEvent.click(within.getByLabelText('Reduce animations'));click('DONE');assert.equal(document.activeElement===opener,true);
 click('START GAME');click(/CHOOSE ROLES/);assert.equal(ui.screen.queryByRole('region',{name:'PREFERENCES'}),null);assert.equal(ui.screen.queryByRole('button',{name:'SETTINGS'}),null);assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).buttonSounds,true);assert.equal(JSON.parse(localStorage.getItem('werewolf.feedback.v1')).effectsVolume,25);assert.equal(JSON.parse(localStorage.getItem('werewolf.motion.v1')),'reduced');
});

test('grouped settings still apply in memory when saving preferences is unavailable',()=>{
 startSetup(['A','B','C','D'],{secretVotes:true});const prototype=Object.getPrototypeOf(localStorage),original=prototype.setItem,saved=localStorage.getItem('werewolf.settings');
 try{prototype.setItem=function(key,value){if(key==='werewolf.settings')throw new Error('Storage disabled');return original.call(this,key,value);};ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Secret voting'}));assert.equal(ui.screen.getByRole('checkbox',{name:'Secret voting'}).checked,false);assert.equal(localStorage.getItem('werewolf.settings'),saved);assert.equal(document.querySelector('.setup-settings-note'),null);click('START GAME 4 / 4');assert.ok(document.querySelector('.night-intro'));}
 finally{prototype.setItem=original;}
});


for(const everyNight of [false,true])test(`spent Sheriff guidance follows the existing every-night setting ${everyNight}`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,sheriffEveryNight:everyNight},false);for(const role of ['Werewolf','Sheriff','Villager','Villager','Villager','Villager'])click('Add '+role);
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts'),counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,villager:4});const victim=engine.deal(names,counts).find(p=>p.role==='villager').name;
 click('START GAME 6 / 6');click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(['Werewolf','Sheriff'].includes(role)){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===victim);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<5;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Sheriff'){checked=true;const hint=document.querySelector('.turn-help');assert.equal(!!hint,!everyNight);if(everyNight)assert.ok(ui.screen.getByRole('button',{name:'SAVE BULLET FOR LATER'}));else {assert.match(hint.textContent,/shot has already been used/);assert.equal(availableTargets().length,0);click('SKIP');assert.equal(hint.isConnected,false);}break;}if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}
 assert.ok(checked);
});

test('a disguised Madman Sheriff gets the same used-shot help without an outcome or identity clue',async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false},false);for(const role of ['Werewolf','Madman','Villager','Villager','Villager','Villager'])click('Add '+role);
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts'),eligible=Object.keys(roles).filter(engine.isEligibleMadmanRole);Math.random=()=>(eligible.indexOf('sheriff')+.01)/eligible.length;const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,madman:1,villager:4});const lineup=engine.deal(names,counts),villagers=lineup.filter(p=>p.role==='villager');
 click('START GAME 6 / 6');Math.random=()=>0;click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(['Werewolf','Sheriff'].includes(role)){const name=role==='Sheriff'?villagers[0].name:villagers[1].name,target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');}
 assert.equal(ui.screen.queryByText(new RegExp(`${villagers[0].name} died`)),null);click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let checked=false;
 for(let i=0;i<5;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Sheriff'){checked=true;assert.equal(document.querySelector('.turn-help').textContent,'Your shot has already been used. Choose SKIP to finish your turn.');assert.doesNotMatch(document.querySelector('.turn-help').textContent,/Madman|blocked|successful|killed/i);click('SKIP');break;}if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}assert.ok(checked);
});

for(const terminal of [false,true])test(`morning destination help matches the unchanged next screen: terminal ${terminal}`,async()=>{
 const names=['A','B','C','D'];startSetup(names,{firstNightSafe:!terminal},false);for(const role of terminal?['Werewolf','Sheriff','Villager','Villager']:['Werewolf','Villager','Villager','Villager'])click('Add '+role);
 let lineup;if(terminal){const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts'),counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,sheriff:1,villager:2});lineup=engine.deal(names,counts);}
 click('START GAME 4 / 4');click('CONTINUE →');
 for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(terminal && ['Sheriff','Werewolf'].includes(role)){const name=lineup.find(p=>p.role===(role==='Sheriff'?'werewolf':'villager')).name,target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);click('COMPLETE ACTION');}else click('SKIP');}
 assert.equal(document.querySelector('.morning-next-step').textContent,terminal?'Next: match results.':'Next: discussion and voting.');const next=ui.screen.getByRole('button',{name:'CONTINUE →'});assert.equal(next.querySelector('.hold-label').textContent,'CONTINUE →');assert.ok(next.getAttribute('aria-describedby').split(' ').includes('morning-next-step'));assert.equal(document.querySelector('.turn-help'),null);click('CONTINUE →');assert.ok(document.querySelector(terminal?'.match-results':'.discussion-screen'));
});


for(const secretVotes of [true,false])for(const allowSkip of [true,false])test(`clear voter identity without guidance preserves secret=${secretVotes}, skip=${allowSkip}`,()=>{
 const names=['A','B','C','D','E','F'];localStorage.setItem('werewolf.avatars.v1',JSON.stringify(Object.fromEntries(names.map((name,i)=>[name.toLowerCase(),`./werewolf/avatars/player${[5,1,2,4,3,11][i]}.webp`]))));startSetup(names,{secretVotes,allowSkip},false);click('Add Werewolf');for(let i=0;i<5;i++)click('Add Villager');click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<6;i++){
  assert.equal(document.querySelector('.voter-name').textContent,names[i]);assert.equal(ui.screen.getByRole('button',{name:'VOTE',exact:true}).disabled,true);assert.equal(document.querySelectorAll('.target[aria-pressed="true"]').length,0);
  assert.equal(!!ui.screen.queryByRole('button',{name:'SKIP VOTE'}),allowSkip);assert.equal(!!ui.screen.queryByText(/^Votes so far:/),!secretVotes);
  assert.equal(document.querySelector('.voting-help,.vote-progress'),null);
  assert.equal(document.querySelector('.voter-heading h2').getAttribute('tabindex'),'-1');
  assert.equal(document.querySelector('.voter-avatar img').getAttribute('src'),['./werewolf/avatars/photo-05-20261106.jpg','./werewolf/avatars/photo-01-20261106.png','./werewolf/avatars/photo-02-20261106.png','./werewolf/avatars/player4.webp','./werewolf/avatars/photo-03-20261106.jpg','./werewolf/avatars/player11.webp'][i]);
  assert.doesNotMatch(document.querySelector('.vote-page').textContent,/Voter \d+ of|Choose an available player|Earlier votes|SKIP VOTE passes|Skipping is off/);
  if(allowSkip && i%2===0)click('SKIP VOTE');else{ui.fireEvent.click(availableTargets()[0]);assert.equal(document.querySelector('.voter-name').textContent,names[i]);assert.equal(document.querySelectorAll('.target[aria-pressed="true"]').length,1);click('VOTE');}
 }
 assert.equal(document.querySelector('.voting-help'),null);assert.ok(ui.screen.getByRole('button',{name:'CONTINUE →'}));
});

// New default Thief rules; historical scenarios above explicitly exercise the legacy opt-out.
test('fresh Thief setup defaults to death-only, persists all durations and exposes attack interval only in legacy mode',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D','E','F']));ui.render(React.createElement(App));click('START GAME');click(/CHOOSE ROLES/);click('View Thief details');ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));
 const checkbox=ui.screen.getByLabelText('Steal only after death');assert.equal(checkbox.checked,true);assert.equal(ui.screen.queryByLabelText('Thief attack interval'),null);assert.equal(ui.screen.getByLabelText('Thief target duration').value,'replace');assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 4/10');
 for(const mode of ['persistent','cycle','replace']){ui.fireEvent.change(ui.screen.getByLabelText('Thief target duration'),{target:{value:mode}});assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).thiefTargetMode,mode);assert.equal(document.querySelector('.role-power-detail').textContent,`POWER ${mode==='replace'?4:3}/10`);}
 ui.fireEvent.click(checkbox);assert.equal(ui.screen.getByLabelText('Thief attack interval').value,'1');assert.equal(ui.screen.queryByLabelText('Thief target duration'),null);assert.equal(document.querySelector('.role-power-detail').textContent,'POWER 8/10');ui.fireEvent.change(ui.screen.getByLabelText('Thief attack interval'),{target:{value:'2'}});ui.fireEvent.click(checkbox);assert.equal(ui.screen.queryByLabelText('Thief attack interval'),null);ui.fireEvent.click(checkbox);assert.equal(ui.screen.getByLabelText('Thief attack interval').value,'2');
});
async function thiefLineup(extra={}){
 const names=['A','B','C','D','E','F'];startSetup(names,{thiefDeathOnly:true,thiefTargetMode:'replace',firstNightSafe:true,...extra},false);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,thief:1,villager:4});for(const role of ['Werewolf','Thief','Villager','Villager','Villager','Villager'])click('Add '+role);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');return deal(names,counts);
}
function pickNamed(name){const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target,'living target '+name);ui.fireEvent.click(target);}
function watchFirstNight(wolf){click('START GAME 6 / 6');click('CONTINUE →');for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Thief'){assert.equal(availableTargets().length,5);assert.doesNotMatch(document.querySelector('.action').textContent,/No killing ability/);pickNamed(wolf);click('CHOOSE TARGET');}else click('SKIP');}assert.ok(ui.screen.getByText('No one was killed tonight.'));}
test('death-only Thief watches on safe night one, inherits the voted-out last Werewolf before the game can end',async()=>{
 const lineup=await thiefLineup(),wolf=lineup.find(p=>p.role==='werewolf').name,thief=lineup.find(p=>p.role==='thief').name;watchFirstNight(wolf);click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<6;i++){const voter=ui.screen.getByRole('heading',{level:2}).textContent.split(',')[0];if(voter===wolf)click('SKIP VOTE');else{pickNamed(wolf);click('VOTE');}}
 click('CONTINUE →');assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 2 STARTED'}));click('CONTINUE →');let saw=false;for(let i=0;i<5;i++){const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(name===thief){saw=true;assert.equal(role,'Werewolf');assert.ok(ui.screen.getByText('You stole this role and joined its team.'));break;}if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}assert.ok(saw);
});
for(const mode of ['persistent','replace','cycle'])test('Thief target policy '+mode+' is enforced on the next actual night',async()=>{
 const lineup=await thiefLineup({thiefTargetMode:mode}),wolf=lineup.find(p=>p.role==='werewolf').name;watchFirstNight(wolf);click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<6;i++)click('SKIP VOTE');click('CONTINUE →');click('CONTINUE →');let saw=false;
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Thief'){saw=true;assert.equal(!!document.querySelector('.thief-watch'),mode!=='cycle');if(mode==='persistent'){assert.equal(availableTargets().length,0);assert.equal(ui.screen.getByRole('button',{name:'KEEP TARGET'}).disabled,false);assert.equal(ui.screen.queryByRole('button',{name:'CHOOSE TARGET'}),null);}else{assert.equal(availableTargets().length,5);assert.ok(ui.screen.getByRole('button',{name:'CHOOSE TARGET'}).disabled);assert.ok(ui.screen.getByRole('button',{name:mode==='cycle'?'SKIP CHOICE':'KEEP TARGET'}));}break;}if(role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}assert.ok(saw);
});


test('home uses a corner Settings gear, primary Start and paired help buttons',()=>{
 ui.render(React.createElement(App));
 const gear=ui.screen.getByRole('button',{name:'SETTINGS',exact:true});
 assert.ok(gear.classList.contains('game-settings-button'));
 assert.equal(gear.textContent,'');assert.ok(gear.querySelector('svg'));
 const home=document.querySelector('.home-buttons');assert.equal(home.children.length,3);
 assert.equal(home.children[0],ui.screen.getByRole('button',{name:'START GAME',exact:true}));
 assert.equal(home.children[1],ui.screen.getByRole('button',{name:'HOW TO PLAY',exact:true}));
 assert.equal(home.children[2],ui.screen.getByRole('button',{name:'ROLE RULEBOOK',exact:true}));
 assert.equal(document.querySelector('.home-feedback,.home-content .offline-notice'),null);
 gear.focus();click('SETTINGS');assert.ok(ui.screen.getByRole('dialog',{name:'SETTINGS'}));click('DONE');
 assert.equal(document.activeElement===gear,true);
 click('HOW TO PLAY');assert.ok(ui.screen.getByRole('button',{name:'GOT IT'}));click('GOT IT');
 click('ROLE RULEBOOK');assert.ok(ui.screen.getByRole('dialog'));click('Close role rulebook');
});

for(const duration of [0.5,1,1.5,2,2.5,3])test(`timer-only discussion ${duration} minutes has no override buttons and starts voting automatically`,()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try{
  startSetup(['A','B','C','D'],{discussionMinutes:duration,manualDiscussionControls:false},false);for(const r of ['Werewolf','Villager','Villager','Villager'])click('Add '+r);click(/START GAME/);click('CONTINUE →');
  for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);click('SKIP');}
  const next=ui.screen.getByRole('button',{name:'CONTINUE →'});assert.ok(next.classList.contains('hold-button'));ui.fireEvent.click(next);assert.ok(document.querySelector('.morning-report'));click('CONTINUE →');
  assert.equal(ui.screen.queryByRole('button',{name:'END DISCUSSION →'}),null);assert.equal(ui.screen.queryByRole('button',{name:'+1 MINUTE'}),null);assert.equal(document.querySelector('.timer').textContent,`${String(Math.floor(duration)).padStart(2,'0')}:${duration%1?'30':'00'}`);
  now+=duration*60000-1000;ui.act(()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(document.querySelector('.timer').textContent,'00:01');now+=1000;ui.act(()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.ok(document.querySelector('.vote-page'));assert.equal(document.querySelectorAll('.target.selected').length,0);
 }finally{Date.now=originalNow;}
});

for(const existing of [false,true])test(`both Randomizer and all Random cards default to uniqueness and chances ON (old preferences ${existing})`,()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));if(existing)localStorage.setItem('werewolf.settings',JSON.stringify({randomUniqueRoles:false,randomFollowChances:false,distributionUniqueRoles:false,distributionFollowChances:false,sounds:false,discussionMinutes:0.5,roleChances:{doctor:25}}));ui.render(React.createElement(App));click('START GAME');click(/CHOOSE ROLES/);click('RANDOM DISTRIBUTION');
 for(const name of ['Distribution follows role chances','One player per distribution role'])assert.equal(ui.screen.getByRole('checkbox',{name}).checked,true);
 for(const team of ['VILLAGERS','WEREWOLVES','NEUTRALS']){click(`View random ${team} details`);for(const name of ['One player per random role','Random cards follow role chances'])assert.equal(ui.screen.getByRole('checkbox',{name}).checked,true);click('Close random role details');}
 assert.equal(localStorage.getItem('werewolf.random-defaults.v1'),'1');if(existing){const settings=JSON.parse(localStorage.getItem('werewolf.settings'));assert.deepEqual(settings.roleChances,{doctor:25});assert.equal(settings.discussionMinutes,0.5);assert.equal(settings.sounds,false);}
 // Later deliberate OFF choices must survive reopening, rather than being forced ON every time.
 for(const name of ['Distribution follows role chances','One player per distribution role'])ui.fireEvent.click(ui.screen.getByRole('checkbox',{name}));click('View random VILLAGERS details');for(const name of ['One player per random role','Random cards follow role chances'])ui.fireEvent.click(ui.screen.getByRole('checkbox',{name}));click('Close random role details');
 ui.cleanup();ui.render(React.createElement(App));click('START GAME');click(/CHOOSE ROLES/);click('RANDOM DISTRIBUTION');for(const name of ['Distribution follows role chances','One player per distribution role'])assert.equal(ui.screen.getByRole('checkbox',{name}).checked,false);click('View random WEREWOLVES details');for(const name of ['One player per random role','Random cards follow role chances'])assert.equal(ui.screen.getByRole('checkbox',{name}).checked,false);
});

test('plain Thief descriptions show the three necessary lines on actual private turns for every watch policy',()=>{
 for(const mode of ['persistent','replace','cycle']){
  const lineup=['thief','werewolf','villager','villager'];
  startSetup(lineup.map((_,i)=>`Player ${i+1}`),{thiefDeathOnly:true,thiefTargetMode:mode,firstNightSafe:true},false);
  for(const role of lineup)click('Add '+roles[role].name);
  click(/START GAME/);click('CONTINUE →');let checked=false;
  for(let i=0;i<lineup.length;i++){
   click(/SHOW YOUR ROLE/);
   if(ui.screen.getByRole('heading',{level:2}).textContent==='Thief'){
    checked=true;const text=document.querySelector('.panel.description > p').textContent;
    assert.equal(text.split('\n').length,3);
    assert.match(text,/Steal a role and win with your new team/);
    assert.match(text,/without attacking them/);
    assert.match(text,/voted out.*you survive, take their role/);
    assert.doesNotMatch(text,/You join their team/);
    click('SKIP CHOICE');
   }else click('SKIP');
  }
  assert.ok(checked,mode);ui.cleanup();localStorage.clear();
 }
});

test('MVP rankings replace duplicate results and START AGAIN reshuffles the same setup with clean progress and single match credit',()=>{
 const names=['Raya','Hana','Elena','Noah'];startSetup(names,{firstNightSafe:true,secretVotes:false},false);
 for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);
 click(/START GAME/);click('CONTINUE →');let wolf;const first=[];
 for(let i=0;i<4;i++){const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;first.push([name,role]);if(role==='Werewolf')wolf=name;click('SKIP');}
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<4;i++){if(document.querySelector('.voter-name').textContent===wolf)click('SKIP VOTE');else{pickNamed(wolf);click('VOTE');}}
 click('CONTINUE →');assert.ok(ui.screen.getByRole('group',{name:'Match rankings'}));assert.equal(document.querySelectorAll('.is-mvp').length,1);assert.equal(document.querySelectorAll('.match-player-card').length,4);
 assert.equal(ui.screen.queryByRole('button',{name:'NIGHT RANKINGS'}),null);
 const records=JSON.parse(localStorage.getItem('werewolf.rankings.v1'));assert.ok(records.every(r=>r.played===1));
 Math.random=()=>.9999;click('START AGAIN');assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));click('CONTINUE →');const second=[];
 for(let i=0;i<4;i++){const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;second.push([name,role]);if(role==='Werewolf')assert.equal(availableTargets().length,0);click('SKIP');}
 assert.deepEqual(second.map(p=>p[0]),names);assert.deepEqual(second.map(p=>p[1]).sort(),first.map(p=>p[1]).sort());assert.notDeepEqual(second,first);
 click('CONTINUE →');assert.ok(ui.screen.getByText('DISCUSS YOUR SUSPECTS'));assert.equal(document.querySelector('.match-results'),null);
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.rankings.v1')),records);
 assert.equal(JSON.parse(localStorage.getItem('werewolf.settings')).secretVotes,false);
});

for(const hide of [false,true])for(const reveal of [false,true])test(`voted-out hiding ${hide} with death-role reveal ${reveal} keeps reports private and end results complete`,async()=>{
 const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:false,revealDead:reveal,hideVotedOutRoles:hide,sounds:false,buttonSounds:false},false);
 for(const r of ['Werewolf','Villager','Villager','Villager','Villager','Villager'])click('Add '+r);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,villager:5});const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf'),victim=lineup.find(p=>p.role==='villager');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong')?.textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Werewolf'){pick(victim.name);click('COMPLETE ACTION');}else click('SKIP');}
 const morning=document.querySelector('.morning-death');assert.ok(morning);assert.equal(!!morning.querySelector('.morning-role'),reveal,'voted-out switch does not change morning role visibility');
 click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<5;i++){if(document.querySelector('.voter-name').textContent===wolf.name)click('SKIP VOTE');else {pick(wolf.name);click('VOTE');}}
 const verdict=document.querySelector('.vote-verdict'),show=reveal&&!hide;assert.ok(verdict);assert.equal(!!verdict.querySelector('.verdict-role'),show);assert.equal(verdict.querySelector('h3').textContent,wolf.name+(show?' — Werewolf':''));
 if(!show)assert.doesNotMatch(verdict.innerHTML,/werewolf/i);
 click('CONTINUE →');assert.ok(ui.screen.getByRole('heading',{name:'VILLAGE WINS'}));assert.match(ui.screen.getByRole('article',{name:wolf.name+': lost'}).querySelector('.match-player-role').textContent,/Werewolf/);assert.equal(document.querySelectorAll('.match-player-frame').length,6);
});

test('two Villagers, one Werewolf and one living Survivor share the village win after executing the wolf',async()=>{
 const names=['A','B','C','D'];startSetup(names,{firstNightSafe:true,sounds:true,buttonSounds:false},false);for(const r of ['Villager','Villager','Werewolf','Survivor'])click('Add '+r);
 const {deal}=await vite.ssrLoadModule('/src/werewolf-engine.ts');const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{villager:2,werewolf:1,survivor:1});const lineup=deal(names,counts),wolf=lineup.find(p=>p.role==='werewolf'),survivor=lineup.find(p=>p.role==='survivor');
 click(/START GAME/);click('CONTINUE →');for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);click('SKIP');}click('CONTINUE →');click('END DISCUSSION →');
 for(let i=0;i<4;i++){if(document.querySelector('.voter-name').textContent===wolf.name)click('SKIP VOTE');else{ui.fireEvent.click(availableTargets().find(b=>b.querySelector('strong')?.textContent===wolf.name));click('VOTE');}}click('CONTINUE →');
 assert.ok(ui.screen.getByRole('heading',{name:'VILLAGE AND SURVIVOR WIN'}));const row=ui.screen.getByRole('article',{name:survivor.name+': won'});assert.ok(ui.within(row).getByText('WON'));assert.ok(ui.within(row).getByText('ALIVE'));assert.ok(ui.within(row).getByText('Survivor'));assert.equal(rankings.readRankings().find(r=>r.name===survivor.name).wins,1);
});

test('card reveal settings are independent, device-only, persistent and included in TURN ALL OFF',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:true,haptics:true}));
 ui.render(React.createElement(App));click('SETTINGS');
 const toggle=()=>ui.screen.getByLabelText('Card reveal sounds');
 assert.equal(toggle().checked,true);assert.equal(ui.screen.getByLabelText('Card reveal volume').value,'50');
 ui.fireEvent.change(ui.screen.getByLabelText('Card reveal volume'),{target:{value:'75'}});
 ui.fireEvent.click(ui.screen.getByLabelText('Button sounds'));
 assert.equal(toggle().checked,true);assert.equal(ui.screen.getByLabelText('Effects volume').value,'50');
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.card-reveal.v1')),{enabled:true,volume:75});
 click('DONE');ui.cleanup();ui.render(React.createElement(App));click('SETTINGS');
 assert.equal(toggle().checked,true);assert.equal(ui.screen.getByLabelText('Card reveal volume').value,'75');
 click('TURN ALL OFF');assert.equal(toggle().checked,false);assert.equal(ui.screen.getByLabelText('Button sounds').checked,false);
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.card-reveal.v1')),{enabled:false,volume:75});
});
test('first-use card reveal settings inherit a deliberate old button-sound mute without touching its schema',()=>{
 localStorage.setItem('werewolf.settings',JSON.stringify({buttonSounds:false,haptics:false}));
 ui.render(React.createElement(App));click('SETTINGS');
 assert.equal(ui.screen.getByLabelText('Card reveal sounds').checked,false);
 ui.fireEvent.click(ui.screen.getByLabelText('Card reveal sounds'));
 assert.equal(ui.screen.getByLabelText('Button sounds').checked,false);
 assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.feedback.v1')),{ambienceVolume:45,effectsVolume:50,hapticIntensity:'gentle'});
});

test('reveal audio loading is explicit, no-sound fallback preserves turns, and loading completion never auto-reveals',async()=>{
 const oldContext=Object.getOwnPropertyDescriptor(window,'AudioContext'),oldFetch=globalThis.fetch;
 let resolveLoad,starts=0;const load=new Promise(resolve=>resolveLoad=resolve);
 class Context{
  constructor(){this.state='running';this.destination={};}
  decodeAudioData(){return Promise.resolve({duration:4});}
  resume(){return Promise.resolve();}suspend(){return Promise.resolve();}close(){return Promise.resolve();}
  createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){}};}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
 }
 Object.defineProperty(window,'AudioContext',{configurable:true,value:Context});globalThis.fetch=()=>load;
 try{
  localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:50}));
  startSetup(['A','B','C','D'],{buttonSounds:false,haptics:false},false);
  for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);click(/START GAME/);click('CONTINUE →');
  const reveal=ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/});assert.equal(reveal.disabled,true);assert.match(ui.screen.getByRole('status').textContent,/sounds are loading/);
  ui.fireEvent.click(reveal);assert.equal(document.querySelector('.action'),null);
  click('SHOW ROLE WITHOUT SOUND');assert.ok(document.querySelector('.action'));assert.equal(starts,0);
  await ui.act(async()=>{resolveLoad({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});for(let i=0;i<20;i++)await Promise.resolve();});
  assert.ok(document.querySelector('.action'));assert.equal(starts,0);click('SKIP');
  assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,false);assert.equal(ui.screen.queryByText(/sounds are loading/),null);
 }finally{ui.cleanup();globalThis.fetch=oldFetch;if(oldContext)Object.defineProperty(window,'AudioContext',oldContext);else delete window.AudioContext;}
});
test('unsupported reveal audio offers explicit no-sound progress instead of a silent accepted reveal',()=>{
 const oldContext=Object.getOwnPropertyDescriptor(window,'AudioContext');Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});
 try{
  startSetup(['A','B','C','D'],{},false);for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);click(/START GAME/);click('CONTINUE →');
  assert.match(ui.screen.getByRole('status').textContent,/cannot play reveal audio/);assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,true);
  click('SHOW ROLE WITHOUT SOUND');assert.ok(document.querySelector('.action'));
 }finally{ui.cleanup();if(oldContext)Object.defineProperty(window,'AudioContext',oldContext);else delete window.AudioContext;}
});
test('deliberate zero reveal volume never waits for loading or blocks a private turn',()=>{
 localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:0}));startSetup(['A','B','C','D'],{},false);
 for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);click(/START GAME/);click('CONTINUE →');
 assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,false);assert.equal(ui.screen.queryByRole('button',{name:'SHOW ROLE WITHOUT SOUND'}),null);click(/SHOW YOUR ROLE/);assert.ok(document.querySelector('.action'));
});

test('reveal sounds and loading prompts are Night 1 only; later turns stay usable and replay enables first-night audio again',()=>{
 const oldContext=Object.getOwnPropertyDescriptor(window,'AudioContext');Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});
 try{
  localStorage.setItem('werewolf.card-reveal.v1',JSON.stringify({enabled:true,volume:65}));startSetup(['A','B','C','D'],{buttonSounds:false,haptics:false},false);
  for(const role of ['Werewolf','Villager','Villager','Villager'])click('Add '+role);click(/START GAME/);click('CONTINUE →');
  let wolf;const villagers=[];
  for(let i=0;i<4;i++){
   const name=document.querySelector('.player-pass h2').textContent;
   assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,true);assert.match(ui.screen.getByRole('status').textContent,/cannot play reveal audio/);
   click('SHOW ROLE WITHOUT SOUND');if(document.querySelector('.action h2').textContent==='Werewolf')wolf=name;else villagers.push(name);click('SKIP');
  }
  click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<4;i++)click('SKIP VOTE');click('CONTINUE →');
  assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 2 STARTED'}));click('CONTINUE →');
  for(let i=0;i<4;i++){
   assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,false);assert.equal(document.querySelector('.reveal-sound-notice'),null);assert.equal(ui.screen.queryByRole('button',{name:'SHOW ROLE WITHOUT SOUND'}),null);
   click(/SHOW YOUR ROLE/);assert.equal(document.querySelector('.reveal-sound-notice'),null);
   if(document.querySelector('.action h2').textContent==='Werewolf'){ui.fireEvent.click(availableTargets().find(b=>b.querySelector('strong')?.textContent===villagers[0]));click('COMPLETE ACTION');}else click('SKIP');
  }
  assert.deepEqual(JSON.parse(localStorage.getItem('werewolf.card-reveal.v1')),{enabled:true,volume:65});click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<3;i++){if(document.querySelector('.voter-name').textContent===wolf)click('SKIP VOTE');else{ui.fireEvent.click(availableTargets().find(b=>b.querySelector('strong')?.textContent===wolf));click('VOTE');}}
  click('CONTINUE →');assert.ok(ui.screen.getByRole('heading',{name:'VILLAGE WINS'}));click('START AGAIN');assert.ok(ui.screen.getByRole('heading',{name:'NIGHT 1 STARTED'}));click('CONTINUE →');
  assert.equal(ui.screen.getByRole('button',{name:/SHOW YOUR ROLE/}).disabled,true);assert.ok(ui.screen.getByRole('button',{name:'SHOW ROLE WITHOUT SOUND'}));assert.match(ui.screen.getByRole('status').textContent,/cannot play reveal audio/);
 }finally{ui.cleanup();if(oldContext)Object.defineProperty(window,'AudioContext',oldContext);else delete window.AudioContext;}
});


test('original photo replacements migrate saved roster and library without changing other avatars',()=>{
 localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));
 localStorage.setItem('werewolf.avatars.v1',JSON.stringify({a:'./werewolf/avatars/player1.webp',b:'./werewolf/avatars/player2.webp',c:'./werewolf/avatars/player3.webp',d:'./werewolf/avatars/player4.webp'}));
 localStorage.setItem('werewolf.library.v1',JSON.stringify([{name:'A',avatar:'./werewolf/avatars/player1.webp'},{name:'Sam',avatar:'./werewolf/avatars/player9.webp'}]));
 ui.render(React.createElement(App));click(/START GAME/);
 assert.equal(ui.screen.getByRole('button',{name:'Edit A'}).querySelector('img').getAttribute('src'),'./werewolf/avatars/photo-01-20261106.png');
 assert.equal(ui.screen.getByRole('button',{name:'Edit D'}).querySelector('img').getAttribute('src'),'./werewolf/avatars/player4.webp');
 click('Edit A');click('SAVE PLAYER');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.avatars.v1')).a,'./werewolf/avatars/photo-01-20261106.png');
 assert.equal(JSON.parse(localStorage.getItem('werewolf.library.v1')).find(p=>p.name==='Sam').avatar,'./werewolf/avatars/photo-08-20261106.jpg');
});

test('recovered raw legacy portraits render the new original without changing the checkpoint map',async()=>{
 const {Avatar}=await vite.ssrLoadModule('/src/PlayerSetup.tsx');
 const fixture=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./fixtures/avatar-original-hashes.json',import.meta.url),'utf8'));
 for(const item of fixture.replacements){const avatars={alex:item.old};const rendered=ui.render(React.createElement(Avatar,{name:'Alex',avatars}));assert.equal(rendered.container.querySelector('img').getAttribute('src'),item.path);assert.equal(avatars.alex,item.old);rendered.unmount();}
});

test('Muter chooses another living player, announces their name, permits voting and expires next night',()=>{
 startSetup(['A','B','C','D','E','F'],{firstNightSafe:true,doctorRepeatProtect:true},false);
 for(const role of ['Werewolf','Muter','Doctor','Villager','Villager','Villager'])click('Add '+role);
 assert.equal(ui.screen.queryByRole('button',{name:'Add Muted'}),null);
 click(/START GAME/);click('CONTINUE →');let mutedName='',muterName='';
 for(let i=0;i<6;i++){
  const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Muter'){
   muterName=name;assert.match(document.querySelector('.description p').textContent,/Each night you can mute someone/);
   const self=[...document.querySelectorAll('.target')].find(b=>b.querySelector('strong').textContent===name);assert.ok(self.disabled);assert.equal(availableTargets().length,5);
   assert.ok(ui.screen.getByRole('button',{name:'MUTE PLAYER'}).disabled);const choice=availableTargets()[0];mutedName=choice.querySelector('strong').textContent;ui.fireEvent.click(choice);assert.equal(ui.screen.getByRole('button',{name:'MUTE PLAYER'}).disabled,false);click('MUTE PLAYER');
  }else if(role==='Doctor'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');
 }
 const report=ui.screen.getByRole('region',{name:'Muted players'});assert.match(report.textContent,new RegExp(`${mutedName} was muted\\.`));assert.doesNotMatch(report.textContent,new RegExp(`${muterName} was muted`));assert.ok(ui.screen.getByRole('heading',{name:'NO ONE DIED'}));
 click('CONTINUE →');assert.match(ui.screen.getByRole('region',{name:'Muted players'}).textContent,/They can still vote/);click('END DISCUSSION →');
 for(let i=0;i<6;i++){
  if(document.querySelector('.voter-name').textContent===mutedName){chooseTargets();assert.equal(ui.screen.getByRole('button',{name:'VOTE',exact:true}).disabled,false);click('VOTE');}else click('SKIP VOTE');
 }
 click('CONTINUE →');assert.equal(ui.screen.queryByRole('region',{name:'Muted players'}),null);click('CONTINUE →');
 for(let i=0;i<6;i++){click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;if(role==='Muter')click('SKIP MUTE');else if(role==='Doctor'||role==='Werewolf'){chooseTargets();click('COMPLETE ACTION');}else click('SKIP');}
 assert.equal(ui.screen.queryByRole('region',{name:'Muted players'}),null);assert.ok(ui.screen.getByRole('heading',{name:'NO ONE DIED'}));
});

for(const rng of [0,0.5])test(`Police blocks a Muter with order-independent simultaneous resolution (${rng})`,async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts'),names=['A','B','C','D'];startSetup(names,{firstNightSafe:true,policeNotifyBlocked:true},false);
 for(const role of ['Werewolf','Muter','Police','Villager'])click('Add '+role);Math.random=()=>rng;
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,muted:1,police:1,villager:1});const dealt=engine.deal(names,counts),muter=dealt.find(p=>p.role==='muted'),police=dealt.find(p=>p.role==='police'),target=dealt.find(p=>p.role==='villager');
 assert.equal(muter.id<police.id,rng===0);click(/START GAME/);click('CONTINUE →');
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  if(role==='Muter'||role==='Police'){const chosen=availableTargets().find(b=>b.querySelector('strong').textContent===(role==='Police'?muter.name:target.name));assert.ok(chosen);ui.fireEvent.click(chosen);click(role==='Muter'?'MUTE PLAYER':'COMPLETE ACTION');}else click('SKIP');
 }
 assert.equal(ui.screen.queryByRole('region',{name:'Muted players'}),null);assert.ok(ui.screen.getByText(`${muter.name}'s ability was blocked last night`));
});

test('Hypnotizer corruption cancels the next night Muter action without keeping yesterday silence',async()=>{
 const engine=await vite.ssrLoadModule('/src/werewolf-engine.ts'),names=['A','B','C','D','E'];startSetup(names,{firstNightSafe:true,hypnoMaxUses:1},false);
 for(const role of ['Werewolf','Hypnotizer Wolf','Muter','Villager','Villager'])click('Add '+role);
 const counts=Object.fromEntries(Object.keys(roles).map(r=>[r,0]));Object.assign(counts,{werewolf:1,hypnowolf:1,muted:1,villager:2});const dealt=engine.deal(names,counts),muter=dealt.find(p=>p.role==='muted'),wolf=dealt.find(p=>p.role==='werewolf'),villager=dealt.find(p=>p.role==='villager');
 const pick=name=>{const target=availableTargets().find(b=>b.querySelector('strong').textContent===name);assert.ok(target);ui.fireEvent.click(target);};
 click(/START GAME/);
 for(let night=1;night<=2;night++){
  click('CONTINUE →');
  for(let i=0;i<5;i++){
   click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
   if(role==='Muter'){pick(wolf.name);click('MUTE PLAYER');}
   else if(role==='Hypnotizer Wolf'&&night===1){pick(muter.name);click('HYPNOTIZE');}
   else if(role==='Werewolf'&&night===2){pick(villager.name);click('COMPLETE ACTION');}else click('SKIP');
  }
  if(night===1){assert.ok(ui.screen.getByText(wolf.name+' was muted.'));click('CONTINUE →');click('END DISCUSSION →');for(let i=0;i<5;i++)click('SKIP VOTE');click('CONTINUE →');}
  else assert.equal(ui.screen.queryByRole('region',{name:'Muted players'}),null);
 }
});

test('Muter descriptions, settings and 4-point badges agree across setup, rulebook and private play',()=>{
 ui.render(React.createElement(App));click('ROLE RULEBOOK');ui.fireEvent.change(ui.screen.getByPlaceholderText('Find a role'),{target:{value:'Muter'}});const entry=document.querySelector('[data-role="muted"]');assert.equal(entry.querySelector('h4').textContent,'Muter');assert.match(entry.textContent,/Each night you can mute someone/);assert.match(entry.textContent,/You may skip; repeats on later nights are allowed/);click('Close role rulebook');ui.cleanup();localStorage.clear();
 startSetup(['A','B','C','D'],{passiveWait:true,passiveWaitSeconds:15},false);for(const name of ['Werewolf','Muter','Villager','Villager'])click('Add '+name);
 const card=ui.screen.getByRole('button',{name:'View Muter details'});assert.match(card.getAttribute('aria-label')||card.textContent,/Muter/);click('View Muter details');assert.ok(ui.screen.getByRole('img',{name:'Power 4 out of 10, estimated for current settings'}));ui.fireEvent.click(ui.screen.getByText('ROLE SETTINGS'));assert.ok(ui.screen.getByText(/Muter is an active role/));assert.equal(ui.screen.queryByText('This role has no additional night ability to configure.'),null);click('Close role details');
 // Disable unrelated passive-player timers; individual/all-role wait behavior is covered separately.
 ui.fireEvent.click(ui.screen.getByRole('checkbox',{name:'Wait time for passive roles'}));click(/START GAME/);click('CONTINUE →');let seen=false;
 for(let i=0;i<4;i++){click(/SHOW YOUR ROLE/);const name=ui.screen.getByRole('heading',{level:2}).textContent;if(name==='Muter'){seen=true;assert.equal(document.querySelector('.role-power-game').textContent,'4');assert.match(document.querySelector('.description p').textContent,/You may skip/);click('SKIP MUTE');}else click('SKIP');}assert.ok(seen);
});


test('portrait target markers bound large packs while full names and distinct actions remain readable',async()=>{
 const {PackChoiceOverlay,PackChoices}=await vite.ssrLoadModule('/src/PackTargeting.tsx');
 const markers=Array.from({length:24},(_,i)=>({actor:{id:i,name:`Teammate ${i+1}`},action:['attack','hypnotize','infect'][i%3]}));
 const choices=markers.map(({actor,action})=>({actor:actor.name,number:actor.id+1,target:'A very long victim name',action}));
 ui.render(React.createElement('div',null,
  React.createElement('span',{className:'target-portrait'},React.createElement(PackChoiceOverlay,{target:'A very long victim name',markers,ownNumber:25})),
  React.createElement(PackChoices,{choices})));
 assert.equal(document.querySelector('.wolf-target-count').textContent,'24');
 assert.equal(document.querySelectorAll('.wolf-choice:not(.visually-hidden)').length,1,'only your own reticle is visible; teammates never stack under the photo');
 assert.equal(document.querySelectorAll('.wolf-choice.visually-hidden').length,24);
 assert.equal(document.querySelectorAll('.wolf-claw-marker').length,1);
 click('TEAM CHOICES');const dialog=ui.screen.getByRole('dialog',{name:'TEAM CHOICES'});
 assert.equal(dialog.querySelectorAll('li').length,24);assert.match(dialog.textContent,/Attack/);assert.match(dialog.textContent,/Hypnotize/);assert.match(dialog.textContent,/Infect/);
 assert.match(dialog.textContent,/Teammate 24/);assert.match(dialog.textContent,/A very long victim name/);
 click('Close team choices');assert.equal(ui.screen.queryByRole('dialog'),null);
});


for(const mode of ['all skip','elimination','last skip elimination'])test(`ballot sound requests only committed VOTE/SKIP with approved final priority: ${mode}`,async()=>{
 const {PhaseCueController}=await vite.ssrLoadModule('/src/phase-cue-controller.ts');let requests=0;const original=PhaseCueController.prototype.playBallot;
 PhaseCueController.prototype.playBallot=function(){requests++;return false;};
 try{
  const names=['A','B','C','D','E','F'];startSetup(names,{firstNightSafe:true,buttonSounds:true,haptics:false,passiveWait:false},false);click('Add Werewolf');for(let i=0;i<5;i++)click('Add Villager');click(/START GAME/);click('CONTINUE →');let wolf;
  for(let i=0;i<6;i++){const name=ui.screen.getByRole('heading',{level:2}).textContent;click(/SHOW YOUR ROLE/);if(ui.screen.getByRole('heading',{level:2}).textContent==='Werewolf')wolf=name;click('SKIP');}
  assert.equal(requests,0,'night SKIP is not a ballot');click('CONTINUE →');click('END DISCUSSION →');
  for(let i=0;i<6;i++){
   const voter=document.querySelector('.voter-name').textContent,before=requests;
   ui.fireEvent.click(ui.screen.getByRole('button',{name:'VOTE',exact:true}));assert.equal(requests,before,'disabled VOTE is silent');
   if(mode==='all skip'||voter===wolf||(mode==='last skip elimination'&&i===5))click('SKIP VOTE');
   else{pickNamed(wolf);assert.equal(requests,before,'choosing a target must not request ballot audio');click('VOTE');}
   assert.equal(requests,i===5&&mode!=='all skip'?5:i+1);
  }
  assert.equal(requests,mode==='all skip'?6:5);assert.ok(document.querySelector('.vote-verdict'));
  if(mode==='all skip')assert.ok(ui.screen.getByRole('heading',{name:'NO ONE WAS VOTED OUT'}));else assert.ok(ui.screen.getByRole('heading',{name:'THE VILLAGE HAS DECIDED!'}));
 }finally{PhaseCueController.prototype.playBallot=original;}
});

test('private selected targets use the actor marker, not target role, and disappear on deselect',()=>{
 startSetup(['A','B','C','D'],{firstNightSafe:true,buttonSounds:false,passiveWait:false},false);
 for(const role of ['Werewolf','Doctor','Seer','Villager'])click('Add '+role);click(/START GAME/);click('CONTINUE →');let tested=0;
 for(let i=0;i<4;i++){
  click(/SHOW YOUR ROLE/);const role=ui.screen.getByRole('heading',{level:2}).textContent;
  assert.equal(document.querySelectorAll('.role-target-marker').length,0);
  if(role==='Doctor'||role==='Seer'){
   const target=availableTargets()[0];ui.fireEvent.click(target);assert.equal(document.querySelectorAll('.role-target-marker').length,1);
   assert.equal(target.querySelector('.role-target-marker').dataset.markerRole,role.toLowerCase());
   assert.ok(target.querySelector('.target-portrait .role-target-marker'));ui.fireEvent.click(target);assert.equal(document.querySelectorAll('.role-target-marker').length,0);
   ui.fireEvent.click(target);click('COMPLETE ACTION');if(role==='Seer')click('OK · HIDE RESULT');tested++;
  }else click('SKIP');
 }
 assert.equal(tested,2);assert.equal(document.querySelectorAll('.role-target-marker').length,0);
 click('CONTINUE →');click('END DISCUSSION →');assert.equal(document.querySelectorAll('.role-target-marker').length,0);
});

test('DEAD and ESCAPED labels belong inside the square portrait, never below the name',async()=>{
 const {TargetPortrait}=await vite.ssrLoadModule('/src/TargetPortrait.tsx');
 for(const state of [{alive:false,escaped:false,label:'DEAD'},{alive:false,escaped:true,label:'ESCAPED'},{alive:true,escaped:false,label:null}]){
  ui.render(React.createElement('button',{className:'target'},React.createElement(TargetPortrait,{name:'A',avatars:{},alive:state.alive,escaped:state.escaped}),React.createElement('strong',null,'A')));
  assert.equal(document.querySelector('.target > small'),null);assert.equal(document.querySelector('.target-status')?.textContent??null,state.label);
  if(state.label)assert.equal(document.querySelector('.target-status').parentElement.className,'target-portrait');ui.cleanup();
 }
});
