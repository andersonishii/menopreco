import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const originalTimer=globalThis.setTimeout;
const message='Não foi possível consultar as categorias no Nota Paraná. Tente novamente em instantes.';
try{
 for(const scenario of ['success','permanent','legacy','unauthorized','unrelated','empty','direct','retry-network','retry-auth','cancelled']){
  clearGrants();let credits=0,server=0,official=0;const delays=[],progress=[];
  globalThis.setTimeout=(resolve,ms)=>{delays.push(ms);if(scenario==='cancelled')clearGrants();queueMicrotask(resolve);return 0;};
  globalThis.fetch=async(url,init)=>{
   if(url==='/api/credits'){credits++;return Response.json({grant:'same-private-grant'});}
   if(String(url).startsWith('https://menorpreco.')){official++;if(scenario==='direct')return Response.json({categorias:[]});throw new TypeError('CORS');}
   server++;assert.equal(url,'/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7');assert.equal(init.headers['x-search-grant'],'same-private-grant');
   if(scenario==='empty'||server===2&&['success','legacy'].includes(scenario))return Response.json({categorias:[]});
   if(scenario==='unauthorized'||server===2&&scenario==='retry-auth')return Response.json({error:'Unauthorized'},{status:401});
   if(server===2&&scenario==='retry-network')throw new TypeError('Offline');
   if(scenario==='unrelated')return Response.json({error:'Other failure'},{status:502});
   return Response.json({error:message,...(scenario==='legacy'?{}:{code:'PARANA_CATEGORIES_UNAVAILABLE'})},{status:502});
  };
  const operation=()=>creditFetch('/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7',false,status=>progress.push(status));
  if(scenario==='retry-network')await assert.rejects(operation,/Offline/);else{
   const response=await operation();const status=['success','legacy','empty','direct'].includes(scenario)?200:['unauthorized','retry-auth'].includes(scenario)?401:502;
   assert.equal(response.status,status);
  }
  const eligible=['success','permanent','legacy','retry-network','retry-auth','cancelled'].includes(scenario);
  assert.deepEqual(delays,eligible?[6000]:[]);
  assert.deepEqual(progress,eligible?(scenario==='cancelled'?['waiting','done']:['waiting','retrying','done']):[]);
  assert.equal(credits,1);assert.equal(official,1);assert.equal(server,scenario==='direct'?0:eligible&&scenario!=='cancelled'?2:1);
 }
}finally{globalThis.setTimeout=originalTimer;clearGrants();}
console.log('PASS: one category retry at 6000 ms, visible waiting/retrying/completion states, same parameters/grant/credit, no loop or retry for other failures, cancellation after grant clear.');
