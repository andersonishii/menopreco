import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
const {recentFuelOffers,fuelWithinRadius,fuelPriceDistanceOrder}=await import('./lib/fuel-order.ts');
const offer=(id,price,date,dist='1')=>({id,desc:'Etanol',valor:String(price),valor_tabela:String(price),datahora:date,distkm:dist,estabelecimento:{},tempo:''});
const now=new Date('2026-10-12T20:00:00Z');
const today=[offer('old-cheap',1,'2026-10-11T15:00:00-03:00'),offer('today-expensive',4.5,'2026-10-12T14:00:00-03:00'),offer('today-cheap',3.99,'2026-10-12T12:00:00-03:00')];
assert.deepEqual(recentFuelOffers(today,now).offers.map(o=>o.id),['today-cheap','today-expensive']);
assert.equal(recentFuelOffers(today.slice(0,1),now).day,'2026-10-11');
assert.deepEqual(recentFuelOffers([offer('future',1,'2026-10-13T12:00:00-03:00'),offer('invalid',1,'invalid')],now).offers,[]);
assert.equal(recentFuelOffers([offer('far',3.99,'2026-10-12T14:00:00-03:00','10'),offer('near',3.99,'2026-10-12T12:00:00-03:00','2')],now).offers[0].id,'near');
console.log('PASS: combustível por dia mais recente, menor preço, distância no empate e data inválida/futura.');

const sample=[offer('millenium',6.74,'2026-10-12T12:00:00-03:00','0.52'),offer('maru',6.89,'2026-10-12T12:00:00-03:00','0.9'),offer('republica',6.49,'2026-10-12T12:00:00-03:00','1.48')];
assert.deepEqual(fuelWithinRadius(sample,1).map(o=>o.id),['millenium','maru']);assert.equal(fuelWithinRadius(sample,11).length,3);
assert.equal(fuelWithinRadius([offer('boundary',6,'2026-10-12T12:00:00-03:00','1')],1).length,1);
assert.equal(fuelWithinRadius([offer('missing',6,'2026-10-12T12:00:00-03:00',''),offer('invalid',6,'2026-10-12T12:00:00-03:00','NaN')],1).length,0);
console.log('PASS: raio de 1 km exclui República a 1,48 km; limite exato e distâncias inválidas.');

assert.deepEqual(fuelWithinRadius(sample,2).sort(fuelPriceDistanceOrder).map(o=>o.id),['republica','millenium','maru']);
assert.deepEqual(fuelWithinRadius(sample,1).sort(fuelPriceDistanceOrder).map(o=>o.id),['millenium','maru']);
assert.equal([offer('farEqual',6,'2026-10-12T12:00:00-03:00','1.5'),offer('nearEqual',6,'2026-10-12T12:00:00-03:00','0.5')].sort(fuelPriceDistanceOrder)[0].id,'nearEqual');
console.log('PASS: menor preço dentro do raio e menor distância como desempate.');
