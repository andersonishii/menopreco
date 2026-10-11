import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
for(const kind of ['categorias','produtos']){
 const source=stripTypeScriptTypes(fs.readFileSync('app/api/'+kind+'/route.ts','utf8')).replace(/^import .*;$/gm,'').replace(/export /g,'');
 let requested;
 const handler=new Function('requireSearch','fail','readDescriptionResponse','fetch',source+';return GET;')(async()=>{},()=>{},()=>({kind:'categories',categories:[]}),async input=>{requested=new URL(input instanceof Request?input.url:input);return Response.json(kind==='categorias'?{categorias:[]}:{produtos:[]});});
 const base='https://example.com/api/'+kind+'?local=6gs368dmp&termo=arroz&categoria=6&raio=';
 assert.equal((await handler(new Request(base+'5'))).status,200);assert.equal(requested.searchParams.get('raio'),'5');
 for(const invalid of ['0','23','-1','abc','2.5'])assert.equal((await handler(new Request(base+invalid))).status,400);
}
console.log('PASS: raio encaminhado em categorias e produtos; valores inválidos rejeitados.');
