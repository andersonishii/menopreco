import assert from 'node:assert/strict';
import {comparablePrices} from './lib/online-prices.ts';
const item=(title,price=15)=>({title,price:'R$ '+price,extracted_price:price,source:'Loja'});
const result=comparablePrices('KINDER JOY 40G',[item('Kinder Joy 40 g'),item('Kinder Joy 20g'),item('Kit Kinder Joy 40g 12 unidades',100),item('Kinder Joy 40g',20),item('Outra marca 40g'),{...item('Kinder Joy 40g'),price:'US$ 10'},item('Kinder Joy 40g',0)]);
assert.deepEqual(result.map(o=>o.price),[15,20]);assert.deepEqual(comparablePrices('Produto', [item('Produto qualquer')]),[]);
console.log('OK: comparação exclui tamanho diferente, kits, moeda estrangeira, preços inválidos e nome genérico.');
