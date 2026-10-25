const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loader}=require('../helpers.cjs');
const load=loader();
const {scope,sign,verify,requireSearch}=load('lib/credit-server.ts');
const base={local:'6gkzqf9vb',termo:'arroz'};
test('Search scope binds national state and coordinates but allows pagination/order changes',()=>{const params=new URLSearchParams({...base,uf:'SC',latitude:'-27',longitude:'-48'}),original=scope(params);params.set('offset','50');params.set('ordem','3');assert.equal(scope(params),original);params.set('latitude','-28');assert.notEqual(scope(params),original);});
test('Search signatures reject tampering',()=>{const token=sign({test:1});assert.equal(verify(token).test,1);assert.equal(verify(token+'x'),null);});
test('Expired or different-account grants do not authorize price access',async t=>{t.mock.method(global,'fetch',async()=>Response.json({id:'user-a',email_confirmed_at:'2026-01-01'}));for(const value of [{account:'user:user-a',scope:scope(new URLSearchParams(base)),exp:Date.now()-1},{account:'user:user-b',scope:scope(new URLSearchParams(base)),exp:Date.now()+60000}]){const request=new Request('https://site.example/api/produtos?'+new URLSearchParams(base),{headers:{cookie:'pp_auth=fake','x-search-grant':sign(value)}});await assert.rejects(()=>requireSearch(request),{status:403});}});
for(const national of [false,true])test((national?'National':'Parana')+' credit authorization only requires gov.br for national searches',async t=>{
 let tokenCalls=0,charged=0;
 const creditsLoader=loader({'../../../lib/mpbr-auth':{mpbrAccessToken:async()=>{tokenCalls++;const {AccessError}=creditsLoader('lib/credit-server.ts');throw new AccessError('Connect gov.br',428,'MPBR_CONNECTION_REQUIRED');}},'../../../lib/brasil-server':{validateBrasil:async()=>({uf:'SC'})}});const credits=creditsLoader('app/api/credits/route.ts');
 t.mock.method(global,'fetch',async(url)=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});if(String(url).includes('credit_searches'))return Response.json([]);if(String(url).includes('use_search_credit')){charged++;return Response.json(1);}throw Error('Unexpected mocked URL');});
 const params={...base,...(national?{uf:'SC',latitude:'-27',longitude:'-48'}:{})};
 const response=await credits.POST(new Request('https://site.example/api/credits',{method:'POST',headers:{origin:'https://site.example',cookie:'pp_auth=fake','Content-Type':'application/json'},body:JSON.stringify({id:'12345678-1234-1234-1234-123456789abc',params})}));
 assert.equal(response.status,national?428:200);assert.equal(tokenCalls,national?1:0);assert.equal(charged,national?0:1);
});
