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
  assert.ok(ui.screen.getByRole('heading',{name:'WEREWOLVES WIN'}));
  assert.ok(ui.within(ui.screen.getByRole('article',{name:'Alex: lost'})).getByText('LOST'));
  assert.ok(ui.within(ui.screen.getByRole('article',{name:'Blair: won'})).getByText('WON'));
  const escaped=ui.screen.getByRole('article',{name:'Casey: won'});
  assert.ok(ui.within(escaped).getByText('Escaped victorious'));
  assert.equal(escaped.querySelector('.is-dead'),null);
  assert.ok(ui.screen.getByText('Seer · Madman'));
});
test('night rankings are reversible, use supplied winners, and never change saved standings',()=>{
  const before=localStorage.getItem('werewolf.rankings.v1');
  ui.render(React.createElement(MatchResults,endProps));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'NIGHT RANKINGS'}));
  assert.equal(document.querySelector('.match-player-info strong').textContent,'Blair');
  assert.ok(ui.screen.getByRole('heading',{name:'NIGHT RANKINGS'}));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'PLAYER RESULTS'}));
  assert.equal(document.querySelector('.match-player-info strong').textContent,'Alex');
  assert.equal(localStorage.getItem('werewolf.rankings.v1'),before);
});
test('dead faction winners retain WON while showing eliminated status; menu and storage errors work',()=>{
  let returned=false;
  ui.render(React.createElement(MatchResults,{...endProps,winnerIds:[0,1],rankingError:true,onMenu:()=>{returned=true;}}));
  const row=ui.screen.getByRole('article',{name:'Alex: won'});
  assert.ok(row.querySelector('.is-dead'));
  assert.ok(ui.within(row).getByText('Eliminated'));
  assert.ok(ui.screen.getByRole('alert'));
  ui.fireEvent.click(ui.screen.getByRole('button',{name:'BACK TO MENU'}));
  assert.equal(returned,true);
});
