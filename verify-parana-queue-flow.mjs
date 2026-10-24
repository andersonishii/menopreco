import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
globalThis.location={origin:'https://site.example'};globalThis.window=new EventTarget();
const {creditFetch,clearGrants}=await import('./lib/credit-client.ts');clearGrants();
let active=0,maximum=0,credits=0;const requests=[],starts=[],ends=[];
globalThis.fetch=async(url,init)=>{
 if(url==='/api/credits'){credits++;return Response.json({grant:'private'});}
 const target=new URL(url);assert.equal(target.origin,'https://menorpreco.notaparana.pr.gov.br');assert.equal(init.credentials,'omit');active++;maximum=Math.max(maximum,active);requests.push(target);starts.push(Date.now());
 await new Promise(resolve=>setTimeout(resolve,5));active--;ends.push(Date.now());
 return Response.json(target.pathname.endsWith('/categorias')?{categorias:[]}:{local:'6gkzqf9vb',produtos:[],total:0});
};
const category='/api/categorias?local=6gkzqf9vb&termo=feminino&raio=7',products='/api/produtos?local=6gkzqf9vb&termo=feminino&categoria=37&offset=0&raio=7&ordem=0';
const results=await Promise.all([creditFetch(category),creditFetch(products),creditFetch(products),creditFetch('/api/produtos?local=6gkzqf9vb&gtin=7909989354513&offset=0&raio=7&ordem=0')]);
assert.ok(results.every(result=>result.status===200));assert.equal(requests.length,3);assert.equal(maximum,1);assert.equal(credits,2);
for(let index=1;index<starts.length;index++)assert.ok(starts[index]-ends[index-1]>=1900);
console.log('PASS: actual concurrent category/product/barcode calls are serialized with two-second gaps, identical lookups share one official request, and credit scopes remain separate.');
