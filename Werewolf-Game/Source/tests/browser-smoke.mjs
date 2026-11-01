// Optional real-browser smoke test. Start a production preview, then set CHROMIUM_PATH.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const executablePath=process.env.CHROMIUM_PATH;
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a locally installed Chromium executable.');
const base=process.env.BASE_URL || 'http://127.0.0.1:5180/';
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const context=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});
  const page=await context.newPage(), errors=[];
  await page.addInitScript(() => {
    window.__playedAudio=[];
    const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){ window.__playedAudio.push(this.src);return original.call(this); };
  });
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.evaluate(()=>{localStorage.setItem('werewolf.names',JSON.stringify(['A','B','C','D']));localStorage.setItem('werewolf.avatars.v1',JSON.stringify({a:'./werewolf/avatars/player20.webp',b:'./werewolf/avatars/player23.webp'}));localStorage.setItem('werewolf.settings',JSON.stringify({sounds:false,buttonSounds:false}));});
  await page.reload({waitUntil:'load'});
  assert.match(await page.locator('main.app').evaluate(element=>getComputedStyle(element).backgroundImage),/werewolf\/home\.png/);
  await page.getByRole('button',{name:'HOW TO PLAY'}).click();
  assert.ok(await page.getByRole('heading',{name:'THE RULEBOOK'}).isVisible());
  await page.getByRole('button',{name:'GOT IT'}).click();
  await page.getByRole('button',{name:/START GAME/}).click();
  // Portrait aspect ratios must not change the square roster size or card height.
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:700});
    const a=page.getByRole('button',{name:'Edit A'}), b=page.getByRole('button',{name:'Edit B'});
    await b.locator('img').waitFor({state:'visible'});
    assert.equal(await b.locator('img').getAttribute('src'),'./werewolf/avatars/player23.webp');
    const first=await a.locator('.roster-avatar').boundingBox(), second=await b.locator('.roster-avatar').boundingBox();
    const cardA=await a.boundingBox(), cardB=await b.boundingBox();
    assert.ok(first && second && cardA && cardB);
    assert.ok(Math.abs(first.width-first.height)<2 && Math.abs(second.width-second.height)<2,'roster portraits must stay square');
    assert.ok(Math.abs(cardA.height-cardB.height)<2,'all roster cards must have the same height');
  }
  // The last roster control must remain reachable above the fixed footer on short phones.
  for (const [width,height] of [[320,500],[390,700]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    const button=await page.getByRole('button',{name:'RANDOM',exact:true}).boundingBox();
    const footer=await page.locator('.setup-bottom').boundingBox();
    assert.ok(button && footer && button.y>=0 && button.y+button.height<=footer.y, 'Random button must be visible and tappable above the fixed footer');
  }
  await page.setViewportSize({width:390,height:700});
  await page.evaluate(()=>window.scrollTo(0,0));
  // Exercise the actual mobile bottom sheets and preserve unique avatar ownership.
  await page.getByRole('button',{name:'Edit A'}).click();
  await page.getByRole('button',{name:'Choose or change game avatar'}).click();
  assert.ok(await page.getByRole('dialog',{name:'Choose photo or avatar'}).isVisible());
  await page.getByRole('button',{name:/Game avatars/}).click();
  assert.ok(await page.getByRole('dialog',{name:'Game avatars'}).isVisible());
  await page.getByRole('button',{name:'Choose avatar 1',exact:true}).click();
  await page.getByRole('button',{name:'SAVE PLAYER'}).click();
  await page.getByRole('button',{name:'Edit B'}).click();
  await page.getByRole('button',{name:'Choose or change game avatar'}).click();
  await page.getByRole('button',{name:/Game avatars/}).click();
  await page.getByRole('button',{name:'Choose avatar 1',exact:true}).click();
  await page.getByRole('button',{name:'SAVE PLAYER'}).click();
  const avatars=await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.avatars.v1')));
  assert.notEqual(avatars.a,avatars.b,'used avatar must be transferred, not duplicated');
  assert.ok(avatars.a && avatars.b.endsWith('/player1.webp'));
  await page.getByRole('button',{name:'Edit A'}).click();
  await page.getByRole('button',{name:'Choose or change game avatar'}).click();
  // The native gallery is controlled by the OS; supply an image through its file input.
  await page.locator('dialog input[type=file]:not([capture])').setInputFiles('public/icons/werewolf-512.png');
  await page.waitForFunction(()=>document.querySelector('.avatar-preview img')?.getAttribute('src')?.startsWith('data:image/'));
  await page.getByRole('button',{name:'SAVE PLAYER'}).click();
  assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('werewolf.avatars.v1')).a)).startsWith('data:image/'));
  await page.getByRole('button',{name:'Delete players'}).click();
  assert.ok(await page.getByText('DELETE MODE').isVisible());
  await page.getByRole('button',{name:'Exit delete mode'}).click();
  await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  assert.equal(await page.evaluate(()=>window.scrollY),0,'new screen should start at the top');
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:700});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'phone layout must not overflow horizontally');
    const control=await page.locator('.stepper button').first().boundingBox();
    assert.ok(control && control.width>=44 && control.height>=44,'role controls must be at least 44px');
  }
  const bar=page.locator('.role-start-bar'), initial=await bar.boundingBox();
  assert.ok(initial && initial.y+initial.height<=701,'start bar must be visible');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(100);
  const scrolled=await bar.boundingBox();
  assert.ok(scrolled && Math.abs(initial.y-scrolled.y)<1,'start bar must remain fixed while scrolling');
  await page.getByRole('button',{name:'View White Werewolf details'}).click();
  assert.equal(await page.locator('dialog[open]').count(),1);
  await page.getByText('ROLE SETTINGS',{exact:true}).click();
  const chance=page.getByRole('slider',{name:'White Werewolf random role chance'});
  await chance.scrollIntoViewIfNeeded();
  const chanceBox=await chance.boundingBox();assert.ok(chanceBox && chanceBox.height>=44,'chance slider needs a phone-sized touch target');
  const cdp=await context.newCDPSession(page), y=chanceBox.y+chanceBox.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:chanceBox.x+chanceBox.width-5,y}]});
  for(const fraction of [0.8,0.6,0.4,0.2]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:chanceBox.x+chanceBox.width*fraction,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Number(await chance.inputValue())<50,'touch drag should change the slider value');
  assert.ok(await page.getByRole('heading',{name:'WHITE WEREWOLF'}).isVisible(),'dragging the slider must not swipe roles');
  await cdp.detach();
  await page.getByRole('button',{name:'Close role details'}).click();
  for(const role of ['Werewolf','Doctor','Seer','Villager']) await page.getByRole('button',{name:'Add '+role}).click();
  await page.getByRole('button',{name:/START GAME/}).click();
  assert.ok(await page.getByRole('heading',{name:'NIGHT 1 STARTED'}).isVisible());
  assert.equal(await page.evaluate(()=>window.scrollY),0,'new night screen should start at the top');
  await context.setOffline(true);
  await page.reload({waitUntil:'load'});
  assert.ok(await page.getByRole('heading',{name:'WEREWOLF'}).isVisible());
  await page.getByRole('button',{name:/START GAME/}).click();
  await page.getByRole('button',{name:/CHOOSE ROLES/}).click();
  const art=page.locator('.role-choice img').first();
  await art.waitFor();
  assert.equal(await art.evaluate(image=>image.complete && image.naturalWidth>0),true,'role art should load offline');
  for(const role of ['Werewolf','News Maker','Villager','Villager']) await page.getByRole('button',{name:'Add '+role}).click();
  await page.getByRole('button',{name:/START GAME/}).click();
  await page.getByRole('button',{name:'Enable game sounds'}).click();
  assert.ok(await page.evaluate(()=>window.__playedAudio.some(src=>src.endsWith('/night.mp3'))));
  await page.getByRole('button',{name:'CONTINUE →'}).click();
  for(let i=0;i<4;i++) {
    await page.getByRole('button',{name:/SHOW YOUR ROLE/}).click();
    const role=await page.locator('.action h2').innerText();
    if(role==='News Maker') {
      await page.getByPlaceholder('Write a headline').fill('Night news');
      const canvas=page.locator('canvas.drawing-canvas');await canvas.scrollIntoViewIfNeeded();
      const rect=await canvas.boundingBox();assert.ok(rect);
      await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
      await page.getByRole('button',{name:'PUBLISH IN THE MORNING'}).click();
    } else await page.getByRole('button',{name:'SKIP',exact:true}).click();
  }
  assert.ok(await page.getByText('Night news').isVisible());
  assert.ok(await page.evaluate(()=>window.__playedAudio.some(src=>src.endsWith('/day.mp3'))));
  assert.equal(await page.locator('.newspaper img').count(),1,'touch drawing should appear in the newspaper');
  await page.getByRole('button',{name:'CONTINUE →'}).focus();
  await page.keyboard.down('Enter'); await page.waitForTimeout(2100); await page.keyboard.up('Enter');
  await page.getByRole('button',{name:'END DISCUSSION →'}).click();
  assert.ok(await page.getByRole('heading',{name:/who are you voting for/}).isVisible());
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:700});
    const dimensions=await page.locator('.vote-page .target').evaluateAll(cards=>cards.map(card=>({w:card.getBoundingClientRect().width,h:card.getBoundingClientRect().height,avatar:card.querySelector('.target-avatar').getBoundingClientRect().toJSON()})));
    assert.ok(dimensions.length>1);
    assert.ok(dimensions.every(c=>Math.abs(c.w-dimensions[0].w)<2 && Math.abs(c.h-dimensions[0].h)<2),'voting cards must have equal dimensions');
    assert.ok(dimensions.every(c=>Math.abs(c.avatar.width-c.avatar.height)<2),'voting avatars must stay square');
  }

  assert.equal(await page.evaluate(()=>window.__playedAudio.some(src=>src.endsWith('/vote.mp3'))),false);
  await page.getByRole('button',{name:'Mute game sounds'}).click();
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.getByRole('button',{name:'SKIP VOTE'}).click();
  assert.equal(await page.evaluate(()=>window.scrollY),0,'the next voter should start at the top');
  assert.deepEqual(errors,[]);
  console.log('Browser smoke passed: fixed bar, role details, offline game, touch drawing and direct voting.');
} finally { await browser.close(); }
