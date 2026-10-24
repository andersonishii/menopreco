import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const originalTimer=globalThis.setTimeout;
try{
 for(const kind of ['categories','description','barcode','fuel'])for(const outcome of ['success','permanent','overload','second-502','cancelled']){
  clearGrants();let credits=0,calls=0;const delays=[],progress=[];
  globalThis.setTimeout=(resolve,ms)=>{delays.push(ms);if(outcome==='cancelled')clearGrants();queueMicrotask(resolve);return 0;};
  const path=kind==='categories'?'/api/categorias':'/api/produtos';
  const query=kind==='barcode'?'gtin=7909989354513':kind==='fuel'?'tp_comb=1':'termo=feminino'+(kind==='description'?'&categoria=37':'');
  globalThis.fetch=async(url,init)=>{
   if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
   const target=new URL(url);assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');assert.equal(init.credentials,'omit');calls++;
   if(outcome==='success'&&calls===2)return Response.json(kind==='categories'?{categorias:[]}:{local:'6gkzqf9vb',produtos:[],total:0});
   return Response.json(outcome==='overload'?{message:'[es_rejected_execution_exception] rejected execution'}:{error:'Internal Server Error'},{status:outcome==='second-502'&&calls===2?502:500});
  };
  const result=await creditFetch(path+'?local=6gkzqf9vb&raio=7&offset=0&ordem=3&'+query,false,(state,seconds)=>progress.push([state,seconds]));
  assert.equal(credits,1);assert.equal(calls,outcome==='cancelled'?1:2);assert.deepEqual(delays,[8000]);assert.equal(result.status,outcome==='success'?200:outcome==='overload'?503:502);
  assert.deepEqual(progress,outcome==='cancelled'?[['waiting',8],['done',undefined]]:[['waiting',8],['retrying',undefined],['done',undefined]]);
 }
 clearGrants();let calls=0;const delays=[];
 globalThis.setTimeout=(resolve,ms)=>{delays.push(ms);queueMicrotask(resolve);return 0;};
 globalThis.fetch=async url=>{if(url==='/api/credits')return Response.json({grant:'national'});calls++;return Response.json({error:'Failure'},{status:500});};
 assert.equal((await creditFetch('/api/brasil/produtos?local=6gkzqf9vb&uf=SC&latitude=-27&longitude=-48&termo=arroz')).status,500);assert.equal(calls,1);assert.deepEqual(delays,[]);
}finally{globalThis.setTimeout=originalTimer;clearGrants();}
console.log('PASS: original Parana HTTP 500 retries once at 8000 ms across categories/products/barcodes/fuel, including overload; same credit, progress, cancellation, no chained retries or changes to national routes.');
