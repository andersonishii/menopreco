import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {geohash}=await import('./lib/location.ts');const {AccessError,fail,sign,scope}=await import('./lib/credit-server.ts');
const municipalities=JSON.parse(fs.readFileSync('lib/municipality-data.json','utf8'));
const source=stripTypeScriptTypes(fs.readFileSync('app/api/cidades/route.ts','utf8')).replace(/^import .*;$/gm,'').replace(/export /g,'');
const GET=new Function('municipalities','geohash','participatingStates','fail','AccessError',source+';return GET;')(municipalities,geohash,async()=>[{sigla:'RS'}],fail,AccessError);
let result=await (await GET(new Request('http://localhost/api/cidades?regiao=Umuarama'))).json();assert.equal(result.cidades[0].name,'Umuarama');assert.equal(result.cidades[0].uf,'PR');assert.ok(Number.isFinite(result.cidades[0].latitude));
result=await (await GET(new Request('http://localhost/api/cidades?uf=RS&regiao=Porto%20Alegre'))).json();assert.equal(result.cidades[0].uf,'RS');assert.ok(result.cidades[0].longitude<0);
assert.deepEqual(await (await GET(new Request('http://localhost/api/cidades?regiao=Inexistente'))).json(),{cidades:[]});assert.equal((await GET(new Request('http://localhost/api/cidades?uf=SP&regiao=São%20Paulo'))).status,400);
const {GET:products}=await import('./app/api/produtos/route.ts');let called;
globalThis.fetch=async url=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'test',email_confirmed_at:'2026-01-01'});called=url.url||String(url);return Response.json({produtos:[]});};
for(const query of ['gtin=7898024394938','termo=arroz&categoria=6']){const url='http://localhost/api/produtos?'+query+'&local=6gf0ffq61';const params=new URL(url).searchParams;assert.equal((await products(new Request(url,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:'user:test',scope:scope(params),exp:Date.now()+10000})}}))).status,200);assert.equal(new URL(called).searchParams.get('local'),'6gf0ffq61');}
console.log('PASS: municípios por estado, coordenadas, estado indisponível e consultas do Paraná.');
