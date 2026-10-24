import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';
const {POST}=await import('./app/api/parana/consulta/route.ts');const {sign,scope}=await import('./lib/credit-server.ts');
const params=new URLSearchParams({local:'6gkzqf9vb',termo:'feminino',categoria:'37',offset:'50',raio:'7',data:'3',ordem:'3',valor_min:'24.99',valor_max:'1499',tipo:'produtos'});
const agent='Mozilla/5.0 Firefox/158.0';let calls=0;let invalid=false;
globalThis.fetch=async(url,init)=>{
 if(String(url).includes('/auth/v1/user'))return Response.json({id:'user-a',email_confirmed_at:'2026-01-01'});
 if(String(url).includes('/rpc/record_price_observations'))return Response.json(JSON.parse(init.body).observations.map(row=>({observation_key:row.observation_key,points:[],has_newer:false})));
 calls++;const target=new URL(url);assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');assert.equal(target.searchParams.get('offset'),'50');assert.equal(target.searchParams.get('ordem'),'3');assert.equal(target.searchParams.get('valor_min'),'24.99');assert.equal(target.searchParams.get('valor_max'),'1499');
 const headers=new Headers(init.headers);assert.equal(headers.get('user-agent'),agent);assert.equal(headers.get('cookie'),null);assert.equal(headers.get('authorization'),null);assert.equal(headers.get('x-search-grant'),null);assert.equal(init.credentials,'omit');
 return Response.json({local:invalid?'':params.get('local'),total:100,produtos:[{gtin:'7909989354513',valor:'30',valor_tabela:'30',datahora:'2026-01-01T12:00:00Z',estabelecimento:{uf:'PR',mun:'Curitiba',nm_logr:'Rua A',nr_logr:'1',nm_emp:'Mercado'}}]});
};
function request(overrides={},body={},query=params){return new Request('https://site.example/api/parana/consulta?'+query,{method:'POST',headers:{Origin:'https://site.example',cookie:'pp_auth=user-a','User-Agent':agent,'Content-Type':'application/json','x-search-grant':sign({account:'user:user-a',scope:scope(params),exp:Date.now()+60000}),...overrides},body:JSON.stringify(body)});}
let response=await POST(request());assert.equal(response.status,200);let data=await response.json();assert.equal(data.sourceCount,1);assert.equal(data.produtos[0].priceHistory.origin,'client');assert.equal(calls,1);
for(const [headers,body,status] of [[{Origin:'https://evil.example'},{},403],[{'x-search-grant':'bad'},{},403],[{'x-search-grant':sign({account:'user:other',scope:scope(params),exp:Date.now()+60000})},{},403],[{}, {url:'https://evil.example'},400]]){
 const before=calls;assert.equal((await POST(request(headers,body))).status,status);assert.equal(calls,before);
}
const wrong=new URLSearchParams(params);wrong.set('termo','different');assert.equal((await POST(request({}, {},wrong))).status,403);
const kind=new URLSearchParams(params);kind.set('tipo','arbitrary');assert.equal((await POST(request({}, {},kind))).status,400);
invalid=true;response=await POST(request());assert.equal(response.status,502);assert.equal((await response.json()).code,'PARANA_RESPONSE_INCONSISTENT');
console.log('PASS: authenticated server fallback repeats exact public query with caller User-Agent, no private headers, same private history; blocks wrong origin/grant/scope/arbitrary destinations and inconsistent data.');
