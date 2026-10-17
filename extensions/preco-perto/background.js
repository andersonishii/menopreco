import {authorize,callback,siteOrigin,eventReturn} from './guards.js';
const key=id=>'flow:'+id;
const finishing=new Set();
async function stop(id,message){
 const flow=(await chrome.storage.session.get(key(id)))[key(id)];
 await chrome.storage.session.remove(key(id));await chrome.alarms.clear(key(id));
 try{await chrome.debugger.detach({tabId:id});}catch{}
 if(flow&&message)try{await chrome.tabs.sendMessage(flow.owner,{type:'error',message},{frameId:0});}catch{}
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message?.type!=='start')return;
 (async()=>{
  if(sender.frameId!==0||!sender.tab||new URL(sender.url).origin!==siteOrigin)throw Error('Abra a extensão pelo site Preço Perto.');
  const auth=authorize(message.url);
  // One pending attempt per site tab. Never store codes, access tokens or credentials.
  for(const [k,flow] of Object.entries(await chrome.storage.session.get(null)))if(k.startsWith('flow:')&&flow.owner===sender.tab.id)await stop(Number(k.slice(5)));
  const tab=await chrome.tabs.create({url:'about:blank',active:true});
  try{
   await chrome.storage.session.set({[key(tab.id)]:{owner:sender.tab.id,state:auth.state,expires:Date.now()+600000}});
   await chrome.alarms.create(key(tab.id),{delayInMinutes:10});
   await chrome.debugger.attach({tabId:tab.id},'1.3');
   await chrome.debugger.sendCommand({tabId:tab.id},'Log.enable');
   await chrome.debugger.sendCommand({tabId:tab.id},'Page.enable');
   await chrome.debugger.sendCommand({tabId:tab.id},'Network.enable',{maxPostDataSize:0});
   await chrome.tabs.update(tab.id,{url:auth.url});respond({ok:true});
  }catch{await stop(tab.id);throw Error('O Chrome não permitiu a captura. Feche o DevTools e tente novamente, ou use a conexão manual.');}
 })().catch(error=>respond({ok:false,error:error.message}));return true;
});
chrome.debugger.onEvent.addListener((source,method,params)=>{
 const id=source.tabId;if(!id||finishing.has(id))return;
 // Inspect only return URLs, redirect Location and browser logs. Never request bodies, DOM or input values.
 const text=eventReturn(method,params);
 if(typeof text!=='string'||!text.includes('br.gov.rs.procergs.mpbr://'))return;
 void (async()=>{
  const flow=(await chrome.storage.session.get(key(id)))[key(id)];if(!flow)return;
  if(flow.expires<Date.now()){await stop(id,'A tentativa expirou. Inicie a conexão novamente.');return;}
  const url=callback(text,flow.state);if(!url||finishing.has(id))return;finishing.add(id);
  try{
   const owner=await chrome.tabs.get(flow.owner);if(new URL(owner.url).origin!==siteOrigin)throw Error();
   await chrome.tabs.update(flow.owner,{active:true});
   if(owner.windowId)await chrome.windows.update(owner.windowId,{focused:true});
   await chrome.tabs.sendMessage(flow.owner,{type:'callback',url},{frameId:0});
   await stop(id);
   await chrome.tabs.remove(id);
  }catch{await stop(id,'Não foi possível entregar o retorno. Volte ao site e use a conexão manual.');}
  finally{finishing.delete(id);}
 })().catch(()=>{});
});
chrome.debugger.onDetach.addListener(source=>{if(source.tabId)void stop(source.tabId,'A captura foi encerrada. Inicie novamente ou use a conexão manual.');});
chrome.tabs.onRemoved.addListener(id=>{void (async()=>{await stop(id);for(const [k,flow] of Object.entries(await chrome.storage.session.get(null)))if(k.startsWith('flow:')&&flow.owner===id)await stop(Number(k.slice(5)));})().catch(()=>{});});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name.startsWith('flow:'))void stop(Number(alarm.name.slice(5)),'A tentativa expirou. Inicie a conexão novamente.');});
