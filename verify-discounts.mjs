import assert from 'node:assert/strict';
import {offerPrice,offerDiscount,discountOrder,unusuallyLowPrices} from './lib/offer-price.ts';
const discounted={valor_tabela:'22.90',valor_desconto:'20.15',valor:'2.75'};
assert.equal(offerPrice(discounted),2.75);assert.equal(offerDiscount(discounted),20.15);
assert.equal(offerPrice({valor_tabela:'5.19',valor_desconto:'0.00',valor:'5.19'}),5.19);
assert.equal(offerDiscount({valor_tabela:'5.19',valor_desconto:'0.00',valor:'5.19'}),0);
assert.equal(offerPrice({valor_tabela:'10'}),10);
assert.equal(offerPrice({valor:'10'}),10);
assert.equal(offerPrice({valor_tabela:'10',valor_desconto:'invalid'}),10);
assert.equal(offerDiscount({valor_tabela:'10',valor_desconto:'12'}),0);
const bigger={valor_tabela:'30',valor_desconto:'25',valor:'5'};
assert.deepEqual([discounted,bigger].sort(discountOrder),[bigger,discounted]);
console.log('PASS: preço final 2,75, desconto 20,15, desconto zerado, valores inválidos e ordenação.');

assert.equal(offerPrice({valor_tabela:'22.90',valor_desconto:'20.15'}),2.75);
assert.equal(offerPrice({valor_tabela:'10',valor:'0',valor_desconto:'10'}),0);
assert.equal(offerDiscount({valor_tabela:'10',valor:'0',valor_desconto:'10'}),10);
assert.equal(offerDiscount({valor_tabela:'10',valor:'8'}),2);

const make=(id,value,gtin='0789627000128')=>({id,gtin,valor:value,valor_tabela:value});
assert.ok(unusuallyLowPrices([make('low','1.04'),make('normal','3.29')]).has('low'));
assert.equal(unusuallyLowPrices([make('a','3'),make('b','3.29')]).size,0);
assert.equal(unusuallyLowPrices([make('a','1.04'),make('b','3.29','7898024394938')]).size,0);
assert.equal(unusuallyLowPrices([make('a','1.04')]).size,0);
console.log('PASS: diferença expressiva no mesmo GTIN sem confundir produtos diferentes.');
