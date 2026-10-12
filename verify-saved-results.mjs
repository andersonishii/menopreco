import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(fs.readFileSync('lib/saved-results.ts','utf8')).replace(/^import .*;$/gm,'').replace(/export /g,'');
const storage=new Map();const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const {read,write}=new Function('localStorage',source+';return {read:readSavedResults,write:writeSavedResults};')(localStorage);
const state={products:[{id:'test',valor:'10'}],sort:'1',radius:5};write('user-one',state);assert.deepEqual(read('user-one').data,state);assert.equal(read('user-two'),null);
write('fresh',state,Date.now()-29*60000);assert.deepEqual(read('fresh').data,state);
write('expired',state,Date.now()-31*60000);assert.equal(read('expired'),null);
storage.set('preco-perto-results-v1:broken','invalid');assert.equal(read('broken'),null);
write('too-large',{value:'x'.repeat(2100000)});assert.equal(read('too-large'),null);
const failed=new Function('localStorage',source+';return {read:readSavedResults,write:writeSavedResults};')({getItem(){throw Error();},setItem(){throw Error();}});assert.equal(failed.read('test'),null);assert.doesNotThrow(()=>failed.write('test',state));
console.log('PASS: resultados e filtros, isolamento por conta, expiração e armazenamento indisponível.');

// Exercise the hook across the initial empty render and the hydrated render.
const hookSlots=[],effects=[],dependencies=[];let cursor=0,effectCursor=0,writes=0,snapshot={products:[],sort:'recent-day'};
const hookStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>{writes++;storage.set(key,value);}};
const useRef=value=>{const index=cursor++;return hookSlots[index]??(hookSlots[index]={current:value});};
const useState=value=>{const index=cursor++;if(!(index in hookSlots))hookSlots[index]=value;return [hookSlots[index],next=>{hookSlots[index]=next;}];};
const useEffect=(effect,deps)=>{const index=effectCursor++,previous=dependencies[index];if(!previous||deps.some((value,i)=>!Object.is(value,previous[i]))){effects.push(effect);dependencies[index]=deps;}};
const hook=new Function('localStorage','useRef','useState','useEffect',source+';return useSavedResults;')(hookStorage,useRef,useState,useEffect);
const cached={products:[{id:'kept'}],sort:'discount'};write('hook-user',cached);const original=storage.get('preco-perto-results-v1:hook-user');
const render=()=>{cursor=0;effectCursor=0;hook('hook-user',snapshot,data=>{snapshot=data;});while(effects.length)effects.shift()();};
render();assert.equal(writes,0);assert.deepEqual(snapshot,cached);
await new Promise(resolve=>setTimeout(resolve,5));render();assert.equal(writes,0);assert.equal(storage.get('preco-perto-results-v1:hook-user'),original);
snapshot={...cached,sort:'1'};render();assert.equal(writes,1);assert.equal(read('hook-user').data.sort,'1');
console.log('PASS: estado vazio não sobrescreve cache e filtro é restaurado sem renovar validade.');
