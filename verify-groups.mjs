import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
import assert from 'node:assert/strict';
const {groupOffers,distancePriceOrder}=await import('./lib/product-groups.ts');
const offer=(id,gtin,price)=>({id,gtin,valor_tabela:price,desc:'Arroz',tempo:'há uma hora',distkm:'1',estabelecimento:{nm_emp:'Mercado',bairro:'Batel',mun:'Curitiba'}});
const groups=groupOffers([offer('a','7896290300295','9.99'),offer('b','07896290300295','5.45'),offer('c','7896038321056','7'),offer('d','','4'),offer('e','0','3'),offer('f','','2')]);
assert.equal(groups.length,5);assert.deepEqual(groups[0].offers.map(o=>o.id),['b','a']);assert.equal(groups[0].gtin,'07896290300295');assert.equal(groups[2].offers.length,1);assert.equal(groups[3].gtin,null);assert.equal(groupOffers([]).length,0);
console.log('PASS: agrupamento GTIN, zeros à esquerda, preços crescentes e produtos sem GTIN separados.');

const nearby={...offer('near','7896290300295','20'),distkm:'0.5'};
const farCheap={...offer('far','7896290300295','5'),distkm:'2'};
const nearbyCheap={...offer('nearCheap','7896290300295','10'),distkm:'0.504'};
const missing={...offer('missing','7896290300295','1'),distkm:''};
assert.deepEqual([farCheap,nearby,missing,nearbyCheap].sort(distancePriceOrder).map(o=>o.id),['nearCheap','near','far','missing']);
const closest=groupOffers([farCheap,nearby]).map(g=>({...g,offers:[...g.offers].sort(distancePriceOrder)}));
assert.equal(closest[0].offers[0].id,'near');
assert.equal(distancePriceOrder(missing,{...missing}),0);
console.log('PASS: menor distância, empate na precisão exibida, distância ausente e oferta destacada.');

const {orderProductOffers}=await import('./lib/product-groups.ts');
const dated=[{...offer('cheap','7896290300295','5'),datahora:'2026-10-23T20:00:00Z'},{...offer('expensive','7896290300295','20'),datahora:'2026-10-23T21:00:00Z'},{...offer('latest','7896290300295','10'),datahora:'2026-10-24T12:00:00Z'}];
assert.deepEqual(orderProductOffers(dated,'0').map(o=>o.id),['cheap','latest','expensive']);
assert.deepEqual(orderProductOffers(dated,'3').map(o=>o.id),['expensive','latest','cheap']);
assert.deepEqual(orderProductOffers(dated,'2').map(o=>o.id),['latest','expensive','cheap']);
assert.deepEqual(dated.map(o=>o.id),['cheap','expensive','latest']);
console.log('PASS: displayed offer matches lowest price, highest price or latest sale without mutating loaded offers.');
