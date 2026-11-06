// Keep the fast suite separate from the complete, deliberately thorough UI matrix.
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tests=readdirSync(new URL('../tests/',import.meta.url)).filter(file=>file.endsWith('.test.mjs') && file!=='werewolf-ui.test.mjs').sort().map(file=>'tests/'+file);
if(!tests.length)throw new Error('No unit tests found.');
const result=spawnSync(process.execPath,['--experimental-strip-types','--test','--test-timeout=120000',...tests],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
