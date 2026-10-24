import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('app/page.tsx','utf8');
const code=source.slice(source.indexOf('function localOnlyOrder'),source.indexOf('type Product=Offer;')).replace('value:string','value');
const isLocal=new Function(code+';return localOnlyOrder;')();
assert.equal(isLocal('discount'),true);assert.equal(isLocal('offers-asc'),true);assert.equal(isLocal('1'),false);
const start=source.slice(source.indexOf('const options='),source.indexOf('const resultOptions='));assert.ok(!start.includes("value:'discount'"));
assert.ok(source.includes("const resultOptions=[...options,{value:'discount'"));
const handler=source.slice(source.indexOf('function changeOrder'),source.indexOf('function changeMode')).replace('value:string','value');
const makeHandler=new Function('context', 'const {busy,setSort,setOfferOrders,step,city,load,category}=context;'+code+';'+handler+';return changeOrder;');
for(const value of ['0','1','2','3','recent-day','discount','offers-asc','offers-desc']){
 const calls=[],category={id:37};let selected;
 const change=makeHandler({busy:false,step:3,city:{uf:'PR'},category,setSort:value=>selected=value,setOfferOrders:()=>{},load:(...args)=>calls.push(args)});
 change(value);assert.equal(selected,value);
 assert.deepEqual(calls,isLocal(value)?[]:[[category,0,value]]);
}
for(const context of [{busy:true,step:3,city:{uf:'PR'}},{busy:false,step:1,city:{uf:'PR'}},{busy:false,step:3,city:{uf:'SC'}}]){
 const calls=[];makeHandler({...context,category:{id:37},setSort:()=>{},setOfferOrders:()=>{},load:(...args)=>calls.push(args)})('3');assert.equal(calls.length,0);
}
console.log('PASS: filtros oficiais atualizam a busca na página zero; desconto e contagem continuam locais; estados, categoria e bloqueio durante busca respeitados.');
