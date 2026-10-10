let testFetch;Object.defineProperty(globalThis,'fetch',{configurable:true,get(){return testFetch},set(fn){testFetch=async (...args)=>String(args[0]?.url||args[0]).includes('/auth/v1/user')?Response.json({id:'test',email:'test@example.com',email_confirmed_at:'2026-01-01'}):fn(...args)}});
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);return next(specifier,context)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {sign,scope}=await import('./lib/credit-server.ts');
function authorized(url){const id='user:test';let key;try{key=scope(new URL(url).searchParams)}catch{}return new Request(url,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:id,scope:key,exp:Date.now()+10000})}})}
import assert from 'node:assert/strict';
const {GET}=await import('./app/api/cidades/route.ts');
const {GET:products}=await import('./app/api/produtos/route.ts');
let called='';globalThis.fetch=async url=>{called=String(url);return Response.json([{geohash:'6gf0ffq61',display_name:'Umuarama, Microrregião Umuarama, PR, Brasil'}])};
const result=await (await GET(authorized('http://localhost/api/cidades?regiao=Umuarama'))).json();
assert.equal(result.cidades[0].geohash,'6gf0ffq61');assert.equal(result.cidades[0].name,'Umuarama');assert.ok(called.endsWith('regiao=Umuarama'));
globalThis.fetch=async()=>Response.json([]);assert.deepEqual(await (await GET(authorized('http://localhost/api/cidades?regiao=Inexistente'))).json(),{cidades:[]});
globalThis.fetch=async url=>{called=url.url||String(url);return Response.json({produtos:[]})};
for(const query of ['gtin=7898024394938','termo=arroz&categoria=6']){await products(authorized('http://localhost/api/produtos?'+query+'&local=6gf0ffq61'));assert.equal(new URL(called).searchParams.get('local'),'6gf0ffq61');}
assert.equal((await products(authorized('http://localhost/api/produtos?gtin=7898024394938&local=invalido'))).status,400);
console.log('OK: seleção de Umuarama, cidade inexistente, local inválido e geohash por descrição/código de barras.');
