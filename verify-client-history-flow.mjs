import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const {saveClientPriceHistory}=await import('./lib/price-history-client.ts');
const offer={id:'invoice-private-id',nrdoc:'private-invoice',desc:'private-search-description',local:'private-geohash',gtin:'7909989354513',valor:'8',valor_tabela:'10',valor_desconto:'2',datahora:'2026-01-02T12:00:00Z',distkm:'3',estabelecimento:{uf:'PR',mun:'Curitiba',nm_logr:'Rua A',nr_logr:'1',nm_emp:'Mercado'}};
let official=0,history=0,credits=0;const bodies=[];
globalThis.fetch=async(url,init)=>{
 if(url==='/api/credits'){credits++;return Response.json({grant:'private-grant'});}
 if(String(url).startsWith('https://menorpreco.')){official++;return Response.json({local:'6gkzqf9vb',total:2,precos:{min:'8',max:'10'},produtos:[{...offer,datahora:'2026-01-01T12:00:00Z'},offer]});}
 assert.ok(String(url).startsWith('/api/price-history?'));history++;assert.equal(init.method,'POST');assert.equal(init.credentials,'same-origin');assert.equal(init.headers['x-search-grant'],'private-grant');
 assert.ok(!init.body.includes('private-invoice'));assert.ok(!init.body.includes('private-search-description'));assert.ok(!init.body.includes('private-geohash'));assert.ok(!init.body.includes('invoice-private-id'));assert.ok(!init.body.includes('distkm'));
 const body=JSON.parse(init.body);bodies.push(body);return Response.json({entries:[{index:1,priceHistory:{origin:'client',hasNewer:false,points:[{price:10,recordedAt:'2026-01-01T12:00:00Z',discount:0}]}}]});
};
clearGrants();const result=await(await creditFetch('/api/produtos?local=6gkzqf9vb&raio=7&gtin=7909989354513&offset=0&ordem=0')).json();
assert.equal(official,1);assert.equal(history,1);assert.equal(credits,1);assert.equal(bodies[0].offers.length,2);assert.equal(result.sourceCount,2);assert.equal(result.produtos.length,1);assert.equal(result.produtos[0].priceHistory.points[0].price,10);assert.equal(result.produtos[0].historyUnavailable,false);
// Metadata batches preserve positions and are bounded to two in-flight requests.
let inFlight=0,maximum=0,batches=0;
globalThis.fetch=async(url,init)=>{inFlight++;maximum=Math.max(maximum,inFlight);batches++;await new Promise(resolve=>setTimeout(resolve,1));inFlight--;const {offers}=JSON.parse(init.body);assert.ok(offers.length<=50);return Response.json({entries:offers.map((_,index)=>({index,priceHistory:{origin:'client',points:[],hasNewer:false}}))});};
const many=await saveClientPriceHistory(Array.from({length:120},()=>({...offer})),new URL('https://site.example/api/produtos?local=6gkzqf9vb&termo=arroz'),'grant');assert.equal(batches,3);assert.equal(maximum,2);assert.equal(many.length,120);assert.ok(many.every(o=>o.priceHistory?.origin==='client'));
for(const fail of ['network','http','invalid']){
 globalThis.fetch=async()=>{if(fail==='network')throw Error('Offline');return fail==='http'?Response.json({error:'Unavailable'},{status:503}):Response.json({entries:[{index:-1,priceHistory:{origin:'client',points:[]}}]});};
 const fallback=await saveClientPriceHistory([offer],new URL('https://site.example/api/produtos?local=6gkzqf9vb&termo=arroz'),'grant');assert.equal(fallback[0].valor,'8');assert.equal(fallback[0].historyUnavailable,true);
}
console.log('PASS: direct lookup saves all raw notes before filtering and displays prior prices; minimal payload, one credit, bounded batches, and history failure never hides offers.');

for(const failure of ['cors','inconsistent-local']){
 clearGrants();let historyCalls=0;
 globalThis.fetch=async url=>{
  if(url==='/api/credits')return Response.json({grant:'private'});
  if(String(url).startsWith('/api/price-history')){historyCalls++;throw Error('Unexpected history submission');}
  if(failure==='cors')throw new TypeError('CORS blocked');
  return Response.json({local:'',produtos:[offer]});
 };
 const failed=await creditFetch('/api/produtos?local=6gkzqf9vb&raio=7&gtin=7909989354513&offset=0');assert.equal(failed.status,502);if(failure==='inconsistent-local')assert.equal((await failed.json()).code,'PARANA_RESPONSE_INCONSISTENT');assert.equal(historyCalls,0);
}
console.log('PASS: blocked or inconsistent official responses never reach history ingestion.');
