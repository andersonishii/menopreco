import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync('app/page.tsx','utf8');
const code=stripTypeScriptTypes(source.slice(source.indexOf('async function load('),source.indexOf('const conflicts=')));
for(const fail of [false,true]){
 const state={products:[{id:'old',valor:'10'}],priceRange:{min:'5',max:'30'},offset:150,requestOrder:'0',queriedOrders:['0']};
 const context={busy:false,requestOrder:'0',sort:'3',term:'sapato',city:{uf:'PR'},mode:'description',priceRange:state.priceRange,
  localOnlyOrder:()=>false,paranaRequestOrder:v=>v,paranaRangeParams:()=>({}),paranaPage:()=>({nextOffset:50,hasMore:true}),paranaPriceRange:v=>v,latestStoreOffers:v=>v,uniqueOffers:v=>v,
  query:async()=>{if(fail)throw Error('offline');return {produtos:[{id:'new',valor:'30'}],precos:state.priceRange};}};
 for(const name of ['FailedRefresh','FailedPage','Category','Step','Error','Busy','LastLoadedOffset','PriceRange','OfferOrders','Products','Offset','More','RequestOrder','QueriedOrders']){
  const key=name[0].toLowerCase()+name.slice(1);context['set'+name]=v=>state[key]=typeof v==='function'?v(state[key]):v;
 }
 const load=new Function(...Object.keys(context),code+';return load;')(...Object.values(context));
 await load(null,0,'3','sapato',true);
 assert.deepEqual(state.products.map(o=>o.id),fail?['old']:['old','new']);
 assert.equal(state.offset,fail?150:50);
 assert.equal(state.requestOrder,fail?'0':'3');
 assert.deepEqual(state.queriedOrders,fail?['0']:['0','3']);
 assert.equal(state.failedRefresh,fail?'3':null);
}
console.log('PASS: supplemental fetch merges offers; failure preserves offers/cursor/order and can retry.');
