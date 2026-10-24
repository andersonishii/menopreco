import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
for(const blocked of [false,true]){
 clearGrants();let credits=0,server=0;
 globalThis.fetch=async(url,init)=>{
  if(url==='/api/credits'){credits++;return Response.json({grant:'private-grant'})}
  if(String(url).startsWith('https://menorpreco.')){assert.equal(init.credentials,'omit');assert.equal(init.headers['x-search-grant'],undefined);assert.equal(new URL(url).searchParams.get('local'),'6gf0ffq61');if(blocked)throw new TypeError('Failed to fetch');return Response.json({categorias:[]})}
  server++;assert.equal(init.headers['x-search-grant'],'private-grant');return Response.json({categorias:[]});
 };
 assert.equal((await creditFetch('/api/categorias?local=6gf0ffq61&termo=arroz&raio=20')).status,200);
 assert.equal(credits,1);assert.equal(server,blocked?1:0);
}
clearGrants();globalThis.fetch=async url=>{assert.equal(url,'/api/credits');return Response.json({error:'Sem saldo'},{status:402})};
await assert.rejects(()=>creditFetch('/api/categorias?local=6gf0ffq61&termo=arroz&raio=20'),/Sem saldo/);
console.log('OK: navegador primeiro, CORS usa servidor sem outro crÃ©dito, nenhum grant externo, saldo obrigatÃ³rio.');

clearGrants();let expansionCredits=0,expansionRequests=0;globalThis.fetch=async url=>{if(url==='/api/credits'){expansionCredits++;return Response.json({grant:'description-grant'});}assert.ok(String(url).startsWith('/api/produtos?'));expansionRequests++;return Response.json({produtos:[]});};
await creditFetch('/api/produtos?local=6gf0ffq61&termo=arroz&categoria=1&raio=5&expand=1');await creditFetch('/api/produtos?local=6gf0ffq61&termo=arroz&categoria=1&raio=5&offset=20&expand=1');assert.equal(expansionCredits,1);assert.equal(expansionRequests,2);console.log('PASS: enriquecimento no servidor e paginaÃ§Ã£o usam o mesmo crÃ©dito da descriÃ§Ã£o.');

clearGrants();let historyProductCalls=0;
globalThis.fetch=async(url,init)=>{if(url==='/api/credits')return Response.json({grant:'history-grant'});assert.ok(String(url).startsWith('/api/produtos?'));assert.equal(init.headers['x-search-grant'],'history-grant');historyProductCalls++;return Response.json({produtos:[]});};
await creditFetch('/api/produtos?local=6gf0ffq61&gtin=7891234567895&raio=5');assert.equal(historyProductCalls,1);
console.log('PASS: produtos passam pelo servidor para gravar histÃ³rico confiÃ¡vel, sem receber preÃ§os enviados pelo navegador.');

for(const scenario of ['barcode','description','invalid','offline','auth','processing','national']){
 clearGrants();let credits=0,directCalls=0;
 const local='6gkzquw8e',gtin='7898024394938';
 globalThis.fetch=async(url,init)=>{
  if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
  if(String(url).startsWith('https://menorpreco.')){
   directCalls++;assert.equal(new URL(url).searchParams.get('data'),'3');assert.equal(new URL(url).searchParams.get('ordem'),'0');assert.equal(init.credentials,'omit');assert.deepEqual(init.headers,{Accept:'application/json'});
   if(scenario==='offline')throw new TypeError('CORS');
   return Response.json({local:scenario==='invalid'?'':local,produtos:[{gtin,desc:'Kinder',valor:'5.99'}]});
  }
  return Response.json({error:'Consulta indisponível',code:scenario==='processing'?'PARANA_PROCESSING_FAILED':'PARANA_UPSTREAM_UNAVAILABLE'},{status:scenario==='auth'?403:502});
 };
 const query=scenario==='description'?'termo=kinder&categoria=1':'gtin='+gtin;
 const result=await creditFetch('/api/produtos?local='+local+'&'+query+(scenario==='national'?'&uf=SC':''));
 const recovered=['barcode','description'].includes(scenario);
 assert.equal(result.status,recovered?200:scenario==='auth'?403:502);
 assert.equal(credits,1);assert.equal(directCalls,['auth','processing','national'].includes(scenario)?0:1);
 if(recovered){const body=await result.json();assert.equal(body.sourceCount,1);assert.equal(body.produtos[0].historyUnavailable,true);}
}
console.log('PASS: recuperação PR validada, sem novo crédito ou credenciais externas; falhas de autorização, processamento e outros estados não usam recuperação.');
