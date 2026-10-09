import assert from 'node:assert/strict';
import {groupOffers} from './lib/product-groups.ts';
const offer=(id,gtin,price)=>({id,gtin,valor_tabela:price,desc:'Arroz',tempo:'há uma hora',distkm:'1',estabelecimento:{nm_emp:'Mercado',bairro:'Batel',mun:'Curitiba'}});
const groups=groupOffers([offer('a','7896290300295','9.99'),offer('b','07896290300295','5.45'),offer('c','7896038321056','7'),offer('d','','4'),offer('e','0','3'),offer('f','','2')]);
assert.equal(groups.length,5);assert.deepEqual(groups[0].offers.map(o=>o.id),['b','a']);assert.equal(groups[0].gtin,'07896290300295');assert.equal(groups[2].offers.length,1);assert.equal(groups[3].gtin,null);assert.equal(groupOffers([]).length,0);
console.log('PASS: agrupamento GTIN, zeros à esquerda, preços crescentes e produtos sem GTIN separados.');
