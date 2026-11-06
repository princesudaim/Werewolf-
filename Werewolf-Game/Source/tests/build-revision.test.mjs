import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'vite';
import {createHash} from 'node:crypto';

test('production revision changes for worker-only edits without changing HTML',async()=>{
 const parent=resolve('.cache');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'worker-revision-'));
 try{
  await mkdir(join(root,'src'));await mkdir(join(root,'public'));await mkdir(join(root,'scripts'));await copyFile('scripts/offline-repair-page.html',join(root,'scripts/offline-repair-page.html'));
  await copyFile(process.env.REVISION_CONFIG||'vite.config.ts',join(root,'vite.config.ts'));
  await writeFile(join(root,'package.json'),'{"type":"module"}');
  await writeFile(join(root,'index.html'),'<!doctype html><html><head><title>Fixture</title></head><body><script type="module" src="./src/main.ts"></script></body></html>');
  await writeFile(join(root,'src/main.ts'),"document.body.dataset.fixture='same';");
  const template=(await readFile('public/sw.js','utf8')).replace(/const CORE = \[[\s\S]*?\];/,'const CORE = ["./","index.html"];');
  const run=async worker=>{await writeFile(join(root,'public/sw.js'),worker);await build({root,configFile:join(root,'vite.config.ts'),logLevel:'silent'});const html=await readFile(join(root,'dist/index.html'),'utf8'),sw=await readFile(join(root,'dist/sw.js'),'utf8'),revision=sw.match(/const CACHE = PREFIX \+ "([^"]+)";/)[1];assert.match(revision,/^[a-f0-9]{12}$/);assert.ok(!sw.includes('__BUILD_REVISION__'));assert.ok(!sw.includes('__CORE_DIGESTS__'));const manifest=JSON.parse(sw.match(/const DIGESTS = (\{.*\});/)[1]);assert.equal(JSON.parse(sw.match(/const REPAIR_PAGE = (".*");/)[1]),await readFile(join(root,'scripts/offline-repair-page.html'),'utf8'));const digest=createHash('sha256').update(html).digest('hex');assert.equal(manifest['index.html'].sha256,digest);assert.equal(manifest['./'].size,Buffer.byteLength(html));return{html,revision};};
  const one=await run(template),two=await run(template+'\n// Policy revision.\n'),again=await run(template+'\n// Policy revision.\n');
  assert.equal(one.html,two.html);assert.notEqual(one.revision,two.revision);assert.equal(two.revision,again.revision);assert.equal(two.html,again.html);await writeFile(join(root,'scripts/offline-repair-page.html'),'<!doctype html><title>Changed neutral repair page</title><p>$& $` dollar markers</p>');const pageChanged=await run(template+'\n// Policy revision.\n');assert.equal(pageChanged.html,again.html);assert.notEqual(pageChanged.revision,again.revision);
  const config=join(root,'vite.config.ts');await writeFile(config,(await readFile(config,'utf8')).replace('64 * 1024 * 1024','1'));await assert.rejects(()=>build({root,configFile:config,logLevel:'silent'}),/Offline CORE exceeds the verified staging budget/);
 }finally{await rm(root,{recursive:true,force:true});}
});
