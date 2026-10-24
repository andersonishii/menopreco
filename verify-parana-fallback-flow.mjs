import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');
const timer=globalThis.setTimeout;globalThis.setTimeout=(resolve)=>{queueMicrotask(resolve);return 0;};
try{
 for(const kind of ['categories','description','barcode','fuel']){
  clearGrants();let credits=0,browser=0,server=0;const progress=[],transport=[];
  const path=kind==='categories'?'/api/categorias':'/api/produtos',query=kind==='barcode'?'gtin=7909989354513':kind==='fuel'?'tp_comb=1':'termo=feminino'+(kind==='description'?'&categoria=37':'');
  globalThis.fetch=async(url,init)=>{
   if(url==='/api/credits'){credits++;return Response.json({grant:'same-grant'});}
   if(String(url).startsWith('https://menorpreco.')){transport.push('device');browser++;throw new TypeError('CORS');}
   assert.ok(String(url).startsWith('/api/parana/consulta?'));transport.push('server');server++;const p=new URL(url,location.origin).searchParams;
   assert.equal(p.get('tipo'),kind==='categories'?'categorias':'produtos');assert.equal(p.get('local'),'6gkzqf9vb');assert.equal(p.get('raio'),'7');assert.equal(p.get('offset'),'50');assert.equal(p.get('ordem'),'3');assert.equal(p.get('valor_min'),'24.99');assert.equal(init.method,'POST');assert.equal(init.headers['x-search-grant'],'same-grant');assert.equal(init.credentials,'same-origin');
   return Response.json(kind==='categories'?{categorias:[]}:{produtos:[],sourceCount:0,total:0});
  };
  const connected=await creditFetch(path+'?local=6gkzqf9vb&raio=7&offset=50&ordem=3&valor_min=24.99&valor_max=1499&'+query,false,status=>progress.push(status));assert.equal(connected.status,200);assert.equal(connected.headers.get('X-Preco-Perto-Connection'),'server');
  assert.equal(browser,1);assert.equal(server,1);assert.equal(credits,1);assert.deepEqual(progress,['device','server','done']);assert.deepEqual(transport,['device','server']);
 }
 for(const failure of ['inconsistent','busy','server-failed']){
  clearGrants();let browser=0,server=0;
  globalThis.fetch=async(url)=>{
   if(url==='/api/credits')return Response.json({grant:'grant'});
   if(String(url).startsWith('https://menorpreco.')){browser++;if(failure==='server-failed')throw new TypeError('CORS');return failure==='busy'?Response.json({},{status:429}):Response.json({local:'',produtos:[{gtin:'7909989354513'}]});}
   assert.ok(String(url).startsWith('/api/parana/consulta?'));server++;return Response.json({error:'Unavailable'},{status:503});
  };
  const result=await creditFetch('/api/produtos?local=6gkzqf9vb&gtin=7909989354513');assert.equal(result.status,failure==='inconsistent'?502:503);assert.equal(browser,1);assert.equal(server,failure==='server-failed'?1:0);
 }
 clearGrants();let browser=0,server=0,credits=0;const delays=[],retryTransport=[];
 globalThis.setTimeout=(resolve,ms)=>{delays.push(ms);queueMicrotask(resolve);return 0;};
 globalThis.fetch=async(url)=>{
  if(url==='/api/credits'){credits++;return Response.json({grant:'same'});}
  if(String(url).startsWith('https://menorpreco.')){retryTransport.push('device');browser++;if(browser===1)throw new TypeError('CORS');return Response.json({local:'6gkzqf9vb',produtos:[]});}
  assert.ok(String(url).startsWith('/api/parana/consulta?'));retryTransport.push('server');server++;
  return server===1?Response.json({error:'Busy',upstreamStatus:500},{status:502}):Response.json({produtos:[]});
 };
 const query='/api/produtos?local=6gkzqf9vb&gtin=7909989354513';
 assert.equal((await creditFetch(query)).status,200);assert.equal(browser,2);assert.equal(server,1);assert.equal(credits,1);assert.deepEqual(retryTransport,['device','server','device']);assert.deepEqual(delays.filter(ms=>ms>=6000),[8000]);
 const directAgain=await creditFetch(query);assert.equal(directAgain.status,200);assert.equal(directAgain.headers.get('X-Preco-Perto-Connection'),'device');assert.equal(browser,3);assert.equal(server,1);
 clearGrants();const categoryTransport=[],categoryDelays=[];let categoryCredits=0;
 globalThis.setTimeout=(resolve,ms)=>{categoryDelays.push(ms);queueMicrotask(resolve);return 0;};
 globalThis.fetch=async(url)=>{
  if(url==='/api/credits'){categoryCredits++;return Response.json({grant:'same'});}
  if(String(url).startsWith('https://menorpreco.')){categoryTransport.push('device');if(categoryTransport.length===1)throw new TypeError('CORS');return Response.json({categorias:[]});}
  assert.ok(String(url).startsWith('/api/parana/consulta?'));categoryTransport.push('server');return Response.json({code:'PARANA_CATEGORIES_UNAVAILABLE'},{status:502});
 };
 const categoryResult=await creditFetch('/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7');assert.equal(categoryResult.status,200);assert.equal(categoryResult.headers.get('X-Preco-Perto-Connection'),'device');assert.deepEqual(categoryTransport,['device','server','device']);assert.deepEqual(categoryDelays.filter(ms=>ms>=6000),[6000]);assert.equal(categoryCredits,1);
}finally{globalThis.setTimeout=timer;clearGrants();}
console.log('PASS: CORS/network failure switches only that query to Render, preserves all parameters/grant/credit and progress, never falls back for invalid data or explicit throttling, and stops when server fails.');
