import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {sign,scope}=await import('./lib/credit-server.ts');const {GET:categories}=await import('./app/api/categorias/route.ts');const {GET:products}=await import('./app/api/produtos/route.ts');
const request=url=>new Request(url,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:'user:test',scope:scope(new URL(url).searchParams),exp:Date.now()+10000})}});
let called;const mock=reply=>{globalThis.fetch=async url=>{const text=String(url.url||url);if(text.includes('/auth/v1/user'))return Response.json({id:'test',email_confirmed_at:'2026-01-01'});called=new URL(text);return reply();};};
mock(()=>Response.json({categorias:[{id:6,desc:'Cereais',qtd:10}]}));let result=await categories(request('https://site.example/api/categorias?local=6gkzq99z5j5f&termo=arroz%20integral&raio=5'));assert.equal(result.status,200);assert.equal(called.searchParams.get('termo'),'arroz integral');assert.equal(called.searchParams.get('raio'),'5');
for(const order of ['0','1','2','3']){mock(()=>Response.json({produtos:[]}));result=await products(request('https://site.example/api/produtos?local=6gkzq99z5j5f&termo=arroz&categoria=6&offset=50&ordem='+order));assert.equal(result.status,200);assert.equal(called.searchParams.get('ordem'),order);assert.equal(called.searchParams.get('offset'),'50');assert.equal(called.searchParams.get('categoria'),'6');}
assert.equal((await products(request('https://site.example/api/produtos?local=6gkzq99z5j5f&termo=arroz&categoria=abc'))).status,400);
mock(()=>{throw Error('offline');});assert.equal((await categories(request('https://site.example/api/categorias?local=6gkzq99z5j5f&termo=arroz'))).status,502);
console.log('PASS: Paraná preserva categorias, descrição, raio, ordenação, paginação e falhas.');
