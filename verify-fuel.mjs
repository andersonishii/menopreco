let testFetch;Object.defineProperty(globalThis,'fetch',{configurable:true,get(){return testFetch},set(fn){testFetch=async (...args)=>String(args[0]?.url||args[0]).includes('/auth/v1/user')?Response.json({id:'test',email:'test@example.com',email_confirmed_at:'2026-01-01'}):fn(...args)}});
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);return next(specifier,context)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {sign,scope}=await import('./lib/credit-server.ts');
function authorized(url){const id='user:test';let key;try{key=scope(new URL(url).searchParams)}catch{}return new Request(url,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:id,scope:key,exp:Date.now()+10000})}})}
import assert from 'node:assert/strict';
const {GET}=await import('./app/api/produtos/route.ts');
let called;globalThis.fetch=async request=>{called=new URL(request.url||request);return Response.json({produtos:[]})};
for(const fuel of ['1','2','3','4','5'])for(const ordem of ['0','1','2','3']){const response=await GET(authorized('http://localhost/api/produtos?'+new URLSearchParams({local:'6gf0ffq61',tp_comb:fuel,ordem,offset:'50'})));assert.equal(response.status,200);for(const [key,value] of Object.entries({local:'6gf0ffq61',tp_comb:fuel,ordem,offset:'50',raio:'7',data:'3'}))assert.equal(called.searchParams.get(key),value);assert.equal(called.searchParams.has('categoria'),false);}
assert.equal((await GET(authorized('http://localhost/api/produtos?local=6gf0ffq61&tp_comb=6'))).status,400);
console.log('OK: cinco combustíveis, quatro ordenações, cidade, paginação e filtros de combustível.');
