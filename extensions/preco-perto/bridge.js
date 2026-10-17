// Only this site's main frame is injected. No script runs inside the gov.br page.
const channel='preco-perto-mpbr-v1';
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.channel!==channel)return;
 if(event.data.type==='probe'){window.postMessage({channel,type:'ready',version:chrome.runtime.getManifest().version},location.origin);return;}
 if(event.data.type!=='start'||typeof event.data.url!=='string')return;
 chrome.runtime.sendMessage({type:'start',url:event.data.url}).then(result=>{
  if(!result?.ok)window.postMessage({channel,type:'error',message:result?.error||'Não foi possível iniciar a extensão.'},location.origin);
  else window.postMessage({channel,type:'started'},location.origin);
 }).catch(()=>window.postMessage({channel,type:'error',message:'Recarregue a página depois de instalar a extensão.'},location.origin));
});
chrome.runtime.onMessage.addListener(message=>{
 if(message?.type==='callback')window.postMessage({channel,type:'callback',url:message.url},location.origin);
 if(message?.type==='error')window.postMessage({channel,type:'error',message:message.message},location.origin);
});
