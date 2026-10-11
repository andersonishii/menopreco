import assert from 'node:assert/strict';
import {comparablePrices,parseOnlinePrice} from './lib/online-prices.ts';
const item=(title,price=15)=>({title,price:'R$ '+price,extracted_price:price,source:'Loja'});
const result=comparablePrices('KINDER JOY 40G',[item('Kinder Joy 40 g'),item('Kinder Joy 20g'),item('Kit Kinder Joy 40g 12 unidades',100),item('Kinder Joy 40g',20),item('Outra marca 40g'),{...item('Kinder Joy 40g'),price:'US$ 10'},item('Kinder Joy 40g',0)]);
assert.deepEqual(result.map(o=>o.price),[15,20]);assert.deepEqual(comparablePrices('Produto', [item('Produto qualquer')]),[]);
console.log('OK: comparação exclui tamanho diferente, kits, moeda estrangeira, preços inválidos e nome genérico.');

assert.equal(parseOnlinePrice('R$ 1.234,56'),1234.56);assert.equal(parseOnlinePrice('R$ 14,99'),14.99);assert.ok(Number.isNaN(parseOnlinePrice('3x R$ 14,99')));assert.ok(Number.isNaN(parseOnlinePrice('$14.99')));
