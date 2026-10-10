import assert from 'node:assert/strict';
import {GET} from './app/api/produtos/route.ts';
let called;globalThis.fetch=async request=>{called=new URL(request.url);return Response.json({produtos:[]})};
for(const fuel of ['1','2','3','4','5'])for(const ordem of ['0','1','2','3']){const response=await GET(new Request('http://localhost/api/produtos?'+new URLSearchParams({local:'6gf0ffq61',tp_comb:fuel,ordem,offset:'50'})));assert.equal(response.status,200);for(const [key,value] of Object.entries({local:'6gf0ffq61',tp_comb:fuel,ordem,offset:'50',raio:'7',data:'3'}))assert.equal(called.searchParams.get(key),value);assert.equal(called.searchParams.has('categoria'),false);}
assert.equal((await GET(new Request('http://localhost/api/produtos?local=6gf0ffq61&tp_comb=6'))).status,400);
console.log('OK: cinco combustíveis, quatro ordenações, cidade, paginação e filtros de combustível.');
