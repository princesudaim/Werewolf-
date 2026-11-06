import { before, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost/'});
globalThis.window=dom.window;
globalThis.document=dom.window.document;
globalThis.HTMLElement=dom.window.HTMLElement;
globalThis.localStorage=dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let vite, React, ui, VoteResult, MatchResults;
before(async()=>{
  vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
  ({VoteResult,MatchResults}=await vite.ssrLoadModule('/src/MatchResults.tsx'));
  React=await import('react');ui=await import('@testing-library/react');
});
afterEach(()=>ui.cleanup());
after(async()=>{await vite.close();dom.window.close();});
const victim={id:0,name:'Alex',role:'seer',alive:false};
const voteProps={victim,votes:4,revealRole:true,avatars:{},picture:role=>`./werewolf/${role}.webp`,announcement:'Alex was voted out — Seer.',onContinue:()=>{}};

test('verdict shows the voted player, revealed artwork, death badge and final weighted vote count',()=>{
  ui.render(React.createElement(VoteResult,voteProps));
  assert.ok(ui.screen.getByRole('heading',{name:'THE VILLAGE HAS DECIDED!'}));
  assert.ok(ui.screen.getByRole('heading',{name:'Alex — Seer'}));
  assert.ok(ui.screen.getByAltText('Seer role artwork'));
  assert.ok(ui.screen.getByText('DEAD'));
  assert.match(document.querySelector('.verdict-vote-count').textContent,/Received 4 votes/);
  assert.ok(ui.screen.getByRole('button',{name:'CONTINUE →'}));
});
test('hidden death roles do not leak into verdict text, image URLs or accessible descriptions',()=>{
  ui.render(React.createElement(VoteResult,{...voteProps,revealRole:false,announcement:'Alex was voted out.'}));
  assert.ok(ui.screen.getByRole('heading',{name:'Alex'}));
  assert.equal(ui.screen.queryByAltText(/role artwork/),null);
  assert.equal(document.querySelector('.verdict-role'),null);
  assert.doesNotMatch(document.body.innerHTML,/seer/i);
});
test('tied or skipped votes show no dead player or role card',()=>{
  ui.render(React.createElement(VoteResult,{...voteProps,victim:undefined,announcement:'No one was voted out. The vote was tied or more players chose to skip.'}));
  assert.ok(ui.screen.getByRole('heading',{name:'NO ONE WAS VOTED OUT'}));
  assert.equal(ui.screen.queryByText('WAS VOTED OUT'),null);
  assert.equal(document.querySelector('.outcome-portrait'),null);
});
const players=[victim,{id:1,name:'Blair',role:'werewolf',alive:true},{id:2,name:'Casey',role:'gambler',alive:false,escaped:true}];
const endProps={players,avatars:{},side:'wolf',title:'WEREWOLVES WIN',winnerIds:[1,2],madmen:[0],corrupted:[0],round:3,rankingError:false,onMenu:()=>{}};
test('end cards distinguish actual winners, eliminated players, escape and Madman disclosure',()=>{
  ui.render(React.createElement(MatchResults,endProps));
  assert.ok(ui.screen.getByRole('group',{name:'Match rankings'}));
  assert.ok(ui.screen.getByRole('heading',{name:'WEREWOLVES WIN'}));
  assert.ok(ui.within(ui.screen.getByRole('article',{name:'Alex: lost'})).getByText('LOST'));
  assert.ok(ui.within(ui.screen.getByRole('article',{name:'Blair: won'})).getByText('WON'));
  const escaped=ui.screen.getByRole('article',{name:'Casey: won'});
  assert.ok(ui.within(escaped).getByText('ESCAPED'));
  assert.equal(escaped.querySelector('.is-dead'),null);
  assert.ok(ui.screen.getByText('Seer · Madman'));
});
test('one ranked list highlights exactly one MVP and offers immediate replay without changing standings',()=>{
 const before=localStorage.getItem('werewolf.rankings.v1');let restarted=0;
 ui.render(React.createElement(MatchResults,{...endProps,onRestart:()=>restarted++}));
 assert.ok(ui.screen.getByRole('group',{name:'Match rankings'}));
 assert.equal(document.querySelectorAll('.is-mvp').length,1);
 assert.equal(document.querySelector('.match-player-info strong').textContent,'Blair');
 assert.equal(ui.screen.queryByRole('button',{name:'NIGHT RANKINGS'}),null);
 ui.fireEvent.click(ui.screen.getByRole('button',{name:'START AGAIN'}));assert.equal(restarted,1);
 assert.equal(localStorage.getItem('werewolf.rankings.v1'),before);
});
test('dead faction winners retain WON while showing eliminated status; menu and storage errors work',()=>{
  let returned=false;
  ui.render(React.createElement(MatchResults,{...endProps,winnerIds:[0,1],rankingError:true,onMenu:()=>{returned=true;}}));
  const row=ui.screen.getByRole('article',{name:'Alex: won'});
  assert.ok(row.querySelector('.is-dead'));
  assert.ok(ui.within(row).getByText('DEAD'));
  assert.ok(ui.screen.getByRole('alert'));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'BACK TO MENU'}));
  assert.equal(returned,true);
});

test('replay waits for standings and does not silently discard a ranking-storage failure',()=>{
 let restarted=0;const props={...endProps,onRestart:()=>restarted++};
 const view=ui.render(React.createElement(MatchResults,{...props,rankingError:true}));
 assert.equal(ui.screen.getByRole('button',{name:'START AGAIN'}).disabled,true);assert.ok(ui.screen.getByRole('alert'));
 view.rerender(React.createElement(MatchResults,{...props,restartDisabled:true}));assert.equal(ui.screen.getByRole('button',{name:'START AGAIN'}).disabled,true);
 view.rerender(React.createElement(MatchResults,props));ui.fireEvent.click(ui.screen.getByRole('button',{name:'START AGAIN'}));assert.equal(restarted,1);
});

test('compact cards keep identity, role, status, score and reason together without hiding details',()=>{
 ui.render(React.createElement(MatchResults,{...endProps,onRestart:()=>{}}));
 for(const player of players){
  const row=ui.screen.getByRole('article',{name:new RegExp('^'+player.name+':')});
  const card=row.querySelector('.match-player-card');
  assert.equal(card.querySelector('.match-player-info strong').textContent,player.name);
  assert.ok(card.querySelector('.match-player-meta .match-player-role').textContent);
  assert.ok(card.querySelector('.match-player-meta .match-player-state').textContent);
  assert.ok(card.querySelector('.match-player-score .outcome-badge').textContent);
  assert.match(card.querySelector('.match-player-score').textContent,/pts/);
  const reason=card.querySelector('.performance-reason');
  assert.equal(reason.parentElement,card,'reason can use the row width, not a narrow identity column');
  assert.ok(reason.textContent);
 }
 assert.equal(document.querySelectorAll('.is-mvp .mvp-label').length,1);
});

test('hidden verdict never repeats a role from an older stored announcement',()=>{
 ui.render(React.createElement(VoteResult,{...voteProps,revealRole:false,announcement:'Alex was voted out — Seer.'}));
 assert.ok(ui.screen.getByRole('heading',{name:'Alex'}));assert.doesNotMatch(document.querySelector('.vote-verdict').innerHTML,/seer/i);
 assert.equal(document.querySelector('.verdict-role'),null);
});


test('end rows show the adjusted dead score and penalty without penalizing escaped winners',()=>{
 ui.render(React.createElement(MatchResults,endProps));
 const dead=ui.screen.getByRole('article',{name:'Alex: lost'}),escaped=ui.screen.getByRole('article',{name:'Casey: won'});
 assert.match(dead.querySelector('.match-player-score').textContent,/-2 pts/);assert.match(dead.querySelector('.performance-reason').textContent,/Death −2 pts/);
 assert.match(escaped.querySelector('.match-player-score').textContent,/2 pts/);assert.doesNotMatch(escaped.textContent,/Death −2 pts/);
 assert.match(document.querySelector('.ranking-method').textContent,/Dead players lose 2 points/);
});
