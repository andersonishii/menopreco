import assert from 'node:assert/strict';
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
console.log('OK: navegador primeiro, CORS usa servidor sem outro crédito, nenhum grant externo, saldo obrigatório.');

clearGrants();let expansionCredits=0,expansionRequests=0;globalThis.fetch=async url=>{if(url==='/api/credits'){expansionCredits++;return Response.json({grant:'description-grant'});}assert.ok(String(url).startsWith('/api/produtos?'));expansionRequests++;return Response.json({produtos:[]});};
await creditFetch('/api/produtos?local=6gf0ffq61&termo=arroz&categoria=1&raio=5&expand=1');await creditFetch('/api/produtos?local=6gf0ffq61&termo=arroz&categoria=1&raio=5&offset=20&expand=1');assert.equal(expansionCredits,1);assert.equal(expansionRequests,2);console.log('PASS: enriquecimento no servidor e paginação usam o mesmo crédito da descrição.');
