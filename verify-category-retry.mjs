import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const timer=globalThis.setTimeout;
try{
 for(const scenario of ['success','permanent','empty','auth','rejected','cancelled']){
  clearGrants();let credits=0,official=0;const delays=[],progress=[];
  globalThis.setTimeout=(resolve,ms)=>{delays.push(ms);if(scenario==='cancelled')clearGrants();queueMicrotask(resolve);return 0;};
  globalThis.fetch=async(url,init)=>{
   if(url==='/api/credits'){credits++;return scenario==='auth'?Response.json({error:'Sessão expirada'},{status:401}):Response.json({grant:'private'});}
   const target=new URL(url);assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');assert.equal(target.searchParams.get('termo'),'feminino');assert.equal(init.credentials,'omit');official++;
   if(scenario==='empty'||scenario==='success'&&official===2)return Response.json({categorias:[]});
   return Response.json({error:'Service error'},{status:scenario==='rejected'?403:502});
  };
  const operation=()=>creditFetch('/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7',false,status=>progress.push(status));
  if(scenario==='auth')await assert.rejects(operation,/Sessão expirada/);else assert.equal((await operation()).status,['success','empty'].includes(scenario)?200:502);
  const retry=['success','permanent','cancelled'].includes(scenario);
  assert.deepEqual(delays.filter(ms=>ms>=6000),retry?[6000]:[]);assert.deepEqual(progress.filter(value=>value!=='device'),retry?scenario==='cancelled'?['waiting','done']:['waiting','retrying','done']:[]);
  assert.equal(credits,1);assert.equal(official,scenario==='auth'?0:retry&&scenario!=='cancelled'?2:1);
 }
}finally{globalThis.setTimeout=timer;clearGrants();}
console.log('PASS: categories retry official API once after 6000 ms, show progress, reuse one credit and stop after failure or grant cancellation; no local search proxy.');
