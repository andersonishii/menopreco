import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
const {needsOrderRefresh}=await import('./lib/result-order.ts');
const source=fs.readFileSync('app/page.tsx','utf8');
const offers=[{id:'a',valor:'10'},{id:'b',valor:'20'}];
const range={min:'5',max:'30'};
for(const order of ['1','2','recent-day','discount','offers-asc','offers-desc'])assert.equal(needsOrderRefresh(order,offers,range,[]),false);
for(const order of ['0','3']){
 assert.equal(needsOrderRefresh(order,offers,null,[]),false);
 assert.equal(needsOrderRefresh(order,offers,range,[order]),false);
 assert.equal(needsOrderRefresh(order,offers,range,[]),true);
 assert.equal(needsOrderRefresh(order,offers,{min:'10',max:'20'},[]),false);
}
const handler=source.slice(source.indexOf('function changeOrder'),source.indexOf('function changeMode')).replace('value:string','value');
const makeHandler=new Function('context','const {busy,setSort,setOfferOrders,step,products,priceRange,queriedOrders,needsOrderRefresh,load,category,term}=context;'+handler+';return changeOrder;');
for(const bounds of [null,range,{min:'10',max:'20'}])for(const order of ['0','1','2','3','recent-day','discount','offers-asc']){
 let selected;const calls=[];const category={id:37};
 makeHandler({busy:false,step:3,products:offers,priceRange:bounds,queriedOrders:[],needsOrderRefresh,term:'sapato',category,setSort:v=>selected=v,setOfferOrders:()=>{},load:(...args)=>calls.push(args)})(order);
 assert.equal(selected,order);
 assert.deepEqual(calls,needsOrderRefresh(order,offers,bounds,[])?[[category,0,order,'sapato',true]]:[]);
}
assert.ok(source.includes('id="order" value={searchOrder}'));
assert.ok(source.includes('uniqueOffers(next||merge?[...old,...data.produtos]:data.produtos)'));
assert.ok(source.includes('failedRefresh||requestOrder,term,!!failedRefresh'));
console.log('PASS: local result ordering, authoritative bounds, one supplemental fetch per order, independent search selector, merge and retry.');
