import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';
const {GET}=await import('./app/api/account/route.ts');const {POST}=await import('./app/api/credits/route.ts');const {verify}=await import('./lib/credit-server.ts');
globalThis.fetch=async url=>{url=String(url);if(url.includes('/auth/v1/user'))return Response.json({id:'test',email:'test@example.com',email_confirmed_at:'2026-01-01'});if(url.includes('rpc/use_search_credit'))return Response.json(0);if(url.includes('/credit_searches?'))return Response.json([]);if(url.includes('&select='))return Response.json([{remaining:0,free_granted:true,unlimited_access:true}]);return new Response(null,{status:201})};
const headers={cookie:'pp_auth=test',origin:'https://site.example','content-type':'application/json'};
assert.equal((await (await GET(new Request('https://site.example/api/account',{headers}))).json()).unlimitedAccess,true);
const response=await POST(new Request('https://site.example/api/credits',{method:'POST',headers,body:JSON.stringify({id:crypto.randomUUID(),params:{local:'6gf0ffq61',gtin:'7898024394938'}})}));assert.equal(response.status,200);assert.equal(verify((await response.json()).grant).account,'user:test');
console.log('OK: acesso ilimitado informado pelo servidor e consulta autorizada com saldo zero.');
