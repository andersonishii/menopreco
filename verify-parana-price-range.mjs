import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {paranaPriceRange,paranaRangeParams,paranaRequestOrder}=await import('./lib/parana-response.ts');
const {GET}=await import('./app/api/produtos/route.ts');const {sign,scope}=await import('./lib/credit-server.ts');
assert.equal(paranaRequestOrder('recent-day'),'0');
for(const order of ['0','1','2','3'])assert.equal(paranaRequestOrder(order),order);
const range=paranaPriceRange({min:'24.99',max:'1499.00'});
assert.deepEqual(range,{min:'24.99',max:'1499.00'});
assert.deepEqual(paranaRangeParams(0,range),{});
assert.deepEqual(paranaRangeParams(50,range),{valor_min:'24.99',valor_max:'1499.00'});
assert.deepEqual(paranaRangeParams(100,range),paranaRangeParams(50,range));
assert.deepEqual(paranaRangeParams(50,null),{});
for(const invalid of [null,{}, {min:'',max:''},{min:30,max:20},{min:-1,max:20},{min:1,max:Infinity},{min:1,max:1000001},{min:'24,99',max:100}])assert.equal(paranaPriceRange(invalid),null);
const calls=[];
globalThis.fetch=async(url)=>{
 if(String(url).includes('/auth/v1/user'))return Response.json({id:'test',email_confirmed_at:'2026-01-01'});
 calls.push(new URL(url));return Response.json({local:'6gkzqf9vb',produtos:[],total:217,precos:{min:'24.99',max:'1499.00'}});
};
for(const offset of [0,50,100]){
 const params=new URLSearchParams({local:'6gkzqf9vb',termo:'feminino',categoria:'37',offset:String(offset),raio:'7',ordem:paranaRequestOrder('recent-day'),...paranaRangeParams(offset,range)});
 const response=await GET(new Request('https://site.example/api/produtos?'+params,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:'user:test',scope:scope(params),exp:Date.now()+10000})}}));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).precos,{min:'24.99',max:'1499.00'});
 const called=calls.at(-1);if(offset===0)assert.equal(called.href,'https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?local=6gkzqf9vb&termo=feminino&categoria=37&offset=0&raio=7&data=3&ordem=0');assert.equal(called.searchParams.get('ordem'),'0');assert.equal(called.searchParams.get('data'),'3');assert.equal(called.searchParams.get('offset'),String(offset));assert.equal(called.searchParams.get('valor_min'),offset?'24.99':null);assert.equal(called.searchParams.get('valor_max'),offset?'1499.00':null);
}
for(const query of ['valor_min=30&valor_max=20','valor_min=1','valor_max=10','valor_min=-1&valor_max=2']){
 const before=calls.length;
 const response=await GET(new Request('https://site.example/api/produtos?local=6gkzqf9vb&termo=feminino&categoria=37&'+query));
 assert.equal(response.status,400);assert.equal(calls.length,before);
}
console.log('PASS: category first page has no price range; subsequent pages carry original API bounds; malformed ranges rejected before upstream calls.');
