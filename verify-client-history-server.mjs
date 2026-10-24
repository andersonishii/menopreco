import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';
const {POST}=await import('./app/api/price-history/route.ts');const {sign,scope}=await import('./lib/credit-server.ts');
const {observation}=await import('./lib/price-history-server.ts');const {historyChange}=await import('./lib/price-history.ts');
const query=new URLSearchParams({local:'6gkzqf9vb',gtin:'7909989354513'}),url='https://site.example/api/price-history?'+query;
const offer={gtin:'7909989354513',valor:'8',valor_tabela:'10',valor_desconto:'2',datahora:'2026-01-02T12:00:00Z',estabelecimento:{uf:'PR',mun:'Curitiba',nm_logr:'Rua A',nr_logr:'1',nm_emp:'Mercado'}};
const old={...offer,valor:'10',valor_desconto:'0',datahora:'2026-01-01T12:00:00Z'};
const records=new Map();let writes=0,down=false;
globalThis.fetch=async(url,init)=>{
 if(String(url).includes('/auth/v1/user'))return Response.json({id:new Headers(init.headers).get('Authorization').split(' ')[1],email_confirmed_at:'2026-01-01'});
 assert.ok(String(url).endsWith('/rpc/record_price_observations'));if(down)throw Error('DB offline');writes++;
 const rows=JSON.parse(init.body).observations;
 for(const row of rows){assert.ok(!init.body.includes('Mercado'));assert.ok(!init.body.includes('user-a'));records.set(row.observation_key,row);}
 return Response.json(rows.map(row=>{const same=[...records.values()].filter(x=>x.source===row.source&&x.gtin===row.gtin&&x.store_key===row.store_key);return{observation_key:row.observation_key,has_newer:same.some(x=>x.recorded_at>row.recorded_at),points:same.filter(x=>x.recorded_at<row.recorded_at).sort((a,b)=>b.recorded_at.localeCompare(a.recorded_at)).slice(0,8).map(x=>({price:x.price,recordedAt:x.recorded_at,discount:x.discount}))};}));
};
function request(offers,user='user-a',extra={}){
 return new Request(url,{method:'POST',headers:{Origin:'https://site.example',cookie:'pp_auth='+user,'Content-Type':'application/json','x-search-grant':sign({account:'user:'+user,scope:scope(query),exp:Date.now()+60000}),...extra},body:JSON.stringify({offers})});
}
let response=await POST(request([old,offer]));assert.equal(response.status,200);let data=await response.json();assert.equal(data.entries.length,1);assert.equal(data.entries[0].index,1);assert.equal(data.entries[0].priceHistory.origin,'client');assert.equal(historyChange(8,data.entries[0].priceHistory).kind,'down');assert.equal(records.size,2);
await POST(request([old,offer]));assert.equal(records.size,2);
response=await POST(request([offer],'user-b'));data=await response.json();assert.equal(data.entries[0].priceHistory.points.length,0);assert.equal(records.size,3);
assert.notEqual(observation(offer,'PR').store_key,observation(offer,'PR',Date.now(),'user-a').store_key);
assert.notEqual(observation(offer,'PR',Date.now(),'user-a').store_key,observation(offer,'PR',Date.now(),'user-b').store_key);
for(const [offers,headers,status] of [
 [[offer],{Origin:'https://evil.example'},403],[[offer],{'x-search-grant':'bad'},403],[[offer],{'x-search-grant':sign({account:'user:user-b',scope:scope(query),exp:Date.now()+60000})},403],
 [[offer],{'x-search-grant':sign({account:'user:user-a',scope:scope(query),exp:Date.now()-1000})},403],
 [[{...offer,gtin:'7891234567895'}],{},400],[[{...offer,valor:'-1'}],{},400],[[{...offer,estabelecimento:{...offer.estabelecimento,uf:'SC'}}],{},400],[[{...offer,estabelecimento:{...offer.estabelecimento,nm_emp:'x'.repeat(241)}}],{},400],[Array(51).fill(offer),{},400]
]){const before=writes;assert.equal((await POST(request(offers,'user-a',headers))).status,status);assert.equal(writes,before);}
const huge=new Request(url,{method:'POST',headers:{Origin:'https://site.example',cookie:'pp_auth=user-a','x-search-grant':sign({account:'user:user-a',scope:scope(query),exp:Date.now()+60000})},body:JSON.stringify({offers:[offer],padding:'x'.repeat(65536)})});assert.equal((await POST(huge)).status,413);
down=true;response=await POST(request([offer]));assert.equal(response.status,200);assert.equal((await response.json()).entries[0].historyUnavailable,true);
console.log('PASS: authenticated origin/grant-protected history ingestion, per-account and verified-data isolation, prior invoice comparisons, latest visible note, deduplication, size/field limits and graceful DB failure.');
