import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {paranaOffset,paranaPage,paranaBusyResponse}=await import('./lib/parana-response.ts');
for(const [input,output] of [[0,0],[46,50],[50,50],[92,100],[100,100],['46',50],[-1,0],[NaN,0]])assert.equal(paranaOffset(input),output);
assert.equal(paranaPage(46,{produtos:[{}],total:217}).nextOffset,100);
const overload=()=>Response.json({message:'2 UNKNOWN: [es_rejected_execution_exception] rejected execution [search, queue capacity = 1000]'},{status:500});
for(const response of [overload(),Response.json({},{status:429}),Response.json({},{status:503})]){
 const busy=await paranaBusyResponse(response);assert.equal(busy.status,503);assert.equal(busy.headers.get('Retry-After'),'10');assert.equal((await busy.json()).code,'PARANA_UPSTREAM_BUSY');
}
assert.equal(await paranaBusyResponse(Response.json({error:'Unexpected error'},{status:500})),null);
const {paranaFetch:GET}=await import('./lib/parana-browser.ts');const {sign,scope}=await import('./lib/credit-server.ts');
let externalCalls=0;
globalThis.fetch=async(url)=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'test',email_confirmed_at:'2026-01-01'});externalCalls++;assert.equal(new URL(url).searchParams.get('offset'),'50');return overload();};
const params=new URLSearchParams({local:'6gkzquw8e',termo:'feminino',categoria:'37',offset:'46',raio:'20',ordem:'2'});
const result=await GET(new Request('https://site.example/api/produtos?'+params,{headers:{cookie:'pp_auth=test','x-search-grant':sign({account:'user:test',scope:scope(params),exp:Date.now()+10000})}}));
assert.equal(result.status,503);assert.equal(externalCalls,1);
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const originalTimer=globalThis.setTimeout;const retryDelays=[];globalThis.setTimeout=(resolve,ms)=>{retryDelays.push(ms);queueMicrotask(resolve);return 0;};
try{for(const barcode of [true,false]){
 clearGrants();let credits=0,officialCalls=0,recover=false;
 globalThis.fetch=async(url,init)=>{
  if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
  const target=new URL(url,location.origin);assert.equal(target.searchParams.get('offset'),'50');assert.equal(target.searchParams.get('ordem'),'2');
  assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');officialCalls++;assert.equal(init.credentials,'omit');
  return recover?Response.json({local:'6gkzquw8e',produtos:[],total:0}):overload();
 };
 const query='/api/produtos?local=6gkzquw8e&raio=20&offset=46&ordem=2&'+(barcode?'gtin=7909989354513':'termo=feminino&categoria=37');
 const first=await creditFetch(query);assert.equal(first.status,503);
 assert.equal(officialCalls,2);
 recover=true;assert.equal((await creditFetch(query)).status,200);assert.equal(credits,1);
 assert.equal(officialCalls,3);
}}finally{globalThis.setTimeout=originalTimer;}
assert.deepEqual(retryDelays.filter(ms=>ms>=6000),[8000,8000]);
console.log('PASS: stale offsets aligned, external overload sanitized as retryable 503, no immediate duplicate lookup, manual retry uses same page and one credit.');
