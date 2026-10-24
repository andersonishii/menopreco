import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
clearGrants();let credits=0;const urls=[];
const offer={gtin:'7909989354513',desc:'Produto',valor:'10',datahora:'2026-01-02T12:00:00Z',estabelecimento:{nm_emp:'Loja',nm_logr:'Rua A',nr_logr:'1',mun:'Curitiba',uf:'PR'}};
globalThis.fetch=async(url,init)=>{
 if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
 const target=new URL(url);urls.push(target);assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');
 assert.equal(init.credentials,'omit');assert.deepEqual(init.headers,{Accept:'application/json, text/plain, */*'});
 return Response.json(target.pathname.endsWith('/categorias')?{categorias:[{id:37,desc:'Vestuário',qtd:60}]}:{local:'6gkzqf9vb',produtos:[{...offer,id:'old',datahora:'2026-01-01T12:00:00Z'},{...offer,id:'current'}],total:60,precos:{min:'10',max:'20'}});
};
await creditFetch('/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7');
const first=await(await creditFetch('/api/produtos?local=6gkzqf9vb&termo=feminino&categoria=37&raio=7&offset=0&ordem=0&expand=1')).json();
await creditFetch('/api/produtos?local=6gkzqf9vb&termo=feminino&categoria=37&raio=7&offset=50&ordem=0&valor_min=10&valor_max=20');
assert.equal(credits,1);assert.equal(urls.length,3);assert.equal(first.sourceCount,2);assert.equal(first.produtos.length,1);assert.equal(first.produtos[0].id,'current');assert.equal(first.produtos[0].historyUnavailable,true);
assert.equal(urls[1].searchParams.has('expand'),false);assert.equal(urls[2].searchParams.get('valor_min'),'10');
for(const order of ['0','1','2','3'])for(const type of ['barcode','fuel']){
 clearGrants();globalThis.fetch=async(url,init)=>{
  if(url==='/api/credits')return Response.json({grant:'private'});
  const query=new URL(url);assert.equal(query.origin,'https://menorpreco.notaparana.pr.gov.br');assert.equal(query.searchParams.get('ordem'),order);assert.equal(query.searchParams.get('offset'),'50');assert.equal(query.searchParams.get('data'),'3');assert.equal(init.credentials,'omit');return Response.json({local:'6gkzqf9vb',produtos:[]});
 };
 assert.equal((await creditFetch('/api/produtos?local=6gkzqf9vb&raio=7&offset=46&ordem='+order+'&'+(type==='barcode'?'gtin=7909989354513':'tp_comb=1'))).status,200);
}
clearGrants();let publicCalls=0;
globalThis.fetch=async url=>{if(url==='/api/credits')return Response.json({grant:'private'});assert.ok(String(url).startsWith('https://menorpreco.'));publicCalls++;throw new TypeError('CORS');};
assert.equal((await creditFetch('/api/produtos?local=6gkzqf9vb&gtin=7909989354513')).status,502);assert.equal(publicCalls,1);
clearGrants();globalThis.fetch=async url=>{assert.equal(url,'/api/credits');return Response.json({error:'Sem saldo'},{status:402});};
await assert.rejects(()=>creditFetch('/api/categorias?local=6gkzqf9vb&termo=arroz'),/Sem saldo/);
clearGrants();globalThis.fetch=async(url,init)=>{if(url==='/api/credits')return Response.json({grant:'national'});assert.ok(String(url).startsWith('/api/brasil/produtos?'));assert.equal(init.headers['x-search-grant'],'national');return Response.json({produtos:[]});};
assert.equal((await creditFetch('/api/brasil/produtos?local=6gkzqf9vb&uf=SC&latitude=-27&longitude=-48&termo=arroz')).status,200);
console.log('PASS: all Parana searches call official API only, reuse credits, preserve orders/pages/ranges/latest notes, omit credentials, never fall back to removed routes; national route unchanged.');
