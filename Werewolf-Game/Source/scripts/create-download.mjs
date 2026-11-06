// Create the downloadable game package from the *current* build and source.
// Never include node_modules, Git metadata, environment files, or the ZIP itself.
import { createWriteStream, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { once } from 'node:events';
import yazl from 'yazl';

const root=process.cwd();
const output=resolve(root,'dist');
const zip=new yazl.ZipFile();
const media=/\.(?:webp|png|jpe?g|mp3|wav|woff2?|ttf|zip)$/i;
function addTree(directory, prefix) {
  for (const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const full=join(directory,entry.name), name=`${prefix}/${entry.name}`;
    if(entry.isDirectory()) addTree(full,name);
    else if(entry.isFile()) zip.addFile(full,name,{compress:!media.test(entry.name)});
  }
}
for (const entry of readdirSync(output,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
  const full=join(output,entry.name);
  if(entry.name==='Werewolf-Game.zip') continue;
  if(entry.isDirectory())addTree(full,`Werewolf-Game/Website/${entry.name}`);
  else if(entry.isFile())zip.addFile(full,`Werewolf-Game/Website/${entry.name}`,{compress:!media.test(entry.name)});
}
// Explicit allowlist avoids accidentally putting local secrets in the download.
for (const name of ['src','public','tests','scripts','.github','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','README.md','APK_INSPECTION.md','MADMAN_QA.md','ROLE_AUDIT.md','ROLE_POWER.md','MVP_RANKINGS.md','AUDIO_DESIGN.md','TESTING.md','.gitignore']) {
  const path=resolve(root,name); if(!existsSync(path))continue;
  if(statSync(path).isDirectory())addTree(path,`Werewolf-Game/Source/${name}`);
  else zip.addFile(path,`Werewolf-Game/Source/${name}`,{compress:true});
}
zip.addBuffer(Buffer.from(`WEREWOLF GAME\n\nWebsite contains the finished game. Upload its contents to a web host, or run python3 -m http.server 8000 in that folder and open http://localhost:8000\n\nWebsite is the ready-to-host game; Source contains the editable code and tests. No Download Game button is shown. The ZIP cannot contain a copy of itself.\n\nSource contains the editable source and tests. Install Node.js 22, run npm ci and npm run build. The new website and its download ZIP will be in dist.\n\nFor offline play use HTTPS or localhost. Read OFFLINE & UPDATES at the menu: wait for the first download, then close/reopen before relying on offline play. Never refresh an active match to prepare offline use. Updates wait until all old game tabs and installed-app windows close. CHECK OFFLINE FILES checks entry presence only; it does not repair, erase, validate file content, or save a match. Supported current workers offer a separate DOWNLOAD MISSING FILES action: deliberate missing-only repair, with exact-build checksum/size verification and no private-storage access. A missing cached game page can show a neutral repair screen; opening the game is explicit. Present-but-damaged cache entries are not scanned. A newer-only host may require the native update/close-all-tabs path instead. Recovery is separate per-match opt-in: 24-hour local plaintext private state, not cloud sync or encryption. Opening the HTML file directly can run the game, but recovery and offline caching require supported HTTP(S) browser APIs.\n`),'Werewolf-Game/START-HERE.txt');
const destination=resolve(output,'Werewolf-Game.zip');
const fileStream=createWriteStream(destination);
zip.outputStream.pipe(fileStream);
zip.end();
await once(fileStream,'finish');
console.log(`Created ${relative(root,destination)}`);
