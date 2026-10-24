import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const page=fs.readFileSync('app/page.tsx','utf8');
const code=stripTypeScriptTypes(page.slice(page.indexOf(' async function search('),page.indexOf(' async function load(')));
const names=['input','busy','city','mode','sort','requestOrder','setRestoredAt','clearGrants','setDirectOffers','setMore','setTerm','setCategories','setSort','load','setBusy','setError','setCategory','setProducts','setStep','query','readDescriptionResponse','localOnlyOrder'];
for(const uf of ['SC','RS','PR']){
 let loadCalls=0,categoryCalls=0,step=0,direct=false;
 const values=['recarga',false,{uf},'description','1','2',()=>{},()=>{},value=>{direct=value;},()=>{},()=>{},()=>{},()=>{},async(c,next,order,term)=>{assert.equal(c,null);assert.equal(order,'1');assert.equal(term,'recarga');loadCalls++;step=3;},()=>{},()=>{},()=>{},()=>{},value=>{step=value;},async(kind)=>{assert.equal(kind,'categorias');categoryCalls++;return {};},()=>({kind:'categories',categories:[]}),value=>value==='discount'||value.startsWith('offers-')];
 const search=new Function(...names,'setExpansionWarning','uniqueOffers','setCategoryProgress','setFailedPage','setPriceRange',code+';return search;')(...values,()=>{},offers=>offers,()=>{},()=>{},()=>{});await search({preventDefault(){}});
 if(uf==='PR'){assert.equal(categoryCalls,1);assert.equal(loadCalls,0);assert.equal(step,2);}else{assert.equal(categoryCalls,0);assert.equal(loadCalls,1);assert.equal(step,3);assert.equal(direct,true);}
}
console.log('PASS: SC e RS vão direto aos preços; apenas PR consulta categorias.');
