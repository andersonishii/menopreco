const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loader,offer}=require('../helpers.cjs');
const load=loader();
const {offerPrice,offerDiscount,unusuallyLowPrices}=load('lib/offer-price.ts');
const {uniqueOffers,normalizedGtin}=load('lib/description-offers.ts');
const {latestStoreOffers}=load('lib/latest-offers.ts');
const {groupOffers,orderProductOffers,distancePriceOrder}=load('lib/product-groups.ts');
const {chooseShoppingOffer,saleDay}=load('lib/shopping-price.ts');
const {recentFuelOffers,fuelWithinRadius,fuelPriceDistanceOrder}=load('lib/fuel-order.ts');
const {needsOrderRefresh}=load('lib/result-order.ts');
const {historyChange}=load('lib/price-history.ts');
const {hasDeviceLocation,productEndpoint,locationParams}=load('lib/location.ts');
for(const [fields,price,discount] of [
 [{valor:'20.15',valor_tabela:'22.90',valor_desconto:'2.75'},20.15,2.75],
 [{valor_tabela:'22.90',valor_desconto:'2.75'},20.15,2.75],
 [{valor_tabela:'10'},10,0],[{valor:'0',valor_tabela:'10',valor_desconto:'10'},0,10],
 [{valor:'10',valor_tabela:'10',valor_desconto:'3'},10,0]
])test('Paid/list/discount interpretation '+JSON.stringify(fields),()=>{assert.equal(offerPrice(fields),price);assert.equal(offerDiscount(fields),discount);});
test('Invalid prices do not become valid offers',()=>assert.ok(Number.isNaN(offerPrice({valor:'no',valor_tabela:'-2'}))));
test('GTIN accepts barcode lengths, normalizes leading zeros, rejects zero and text',()=>{assert.equal(normalizedGtin('7898024394938'),'07898024394938');for(const v of ['0','00000000','abc','123'])assert.equal(normalizedGtin(v),null);});
test('Same GTIN/address/price/date deduplicates despite different ids',()=>{const a=offer('a');assert.equal(uniqueOffers([a,{...a,id:'b',gtin:'07898024394938'}]).length,1);assert.equal(uniqueOffers([a,{...a,id:'c',valor:'9'}]).length,2);});
test('Latest invoice wins per product/store; old prices do not replace the current price',()=>{const old=offer('old','1',{datahora:'2026-01-01T12:00:00Z'}),current=offer('current','20');assert.deepEqual(latestStoreOffers([old,current]).map(x=>x.id),['current']);assert.equal(latestStoreOffers([current,{...old,estabelecimento:{...old.estabelecimento,nr_logr:'11'}}]).length,2);});
test('Different prices at identical invoice time remain visible',()=>assert.equal(latestStoreOffers([offer('a'),offer('b','9')]).length,2));
test('Group same GTIN and preserve products without valid GTIN',()=>{const groups=groupOffers([offer('a'),offer('b','9',{gtin:'07898024394938'}),offer('x','3',{gtin:''}),offer('y','4',{gtin:''})]);assert.equal(groups.length,3);assert.equal(groups[0].offers.length,2);});
for(const order of ['0','3','2'])test('Local ordering '+order+' does not mutate loaded results',()=>{const data=[offer('a','10'),offer('b','20',{datahora:'2026-01-03T12:00:00Z'})],before=JSON.stringify(data);assert.equal(orderProductOffers(data,order)[0].id,order==='0'?'a':'b');assert.equal(JSON.stringify(data),before);});
test('Commercial benefit warning targets unusually low prices of same GTIN',()=>assert.ok(unusuallyLowPrices([offer('cheap','1'),offer('normal','10')]).has('cheap')));
test('Equal shopping prices favor nearest store',()=>{const far=offer('far','10',{distkm:'5'}),near=offer('near','10',{distkm:'1'});assert.equal(chooseShoppingOffer([far,near],near.gtin,'cheapest').offer.id,'near');});
test('Recent shopping uses latest sale day and then lowest price',()=>{const old=offer('old','1',{datahora:'2026-01-01T12:00:00Z'}),today=offer('today','9');assert.equal(chooseShoppingOffer([old,today],today.gtin,'recent',new Date('2026-01-02T23:00:00Z')).offer.id,'today');});
test('Brazilian calendar boundary uses Sao Paulo timezone',()=>assert.equal(saleDay('2026-01-02T01:00:00Z'),'2026-01-01'));
test('Fuel radius removes outside/unknown distances; price ascending within radius',()=>{const data=[offer('far','1',{distkm:'1.48'}),offer('near','8',{distkm:'.52'}),offer('cheap','7',{distkm:'.9'}),offer('unknown','1',{distkm:''})];assert.deepEqual(fuelWithinRadius(data,1).sort(fuelPriceDistanceOrder).map(x=>x.id),['cheap','near']);});
test('Fuel recent-day fallback excludes future notes and prefers lower price',()=>{const data=[offer('old','1',{datahora:'2026-01-01T12:00:00Z'}),offer('now','8'),offer('future','1',{datahora:'2027-01-01T12:00:00Z'})];assert.deepEqual(recentFuelOffers(data,new Date('2026-01-03T12:00:00Z')).offers.map(x=>x.id),['now']);});
for(const [current,previous,kind] of [[9,10,'down'],[11,10,'up'],[10,10,'same']])test('History trend '+kind,()=>assert.equal(historyChange(current,{points:[{price:previous}],hasNewer:false}).kind,kind));
test('History first/older states',()=>{assert.equal(historyChange(10,{points:[],hasNewer:false}).kind,'first');assert.equal(historyChange(10,{points:[],hasNewer:true}).kind,'older');});
for(const order of ['1','2','recent-day','discount','offers-asc','offers-desc'])test('No endpoint for local result ordering '+order,()=>assert.equal(needsOrderRefresh(order,[offer('a')],{min:'1',max:'100'},[]),false));
for(const order of ['0','3'])test('Refresh '+order+' only with missing authoritative extreme; never repeatedly',()=>{const rows=[offer('a','10'),offer('b','20')];assert.equal(needsOrderRefresh(order,rows,null,[]),false);assert.equal(needsOrderRefresh(order,rows,{min:'10',max:'20'},[]),false);assert.equal(needsOrderRefresh(order,rows,{min:'1',max:'100'},[]),true);assert.equal(needsOrderRefresh(order,rows,{min:'1',max:'100'},[order]),false);});
test('GPS is required for distance filters; municipality coordinates alone are insufficient',()=>{const city={name:'City',uf:'SC',latitude:-27,longitude:-48,geohash:'6gkzqf9vb'};assert.equal(hasDeviceLocation(city),false);assert.equal(hasDeviceLocation({...city,device:true}),true);assert.equal(hasDeviceLocation({...city,device:true,latitude:NaN}),false);assert.equal(productEndpoint(city),'/api/brasil/produtos');assert.equal(productEndpoint({...city,uf:'PR'}),'/api/produtos');assert.deepEqual(locationParams({...city,uf:'PR'}),{});});
test('Cache expires after 30 minutes and remains isolated by user',()=>{const map=new Map();global.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const cache=load('lib/saved-results.ts');cache.writeSavedResults('user:a',{term:'arroz'});assert.equal(cache.readSavedResults('user:a').data.term,'arroz');assert.equal(cache.readSavedResults('user:b'),null);cache.writeSavedResults('old',{term:'x'},Date.now()-30*60000-1);assert.equal(cache.readSavedResults('old'),null);delete global.localStorage;});

test('Distance shopping always favors closest even if a legacy tolerance argument is supplied',()=>{const near=offer('near','20',{distkm:'1'}),far=offer('far-cheap','1',{distkm:'2'});assert.equal(chooseShoppingOffer([far,near],near.gtin,'distance',new Date('2026-01-03'),20).offer.id,'near');});
