import assert from 'node:assert/strict';
import {authorize,callback,siteOrigin,redirect,eventReturn} from './extensions/preco-perto/guards.js';
const state='test-state-12345678901234567890';
const params=new URLSearchParams({client_id:'p-mprs.sefaz.rs.gov.br',redirect_uri:redirect,response_type:'code',code_challenge_method:'S256',code_challenge:'a'.repeat(43),state});
const url='https://sso.acesso.gov.br/authorize?'+params;
const returned=redirect+'?'+new URLSearchParams({code:'test-only-code',state});
assert.equal(authorize(url).state,state);
assert.throws(()=>authorize(url.replace('sso.acesso.gov.br','evil.example')));
assert.equal(callback("Failed to launch '"+returned+"' because the scheme does not have a registered handler.",state),returned);
assert.equal(callback(returned,'wrong'),null);
assert.equal(callback(returned+'&state=duplicate',state),null);
assert.equal(callback(returned.replace('test-only-code','truncated...'),state),null);
const listeners={},storage={},sent=[],commands=[],tabs=new Map([[1,{id:1,url:siteOrigin+'/',windowId:4}]]);let created=0,detached=0;
const event=name=>({addListener:fn=>{listeners[name]=fn;}});
globalThis.chrome={
 runtime:{onMessage:event('message')},
 storage:{session:{get:async key=>key?{[key]:storage[key]}:{...storage},set:async data=>Object.assign(storage,data),remove:async key=>{delete storage[key];}}},
 alarms:{create:async()=>{},clear:async()=>{},onAlarm:event('alarm')},
 debugger:{attach:async()=>{},detach:async()=>{detached++;},sendCommand:async(_,method)=>{commands.push(method);},onEvent:event('debug'),onDetach:event('detach')},
 tabs:{remove:async id=>tabs.delete(id),create:async()=>{created++;const tab={id:created+10};tabs.set(tab.id,tab);return tab;},update:async(id,data)=>{Object.assign(tabs.get(id),data);},get:async id=>tabs.get(id),sendMessage:async(id,data)=>sent.push({id,data}),onRemoved:event('removed')},
 windows:{update:async()=>{}}
};
await import('./extensions/preco-perto/background.js');
const start=(origin=siteOrigin,frameId=0)=>new Promise(resolve=>listeners.message({type:'start',url},{url:origin+'/',tab:{id:1},frameId},resolve));
assert.equal((await start('https://evil.example')).ok,false);assert.equal(created,0);
assert.equal((await start(siteOrigin,1)).ok,false);assert.equal(created,0);
assert.equal((await start()).ok,true);assert.deepEqual(commands,['Log.enable','Page.enable','Network.enable']);
assert.equal(Object.values(storage).some(flow=>JSON.stringify(flow).includes('test-only-code')),false);
assert.equal(eventReturn('Network.responseReceivedExtraInfo',{statusCode:302,headers:{Location:returned}}),returned);
assert.equal(eventReturn('Network.responseReceivedExtraInfo',{statusCode:200,headers:{Location:returned}}),null);
assert.equal(eventReturn('Page.frameScheduledNavigation',{url:returned}),returned);
const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
listeners.debug({tabId:11},'Log.entryAdded',{entry:{text:returned.replace(state,'wrong')}});await settle();assert.equal(sent.length,0);
listeners.debug({tabId:99},'Log.entryAdded',{entry:{text:returned}});await settle();assert.equal(sent.length,0);
listeners.debug({tabId:11},'Log.entryAdded',{entry:{text:"Failed to launch '"+returned+"'"}});await settle();
assert.equal(sent.length,1);assert.equal(sent[0].id,1);assert.equal(sent[0].data.type,'callback');assert.equal(sent[0].data.url,returned);assert.equal(Object.keys(storage).length,0);assert.ok(detached);assert.equal(tabs.get(1).active,true);assert.equal(tabs.has(11),false);
listeners.debug({tabId:11},'Page.frameRequestedNavigation',{url:returned});await settle();assert.equal(sent.length,1);
await start();await listeners.alarm({name:'flow:12'});await settle();assert.equal(Object.keys(storage).length,0);assert.equal(sent.at(-1).data.type,'error');
await start();tabs.get(1).url='https://evil.example/';listeners.debug({tabId:13},'Page.frameRequestedNavigation',{url:returned});await settle();assert.equal(sent.filter(item=>item.data.type==='callback').length,1);
tabs.get(1).url=siteOrigin+'/';await start();listeners.debug({tabId:14},'Network.responseReceivedExtraInfo',{statusCode:302,headers:{location:returned}});await settle();assert.equal(sent.filter(item=>item.data.type==='callback').length,2);assert.equal(tabs.has(14),false);
console.log('PASS: origem e frame, URL de autorização, state, retorno completo, entrega isolada, sem persistência de código, limpeza, prazo e navegação do destino. Chrome simulado; login real não testado.');
