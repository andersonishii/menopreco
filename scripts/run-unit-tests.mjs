import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tests=readdirSync(new URL('../tests/unit/',import.meta.url)).filter(name=>name.endsWith('.test.cjs')).sort().map(name=>fileURLToPath(new URL('../tests/unit/'+name,import.meta.url)));
if(!tests.length)throw Error('No unit tests found; build refused.');
const result=spawnSync(process.execPath,['--require',fileURLToPath(new URL('../tests/offline.cjs',import.meta.url)),'--test',...tests],{cwd:root,stdio:'inherit',timeout:120000});
if(result.error){console.error(result.error.message);process.exit(1);}
process.exit(result.status??1);
