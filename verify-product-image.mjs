import assert from 'node:assert/strict';
import {selectProductImage} from './lib/product-image.ts';
const image=(title,url='https://example.com/image.jpg')=>({title,thumbnailUrl:url,link:'https://example.com/product'});
assert.equal(selectProductImage('Kinder Joy 40g','7898024394938',[image('Kinder Joy 20g')]),null);
assert.equal(selectProductImage('Kinder Joy 40g','7898024394938',[image('Kinder Joy 40g')]).url,'https://example.com/image.jpg');
assert.equal(selectProductImage('Kinder Joy 40g','7898024394938',[image('Outra marca 40g')]),null);
assert.equal(selectProductImage('Kinder Joy 40g','7898024394938',[image('Kinder Joy 40g','javascript:alert(1)')]),null);
assert.equal(selectProductImage('Kinder Joy 40g','7898024394938',[]),null);
console.log('PASS: seleção por nome e apresentação, ausência de imagem e URLs inválidas.');
