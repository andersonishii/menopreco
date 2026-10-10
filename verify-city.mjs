import assert from 'node:assert/strict';
import {GET} from './app/api/cidades/route.ts';
import {GET as products} from './app/api/produtos/route.ts';
let called='';globalThis.fetch=async url=>{called=String(url);return Response.json([{geohash:'6gf0ffq61',display_name:'Umuarama, Microrregião Umuarama, PR, Brasil'}])};
const result=await (await GET(new Request('http://localhost/api/cidades?regiao=Umuarama'))).json();
assert.equal(result.cidades[0].geohash,'6gf0ffq61');assert.equal(result.cidades[0].name,'Umuarama');assert.ok(called.endsWith('regiao=Umuarama'));
globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await (await GET(new Request('http://localhost/api/cidades?regiao=Inexistente'))).json(),{cidades:[]});
globalThis.fetch=async url=>{called=url.url||String(url);return Response.json({produtos:[]})};
for(const query of ['gtin=7898024394938','termo=arroz&categoria=6']){await products(new Request('http://localhost/api/produtos?'+query+'&local=6gf0ffq61'));assert.equal(new URL(called).searchParams.get('local'),'6gf0ffq61');}
assert.equal((await products(new Request('http://localhost/api/produtos?gtin=7898024394938&local=invalido'))).status,400);
console.log('OK: seleção de Umuarama, cidade inexistente, local inválido e geohash por descrição/código de barras.');
