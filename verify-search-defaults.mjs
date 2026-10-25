import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('./render-app/package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(id=>{if(!id.startsWith('.'))return require(id);const base=path.resolve(path.dirname(filename),id);const found=['.ts','.tsx','.json',''].map(ext=>base+ext).find(file=>fs.existsSync(file));if(!found)throw Error(id);return found.endsWith('.json')?JSON.parse(fs.readFileSync(found,'utf8')):load(found);},module,module.exports);return module.exports;}
const {hasDeviceLocation}=load('lib/location.ts');
const manual={name:'Curitiba',geohash:'6gkzq99z5j5f',latitude:-25.4,longitude:-49.2};
const gps={...manual,device:true};
assert.equal(hasDeviceLocation(manual),false);assert.equal(hasDeviceLocation(gps),true);assert.equal(hasDeviceLocation({...gps,latitude:undefined}),false);assert.equal(hasDeviceLocation({...gps,longitude:NaN}),false);
for(const [file,id,value] of [['fuel-search','fuel-order','recent-day'],['shopping-list','shopping-policy','recent']]){
 const Component=load('components/'+file+'.tsx').default;
 const render=location=>renderToStaticMarkup(React.createElement(Component,{local:location.geohash,cityName:location.name,searchLocation:location,onBusy:()=>{}}));
 const html=render(manual),select=html.match(new RegExp('<select[^>]*id="'+id+'"[\\s\\S]*?</select>'))?.[0];assert.ok(select);assert.match(select,new RegExp('value="'+value+'" selected=""'));assert.ok(!select.includes('Menor distância'));assert.ok(!html.includes('Deseja adicionar uma tolerância'));
 assert.ok(render(gps).includes('Menor distância'));
}
console.log('PASS: componentes reais renderizados com preço recente padrão; cidade manual sem filtro de distância; GPS válido disponibiliza distância.');
