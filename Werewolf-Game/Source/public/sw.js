/* Offline shell. The build replaces this revision whenever the app changes. */
// CacheStorage is origin-wide: separate root, Pages and sibling installations.
// The raw colon cannot occur inside encodeURIComponent output, including hyphen-led subpaths.
const PREFIX = "nightfall-shell-" + encodeURIComponent(new URL(self.registration.scope).pathname) + ":";
const CACHE = PREFIX + "__BUILD_REVISION__";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/werewolf-512.png",
  "werewolf/home.png",
  "werewolf/night.png",
  "werewolf/day.png",
  "werewolf/madman.webp",
  "werewolf/werewolf.webp",
  "werewolf/villager.webp",
  "werewolf/doctor.webp",
  "werewolf/seer.webp",
  "werewolf/chef.webp",
  "werewolf/mayor.webp",
  "werewolf/templar.webp",
  "werewolf/muted.webp",
  "werewolf/jester.webp",
  "werewolf/necromancer.webp",
  "werewolf/bodyguard.webp",
  "werewolf/sheriff.webp",
  "werewolf/serialkiller.webp",
  "werewolf/visitor.webp",
  "werewolf/survivor.webp",
  "werewolf/psychic.webp",
  "werewolf/celebrity.webp",
  "werewolf/celebrity-new.webp",
  "werewolf/celebrity-spotlight.webp",
  "werewolf/celebrity-gala.webp",
  "werewolf/detective.webp",
  "werewolf/instigator.webp",
  "werewolf/strongwolf.webp",
  "werewolf/sickman.webp",
  "werewolf/lonewolf.webp",
  "werewolf/wolfpup.webp",
  "werewolf/journalist.webp",
  "werewolf/raven.webp",
  "werewolf/rabidwolf.webp",
  "werewolf/whitewolf.webp",
  "werewolf/gambler.webp",
  "werewolf/mindflayer.webp",
  "werewolf/intelligence.webp",
  "werewolf/thief.webp",
  "werewolf/police.webp",
  "werewolf/hypnowolf.webp",
  "werewolf/charmer.webp",
  "werewolf/charmer-new.webp",
  "werewolf/charmer-moonlight.webp",
  "werewolf/charmer-starlight.webp",
  "werewolf/charmer-sapphire.webp",
  "werewolf/charmer-sunrise.webp",
  "werewolf/barlow.ttf",
  "werewolf/condensed.ttf",
  "werewolf/avatars/photo-01-20261106.png",
  "werewolf/avatars/photo-02-20261106.png",
  "werewolf/avatars/photo-03-20261106.jpg",
  "werewolf/avatars/player4.webp",
  "werewolf/avatars/photo-05-20261106.jpg",
  "werewolf/avatars/photo-06-20261106.png",
  "werewolf/avatars/photo-07-20261106.png",
  "werewolf/avatars/photo-08-20261106.jpg",
  "werewolf/avatars/player11.webp",
  "werewolf/avatars/player13.webp",
  "werewolf/avatars/player15.webp",
  "werewolf/avatars/player16.webp",
  "werewolf/avatars/player17.webp",
  "werewolf/avatars/player18.webp",
  "werewolf/avatars/player19.webp",
  "werewolf/avatars/player20.webp",
  "werewolf/avatars/player21.webp",
  "werewolf/avatars/player23.webp",
  "werewolf/avatars/player24.webp",
  "werewolf/audio/v3/cues-tap.wav",
  "werewolf/audio/v3/cues-confirm.wav",
  "werewolf/audio/v3/cues-invalid.wav",
  "werewolf/audio/v3/cues-select.wav",
  "werewolf/audio/v3/cues-add.wav",
  "werewolf/audio/v3/cues-remove.wav",
  "werewolf/audio/v3/cues-randomize.wav",
  "werewolf/audio/v3/cues-navigate.wav",
  "werewolf/audio/v3/cues-start.wav",
  "werewolf/audio/v3/cues-handoff.wav",
  "werewolf/audio/v3/cues-reveal.wav",
  "werewolf/audio/v3/cues-discussion.wav",
  "werewolf/audio/v3/cues-warning.wav",
  "werewolf/audio/v3/cues-time-up.wav",
  "werewolf/audio/v3/cues-vote-open.wav",
  "werewolf/audio/v3/cues-elimination.wav",
  "werewolf/audio/v3/cues-divided.wav",
  "werewolf/audio/v3/cues-mvp.wav",
  "werewolf/audio/v3/cues-win-wolf.wav",
  "werewolf/audio/v3/cues-win-village.wav",
  "werewolf/audio/v3/cues-win-jester.wav",
  "werewolf/audio/v3/cues-win-serialkiller.wav",
  "werewolf/audio/v3/cues-win-raven.wav",
  "werewolf/audio/v3/cues-win-whitewolf.wav",
  "werewolf/audio/v3/cues-win-mindflayer.wav",
  "werewolf/audio/v3/cues-win-friends.wav",
  "werewolf/audio/v3/cues-win-wolf-friends.wav",
  "werewolf/audio/v3/cues-win-draw.wav",
  "werewolf/audio/card-reveal/v3/reveal-01.wav",
  "werewolf/audio/card-reveal/v3/reveal-02.wav",
  "werewolf/audio/card-reveal/v3/reveal-03.wav",
  "werewolf/audio/card-reveal/v3/reveal-04.wav",
  "werewolf/audio/card-reveal/v3/reveal-05.wav",
  "werewolf/audio/card-reveal/v3/reveal-06.wav",
  "werewolf/audio/card-reveal/v3/reveal-07.wav",
  "werewolf/audio/card-reveal/v3/reveal-08.wav",
  "werewolf/audio/card-reveal/v3/reveal-09.wav",
  "werewolf/audio/card-reveal/v3/reveal-10.wav",
  "werewolf/audio/card-reveal/v3/reveal-11.wav",
  "werewolf/audio/card-reveal/v3/reveal-12.wav",
  "werewolf/audio/card-reveal/v3/reveal-13.wav",
  "werewolf/audio/card-reveal/v3/reveal-14.wav",
  "werewolf/audio/phase/v1/night-start.wav",
  "werewolf/audio/phase/v1/meeting-start.wav",
  "werewolf/audio/voted-out/v2/voted-out-01.wav",
  "werewolf/audio/voted-out/v2/voted-out-02.wav",
  "werewolf/audio/voted-out/v2/voted-out-03.wav",
  "werewolf/audio/voted-out/v2/voted-out-04.wav",
  "werewolf/audio/voted-out/v2/voted-out-05.wav",
  "werewolf/audio/voted-out/v2/voted-out-06.wav",
  "werewolf/audio/voted-out/v2/voted-out-07.wav",
  "werewolf/audio/voted-out/v2/voted-out-08.wav",
  "werewolf/audio/game-end/v1/game-end-01.wav",
  "werewolf/audio/game-end/v1/game-end-02.wav",
  "werewolf/audio/game-end/v1/game-end-03.wav",
  "werewolf/audio/game-end/v1/game-end-04.wav",
  "werewolf/audio/game-end/v1/game-end-05.wav",
  "werewolf/audio/morning-death/v1/morning-death-01.wav",
  "werewolf/audio/morning-death/v1/morning-death-02.wav",
  "werewolf/audio/morning-death/v1/morning-death-03.wav",
  "werewolf/audio/ballot/v1/ballot-enderman.wav",
  "werewolf/audio/ballot/v1/ballot-notifi.wav",
  "werewolf/audio/ballot/v1/ballot-enemy.wav",
  "werewolf/audio/buttons/v1/button-tap.wav",
  "werewolf/audio/buttons/v1/button-confirm.wav",
  "werewolf/audio/buttons/v1/button-invalid.wav",
  "werewolf/audio/buttons/v1/button-select.wav",
  "werewolf/audio/buttons/v1/button-add.wav",
  "werewolf/audio/buttons/v1/button-remove.wav",
  "werewolf/audio/buttons/v1/button-randomize.wav",
  "werewolf/audio/buttons/v1/button-navigate.wav"
];

// Immutable build metadata; the build fills both placeholders.
const DIGESTS = "__CORE_DIGESTS__";
const REPAIR_PAGE = "__REPAIR_PAGE__";
const ENTRY = new URL("index.html", self.registration.scope).href;
const ROOT = new URL(self.registration.scope).pathname;
const KNOWN = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
const STATUS = "werewolf:offline-status:v1";
const REPAIR = "werewolf:offline-repair:v1";
let repairJob = null;
function manifestReady() {
  return typeof DIGESTS === "object" && DIGESTS !== null &&
    CORE.every(path => /^[a-f0-9]{64}$/.test(DIGESTS[path]?.sha256) && Number.isSafeInteger(DIGESTS[path].size) && DIGESTS[path].size >= 0) &&
    CORE.reduce((sum,path) => sum + DIGESTS[path].size, 0) <= 64 * 1024 * 1024;
}
async function complete() {
  if (!(await caches.keys()).includes(CACHE)) return false;
  const urls = new Set((await (await caches.open(CACHE)).keys()).map(request => request.url));
  return [...KNOWN].every(url => urls.has(url));
}
function failure(reason) { return Object.assign(new Error(reason), {reason}); }
async function verify(response, expected, signal) {
  if (!response.ok || response.type === "opaque") throw failure("network");
  const reader = response.clone().body?.getReader();
  const bytes = new Uint8Array(expected.size);
  let length = 0;
  if (reader) {
    try {
      for (;;) {
        if (signal.aborted) throw failure("network");
        const {done,value} = await reader.read();
        if (done) break;
        if (length + value.length > expected.size) { void reader.cancel().catch(() => {}); throw failure("version"); }
        bytes.set(value,length); length += value.length;
      }
    } finally { reader.releaseLock(); }
  }
  if (length !== expected.size) throw failure("version");
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(value => value.toString(16).padStart(2,"0")).join("");
  if (hash !== expected.sha256) throw failure("version");
}
// Stage verified responses before touching cached contents. Never substitute newer bytes.
async function fill(paths) {
  if (!manifestReady()) throw failure("unsupported");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),120000);
  const staged = [];
  let restored = 0;
  try {
    const cache = await caches.open(CACHE);
    for (const path of paths) {
      const expected = DIGESTS[path];
      let response;
      // The root/index duplicate can sometimes recover a missing shell even offline.
      for (const other of CORE) {
        if (other !== path && DIGESTS[other].sha256 === expected.sha256 && DIGESTS[other].size === expected.size) {
          const candidate = await cache.match(new URL(other,self.registration.scope).href);
          if (candidate) {
            try { await verify(candidate,expected,controller.signal); response = candidate; break; }
            catch { /* An invalid local duplicate is not trusted. */ }
          }
        }
      }
      if (!response) {
        response = await fetch(new Request(new URL(path,self.registration.scope).href,{cache:"no-store",credentials:"same-origin",redirect:"error",signal:controller.signal}));
        await verify(response,expected,controller.signal);
      }
      staged.push([new URL(path,self.registration.scope).href,response]);
    }
    for (const [url,response] of staged) {
      try { await cache.put(url,response); restored++; }
      catch { throw failure("write"); }
    }
    return {ok:true,complete:await complete(),restored};
  } catch (error) {
    throw Object.assign(error,{restored});
  } finally { clearTimeout(timer); controller.abort(); }
}
async function repairMissing() {
  try {
    if (!manifestReady()) throw failure("unsupported");
    const cache = await caches.open(CACHE), missing = [];
    for (const path of CORE) if (!await cache.match(new URL(path,self.registration.scope).href)) missing.push(path);
    return await fill(missing);
  } catch (error) { return {ok:false,reason:error.reason || "network",restored:error.restored || 0,complete:false}; }
}
self.addEventListener("install", event => {
  // A partially published host must never become an active mixed build.
  event.waitUntil(fill(CORE));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    // No skipWaiting, claim, reload or unknown-owner cache deletion.
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    if (url.pathname !== ROOT && url.pathname !== new URL(ENTRY).pathname) return;
    event.respondWith(caches.open(CACHE).then(cache => cache.match(ENTRY)).then(cached => cached || new Response(REPAIR_PAGE,{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; worker-src 'self'; connect-src 'self'"}})));
    return;
  }
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || (KNOWN.has(url.href) ? Response.error() : fetch(request))));
});
self.addEventListener("message", event => {
  const type = event.data?.type, port = event.ports?.[0];
  if (!port || (type !== STATUS && type !== REPAIR)) return;
  event.waitUntil((async () => {
    let result;
    if (type === REPAIR) {
      if (!repairJob) repairJob = repairMissing().finally(() => { repairJob = null; });
      result = await repairJob;
    } else {
      try { result = {complete:await complete(),canRepair:manifestReady(),repairing:!!repairJob}; }
      catch { result = {unavailable:true,canRepair:false}; }
    }
    try { port.postMessage({type,...result}); } catch { /* Caller may have closed its page/port. */ }
  })());
});
