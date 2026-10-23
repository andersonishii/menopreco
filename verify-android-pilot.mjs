import {mkdtempSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const javaHome=process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Android/Android Studio/jbr':'');
const binary=name=>javaHome?join(javaHome,'bin',name+(process.platform==='win32'?'.exe':'')):name;
const classes=mkdtempSync(join(tmpdir(),'preco-perto-android-tests-'));mkdirSync(classes,{recursive:true});
function run(name,args){const result=spawnSync(binary(name),args,{encoding:'utf8'});if(result.error)throw result.error;process.stdout.write(result.stdout);process.stderr.write(result.stderr);if(result.status!==0)process.exit(result.status||1);}
run('javac',['-encoding','UTF-8','-d',classes,'android-pilot/app/src/main/java/com/precoperto/piloto/AuthLinks.java','android-pilot/tests/AuthLinksTest.java']);
run('java',['-cp',classes,'AuthLinksTest']);
