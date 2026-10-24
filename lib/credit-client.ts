"use client";
import {paranaFetch} from './parana-browser';
import {queueParanaRequest} from './parana-queue';
import {saveClientPriceHistory} from './price-history-client';
const grants=new Map<string,string>();
let queue:Promise<unknown>=Promise.resolve();
const key=(p:URLSearchParams)=>[p.get('uf')&&p.get('uf')!=='PR'?p.get('local')+'|uf:'+p.get('uf')+'|lat:'+Number(p.get('latitude'))+'|lon:'+Number(p.get('longitude')):p.get('local'),p.get('tp_comb')?'fuel:'+p.get('tp_comb'):p.get('gtin')?'gtin:'+p.get('gtin'):'term:'+p.get('termo')?.trim()].join('|');
export async function creditFetch(url:string,reset=false,onCategoryRetry?:(state:'waiting'|'retrying'|'server'|'done',seconds?:number)=>void):Promise<Response>{const target=new URL(url,location.origin),scope=key(target.searchParams);if(reset)grants.delete(scope);if(!grants.has(scope)){
 const run=queue.then(async()=>{if(grants.has(scope))return;const r=await fetch('/api/credits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),params:Object.fromEntries(target.searchParams)})});const data=await r.json();window.dispatchEvent(new CustomEvent('credits-changed'));if(!r.ok){if(data.code==='MPBR_CONNECTION_REQUIRED')window.dispatchEvent(new CustomEvent('mpbr-connection-required'));if(r.status===402||r.status===401)window.dispatchEvent(new CustomEvent('account-required'));throw new Error(data.error||'Não foi possível iniciar a consulta.');}grants.set(scope,data.grant);});queue=run.catch(()=>{});await run;
 }
 const parana=['/api/categorias','/api/produtos'].includes(target.pathname)&&(!target.searchParams.get('uf')||target.searchParams.get('uf')==='PR');
 if(parana){
  let usingServer=false;
  const serverFetch=async()=>{
   onCategoryRetry?.('server');
   const fallback=new URL('/api/parana/consulta',location.origin);fallback.search=target.search;fallback.searchParams.set('tipo',target.pathname.endsWith('/categorias')?'categorias':'produtos');
   try{
    const response=await queueParanaRequest(fallback.toString(),()=>fetch(fallback.pathname+fallback.search,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-search-grant':grants.get(scope)!},body:'{}',signal:AbortSignal.timeout(30000)}));
    if(response.status===401||response.status===403){grants.delete(scope);window.dispatchEvent(new CustomEvent('account-required'));}
    return response;
   }catch{return Response.json({error:'Não foi possível concluir a consulta alternativa pelo servidor. Tente novamente em instantes.',code:'PARANA_SERVER_UNAVAILABLE'},{status:502});}finally{onCategoryRetry?.('done');}
  };
  const attempt=async()=>{
   if(usingServer)return serverFetch();
   const direct=await paranaFetch(new Request(target),offers=>saveClientPriceHistory(offers,target,grants.get(scope)!));
   if(direct.status===502){const failure=await direct.clone().json().catch(()=>null);if(failure?.code==='PARANA_BROWSER_ACCESS_UNAVAILABLE'){usingServer=true;return serverFetch();}}
   return direct;
  };
  let response=await attempt();
  if(!response.ok){
   const failure=await response.clone().json().catch(()=>null);
   const delay=failure?.upstreamStatus===500?8000:target.pathname==='/api/categorias'&&response.status===502&&failure?.code==='PARANA_CATEGORIES_UNAVAILABLE'?6000:0;
   if(delay)try{
    const retryGrant=grants.get(scope);onCategoryRetry?.('waiting',delay/1000);await new Promise<void>(resolve=>setTimeout(resolve,delay));
    if(retryGrant&&grants.get(scope)===retryGrant){onCategoryRetry?.('retrying');response=await attempt();}
   }finally{onCategoryRetry?.('done');}
  }
  return response;
 }
 const response=await fetch(target.pathname+target.search,{headers:{'x-search-grant':grants.get(scope)!},signal:AbortSignal.timeout(target.searchParams.get('expand')==='1'?180000:30000)});
 if(response.status===401||response.status===403){grants.delete(scope);window.dispatchEvent(new CustomEvent('account-required'));}if(response.status===428)window.dispatchEvent(new CustomEvent('mpbr-connection-required'));
 return response;
}
export function clearGrants(){grants.clear()}
