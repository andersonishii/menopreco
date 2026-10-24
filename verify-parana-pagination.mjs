import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
const {paranaPage,restoredParanaOffset}=await import('./lib/parana-response.ts');
assert.deepEqual(paranaPage(0,{produtos:Array(32),total:217}),{nextOffset:50,hasMore:true});
assert.deepEqual(paranaPage(50,{produtos:Array(32),total:'217'}),{nextOffset:100,hasMore:true});
assert.deepEqual(paranaPage(100,{produtos:Array(30),total:217}),{nextOffset:150,hasMore:true});
assert.deepEqual(paranaPage(200,{produtos:Array(7),total:217}),{nextOffset:250,hasMore:false});
assert.equal(paranaPage(0,{produtos:[{}],sourceCount:50,total:100}).hasMore,true);
assert.equal(paranaPage(0,{produtos:[],total:0}).hasMore,false);
assert.equal(paranaPage(0,{produtos:Array(32)}).hasMore,true);
assert.equal(paranaPage(50,{produtos:[]}).hasMore,false);
// Exercise three official barcode pages through the actual credit client.
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');clearGrants();
let credits=0;const offsets=[];
globalThis.fetch=async(url,init)=>{
 if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
 const query=new URL(url);assert.equal(query.origin,'https://menorpreco.notaparana.pr.gov.br');
 const offset=Number(query.searchParams.get('offset'));offsets.push(offset);
 assert.equal(query.searchParams.get('ordem'),'2');assert.equal(query.searchParams.get('raio'),'7');
 assert.equal(init.headers['x-search-grant'],undefined);
 return Response.json({local:'6gkzqf9vb',total:117,produtos:Array.from({length:offset===100?7:32},(_,index)=>({id:offset+':'+index,gtin:'7909989354513',valor:'10'}))});
};
let offset=0,more=true;
while(more){const data=await(await creditFetch('/api/produtos?local=6gkzqf9vb&raio=7&gtin=7909989354513&ordem=2&offset='+offset)).json();const page=paranaPage(offset,data);offset=page.nextOffset;more=page.hasMore;assert.ok(offset<=150);}
assert.deepEqual(offsets,[0,50,100]);assert.equal(credits,1);
console.log('PASS: fixed 50-position pages, partial payloads, filtered offers, end detection, stable filters and one credit across barcode pages.');

for(const offset of [46,50,92,100,138])assert.equal(restoredParanaOffset({offset},true),50);
assert.equal(restoredParanaOffset({paginationVersion:1,lastLoadedOffset:0,offset:100},true),50);
assert.equal(restoredParanaOffset({paginationVersion:1,lastLoadedOffset:50,offset:999},true),100);
assert.equal(restoredParanaOffset({paginationVersion:1,lastLoadedOffset:100},true),150);
assert.equal(restoredParanaOffset({paginationVersion:1,lastLoadedOffset:46},true),50);
assert.equal(restoredParanaOffset({paginationVersion:1,lastLoadedOffset:null},true),50);
assert.equal(restoredParanaOffset({},false),0);
console.log('PASS: first continuation is 50 for fresh and legacy caches; verified completed pages alone restore 100 or 150.');
