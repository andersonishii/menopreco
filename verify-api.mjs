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

// Even an older client requesting expansion must not trigger barcode lookups in Paraná.
for(const handler of [categories,products]){
 let upstreamCalls=0;
 const offer={id:'sample',gtin:'7891234567895',desc:'Arroz',valor_tabela:'5.00'};
 mock(()=>{upstreamCalls++;assert.equal(called.searchParams.has('gtin'),false);return Response.json({produtos:[offer]});});
 const response=await handler(request('https://site.example/api/'+(handler===categories?'categorias':'produtos')+'?local=6gkzq99z5j5f&termo=arroz&categoria=6&expand=1'));
 if(handler===categories){assert.equal(response.status,502);assert.match((await response.json()).error,/Tente novamente/);}else{assert.equal(response.status,200);assert.deepEqual((await response.json()).produtos,[offer]);}assert.equal(upstreamCalls,1);
}
mock(()=>Response.json({produtos:[]}));
assert.equal((await products(request('https://site.example/api/produtos?local=6gkzq99z5j5f&gtin=7891234567895'))).status,200);
assert.equal(called.searchParams.get('gtin'),'7891234567895');
console.log('PASS: descrição no Paraná não expande GTIN; consulta direta por código de barras preservada.');

for(const payload of [{produtos:[]},{unexpected:true},{produtos:[{id:'sample',desc:'Arroz',valor_tabela:'5.00'}],total:0}]){
 mock(()=>Response.json(payload));const response=await categories(request('https://site.example/api/categorias?local=6gkzq99z5j5f&termo=arroz'));
 assert.equal(response.status,502);assert.match((await response.json()).error,/Tente novamente/);
}
console.log('PASS: resposta inválida ou produtos inesperados continuam gerando erro de consulta.');

for(const payload of [[],{categorias:[]},{tempo:49,local:'6gkzqf9vb',produtos:[],total:0,precos:{min:'',max:''}},{produtos:[],total:'0'}]){
 mock(()=>Response.json(payload));const response=await categories(request('https://site.example/api/categorias?local=6gkzq99z5j5f&termo=kiiiimder'));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{categorias:[]});
}
const {readDescriptionResponse}=await import('./lib/description-response.ts');
assert.deepEqual(readDescriptionResponse({produtos:[],total:0}),{kind:'categories',categories:[]});
assert.throws(()=>readDescriptionResponse({produtos:[],total:1}));
assert.throws(()=>readDescriptionResponse({produtos:[],total:null}));
console.log('PASS: zero resultado em categorias ou produtos é uma busca vazia válida, tanto no navegador quanto no servidor.');
