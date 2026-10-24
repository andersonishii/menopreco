import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {createRequire,registerHooks} from 'node:module';
const require=createRequire(new URL('./render-app/package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
registerHooks({
 resolve(s,c,n){if(s==='react'||s.startsWith('react/'))return {url:pathToFileURL(require.resolve(s)).href,shortCircuit:true};return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)},
 load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context)}
});
const {default:PriceHistory}=await import('./components/price-history.tsx');
const render=(price,history,extra={})=>renderToStaticMarkup(React.createElement(PriceHistory,{offer:{valor:String(price),datahora:'2026-10-24T12:00:00Z',priceHistory:history,...extra}}));
const history={points:[{price:10,recordedAt:'2026-10-23T12:00:00Z',discount:0}],hasNewer:false};
for(const [price,word] of [[8,'Caiu'],[12,'Subiu'],[10,'Sem alteração']]){
 const html=render(price,history);assert.ok(html.includes(word));assert.ok(html.includes('23/10/2026'));assert.ok(html.includes('aria-expanded="false"'));assert.ok(html.includes('Ver histórico de preços'));assert.ok(html.includes('Mesmo produto e mesma loja.'));
}
assert.ok(render(8,history).includes('(20%)'));
assert.ok(render(8,{points:[],hasNewer:false}).includes('Primeiro registro neste histórico'));
assert.ok(render(8,{...history,hasNewer:true}).includes('Há um registro mais recente'));
const unavailable=render(8,history,{historyUnavailable:true});assert.ok(unavailable.includes('Histórico indisponível'));assert.ok(!unavailable.includes('Caiu'));
assert.equal(render(8,undefined),'');
console.log('PASS: componente real renderiza queda, alta, preço igual, primeiro registro, registro antigo, datas, expansão acessível e indisponibilidade.');
