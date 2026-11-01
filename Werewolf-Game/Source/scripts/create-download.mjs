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
for (const name of ['src','public','tests','scripts','.github','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','README.md','APK_INSPECTION.md','MADMAN_QA.md','ROLE_AUDIT.md','ROLE_POWER.md','TESTING.md','.gitignore']) {
  const path=resolve(root,name); if(!existsSync(path))continue;
  if(statSync(path).isDirectory())addTree(path,`Werewolf-Game/Source/${name}`);
  else zip.addFile(path,`Werewolf-Game/Source/${name}`,{compress:true});
}
zip.addBuffer(Buffer.from(`WEREWOLF GAME\n\nWebsite contains the finished game. Upload its contents to a web host, or run python3 -m http.server 8000 in that folder and open http://localhost:8000\n\nTo keep the menu download button working on a hosted copy, place the original Werewolf-Game.zip next to Website/index.html when uploading. The ZIP cannot contain a copy of itself.\n\nSource contains the editable source and tests. Install Node.js 22, run npm ci and npm run build. The new website and its download ZIP will be in dist.\n\nThe game works offline after its first visit on HTTPS or localhost. Downloading the ZIP from the menu requires a connection unless the browser already has it.\n`),'Werewolf-Game/START-HERE.txt');
const destination=resolve(output,'Werewolf-Game.zip');
const fileStream=createWriteStream(destination);
zip.outputStream.pipe(fileStream);
zip.end();
await once(fileStream,'finish');
console.log(`Created ${relative(root,destination)}`);
