import assert from 'node:assert/strict';
import {GET as categoriesGET} from './app/api/categorias/route.ts';
import {GET as productsGET} from './app/api/produtos/route.ts';
async function GET(request,context){return (await context.params).kind==='categorias'?categoriesGET(request):productsGET(request);}
const original=globalThis.fetch;
let called;
globalThis.fetch=async url=>{called=new URL(url);return Response.json([{id:6,desc:'Cereais',qtd:13139}]);};
let result=await GET(new Request('http://localhost/api/categorias?termo=arroz%20integral'),{params:Promise.resolve({kind:'categorias'})});
assert.equal(result.status,200);assert.equal(called.searchParams.get('termo'),'arroz integral');assert.equal(called.searchParams.get('raio'),'22');
result=await GET(new Request('http://localhost/api/produtos?termo=arroz&categoria=6&offset=50'),{params:Promise.resolve({kind:'produtos'})});
assert.equal(result.status,200);assert.equal(called.searchParams.get('categoria'),'6');assert.equal(called.searchParams.get('offset'),'50');assert.equal(called.searchParams.get('raio'),'22');assert.equal(called.searchParams.has('valor_min'),false);assert.equal(called.searchParams.get('local'),'6gkzq99z5j5f');
result=await GET(new Request('http://localhost/api/produtos?termo=arroz&categoria=abc'),{params:Promise.resolve({kind:'produtos'})});assert.equal(result.status,400);
globalThis.fetch=async()=>{throw new Error('offline');};result=await GET(new Request('http://localhost/api/categorias?termo=arroz'),{params:Promise.resolve({kind:'categorias'})});assert.equal(result.status,502);
for(const order of ['0','1','2','3']){globalThis.fetch=async url=>{called=new URL(url);return Response.json({produtos:[]});};result=await GET(new Request('http://localhost/api/produtos?termo=arroz&categoria=6&offset=0&ordem='+order),{params:Promise.resolve({kind:'produtos'})});assert.equal(result.status,200);assert.equal(called.searchParams.get('ordem'),order);}
result=await GET(new Request('http://localhost/api/produtos?termo=arroz&categoria=6&ordem=9'),{params:Promise.resolve({kind:'produtos'})});assert.equal(result.status,400);
globalThis.fetch=original;console.log('PASS: termo, categoria, paginação, filtros e falha de conexão.');


