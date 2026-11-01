/* Offline shell. The build replaces this revision whenever the app changes. */
const PREFIX = "nightfall-shell-";
const CACHE = PREFIX + "__BUILD_REVISION__";
const CORE = [
  "./", "index.html", "manifest.webmanifest", "icons/werewolf-512.png",
  "werewolf/home.png", "werewolf/night.png", "werewolf/day.png",
  "werewolf/madman.webp", "werewolf/werewolf.webp", "werewolf/villager.webp", "werewolf/doctor.webp", "werewolf/seer.webp", "werewolf/chef.webp", "werewolf/mayor.webp", "werewolf/templar.webp", "werewolf/muted.webp", "werewolf/jester.webp", "werewolf/necromancer.webp", "werewolf/bodyguard.webp", "werewolf/sheriff.webp", "werewolf/serialkiller.webp", "werewolf/visitor.webp", "werewolf/survivor.webp", "werewolf/psychic.webp", "werewolf/celebrity.webp", "werewolf/celebrity-new.webp", "werewolf/celebrity-spotlight.webp", "werewolf/celebrity-gala.webp", "werewolf/detective.webp", "werewolf/instigator.webp", "werewolf/strongwolf.webp", "werewolf/sickman.webp", "werewolf/lonewolf.webp", "werewolf/wolfpup.webp", "werewolf/journalist.webp", "werewolf/raven.webp", "werewolf/rabidwolf.webp", "werewolf/whitewolf.webp", "werewolf/gambler.webp", "werewolf/mindflayer.webp", "werewolf/intelligence.webp", "werewolf/thief.webp", "werewolf/police.webp", "werewolf/hypnowolf.webp", "werewolf/charmer.webp", "werewolf/charmer-new.webp", "werewolf/charmer-moonlight.webp", "werewolf/charmer-starlight.webp", "werewolf/charmer-sapphire.webp", "werewolf/charmer-sunrise.webp",
  "werewolf/barlow.ttf", "werewolf/condensed.ttf",
  "werewolf/audio/night.mp3", "werewolf/audio/day.mp3", "werewolf/audio/vote.mp3", "werewolf/audio/tap.wav",
  "werewolf/avatars/player1.webp",
  "werewolf/avatars/player2.webp",
  "werewolf/avatars/player3.webp",
  "werewolf/avatars/player4.webp",
  "werewolf/avatars/player5.webp",
  "werewolf/avatars/player7.webp",
  "werewolf/avatars/player8.webp",
  "werewolf/avatars/player9.webp",
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

];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    // Remove the old unversioned cache used by previous releases of this game.
    await caches.delete("nightfall-v2");
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("./index.html")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
