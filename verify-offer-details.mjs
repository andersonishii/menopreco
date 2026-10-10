import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
const {fullAddress,recentPriceOrder,differentDailyPrices,priceSummary,fuelPriceVariations}=await import('./lib/offer-details.ts');
const store={cnpj:'branch-1',tp_logr:'Rua',nm_logr:'Teste',nr_logr:'100',bairro:'Centro',mun:'Curitiba',cep:'80000-000'};
assert.equal(fullAddress(store),'Rua Teste 100 · Centro · Curitiba / PR · CEP 80000-000');assert.equal(fullAddress(),'Endereço não informado');
const offer=(id,price,date,branch=store,gtin='7898024394938')=>({id,gtin,valor_tabela:String(price),datahora:date,estabelecimento:branch});
const a=offer('a',20,'2026-10-10T10:00:00-03:00'),b=offer('b',10,'2026-10-10T08:00:00-03:00'),old=offer('old',5,'2026-10-09T23:00:00-03:00');
assert.deepEqual([old,a,b].sort(recentPriceOrder).map(p=>p.id),['b','a','old']);
const other=offer('other',7,a.datahora,{...store,cnpj:'branch-2'}),different=offer('different',7,a.datahora,store,'7909883577186');
assert.deepEqual([...differentDailyPrices([a,b,old,other,different])].sort(),['a','b']);
assert.equal(differentDailyPrices([a,{...a,id:'same-price'}]).size,0);
assert.equal(differentDailyPrices([a,offer('next-day',7,'2026-10-11T03:00:00Z')]).size,0);
console.log('OK: dia em Brasília, menor preço no mesmo dia, endereço e alertas sem misturar produto/loja/dia.');

assert.deepEqual(priceSummary([{valor_tabela:'10'},{valor_tabela:'20'},{valor_tabela:'30'},{valor_tabela:'invalid'},{valor_tabela:''}]),{min:10,max:30,average:20,count:3});assert.equal(priceSummary([]),null);

const fuelLow={...b,desc:'GASOLINA COMUM',gtin:undefined,datahora:undefined};const fuelHigh={...a,desc:'GASOLINA',gtin:undefined,datahora:undefined};assert.deepEqual([...fuelPriceVariations([fuelLow,fuelHigh,other]).keys()].sort(),['a','b']);assert.deepEqual(fuelPriceVariations([fuelLow,fuelHigh]).get('b'),{min:10,max:20});assert.equal(fuelPriceVariations([fuelLow,{...fuelLow,id:'same'}]).size,0);
