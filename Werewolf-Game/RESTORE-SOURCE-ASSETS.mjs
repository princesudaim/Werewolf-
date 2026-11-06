// Self-contained, byte-preserving restore of deduplicated source assets.
// Run after extracting the FULL backup, before building Source. Node.js 22+.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url);
const entries=JSON.parse(await readFile(new URL('SHARED-SOURCE-ASSETS.json',root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const verified=[];
for(const item of entries){
 if(!item.source.startsWith('Website/')||!item.destination.startsWith('Source/public/')||[item.source,item.destination].some(p=>p.includes('..')||p.includes('\\')))throw Error('Unsafe asset path');
 const bytes=await readFile(new URL(item.source,root));
 if(bytes.length!==item.size||sha(bytes)!==item.sha256)throw Error('Backup asset damaged: '+item.source);
 const target=new URL(item.destination,root);let existing;
 try{existing=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&(existing.length!==item.size||sha(existing)!==item.sha256))throw Error('Refusing to overwrite modified source asset: '+item.destination);
 verified.push({target,bytes});
}
for(const {target,bytes}of verified){await mkdir(dirname(fileURLToPath(target)),{recursive:true});await writeFile(target,bytes);}
console.log('Restored and verified '+verified.length+' original source assets. Source/public is complete.');
