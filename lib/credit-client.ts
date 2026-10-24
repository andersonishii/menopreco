"use client";
import {assertParanaProducts,paranaOffset,paranaBusyResponse,paranaProductsUrl} from './parana-response';
import {latestStoreOffers} from './latest-offers';
const grants=new Map<string,string>();
let queue:Promise<unknown>=Promise.resolve();
const key=(p:URLSearchParams)=>[p.get('uf')&&p.get('uf')!=='PR'?p.get('local')+'|uf:'+p.get('uf')+'|lat:'+Number(p.get('latitude'))+'|lon:'+Number(p.get('longitude')):p.get('local'),p.get('tp_comb')?'fuel:'+p.get('tp_comb'):p.get('gtin')?'gtin:'+p.get('gtin'):'term:'+p.get('termo')?.trim()].join('|');
async function directParanaProducts(target:URL):Promise<Response|undefined>{
 const response=await fetch(paranaProductsUrl(target.searchParams),{headers:{Accept:'application/json, text/plain, */*'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)return (await paranaBusyResponse(response))||undefined;
 const data=await response.json();assertParanaProducts(data,target.searchParams.get('local')||'',target.searchParams.get('gtin'));
 // Browser prices are not submitted to the shared price history.
 const produtos=latestStoreOffers(data.produtos.map(offer=>({...offer,historyUnavailable:true})));
 return Response.json({...data,sourceCount:data.produtos.length,produtos},{headers:{'Cache-Control':'no-store'}});
}
export async function creditFetch(url:string,reset=false):Promise<Response>{const target=new URL(url,location.origin),scope=key(target.searchParams);if(target.pathname==='/api/produtos'&&(!target.searchParams.get('uf')||target.searchParams.get('uf')==='PR')){target.searchParams.set('data','3');if(target.searchParams.has('offset'))target.searchParams.set('offset',String(paranaOffset(target.searchParams.get('offset'))));}if(reset)grants.delete(scope);if(!grants.has(scope)){
 const run=queue.then(async()=>{if(grants.has(scope))return;const r=await fetch('/api/credits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),params:Object.fromEntries(target.searchParams)})});const data=await r.json();window.dispatchEvent(new CustomEvent('credits-changed'));if(!r.ok){if(data.code==='MPBR_CONNECTION_REQUIRED')window.dispatchEvent(new CustomEvent('mpbr-connection-required'));if(r.status===402||r.status===401)window.dispatchEvent(new CustomEvent('account-required'));throw new Error(data.error||'Não foi possível iniciar a consulta.');}grants.set(scope,data.grant);});queue=run.catch(()=>{});await run;
 }
 // Reserve access before calling the public API. A valid barcode result, including
 // an empty one, finishes here without a redundant product request to our server.
 const browserBarcode=target.pathname==='/api/produtos'&&(!target.searchParams.get('uf')||target.searchParams.get('uf')==='PR')&&!!target.searchParams.get('gtin')&&!target.searchParams.has('tp_comb');
 if(browserBarcode)try{const direct=await directParanaProducts(target);if(direct)return direct;}catch{/* Network/CORS or invalid data: use the server once with the same grant. */}
 // Description products retain server history; categories use the browser first.
 if(target.searchParams.get('expand')!=='1'&&target.pathname==='/api/categorias'){
  const upstream=new URL('https://menorpreco.notaparana.pr.gov.br/api/v1/'+target.pathname.split('/').pop());upstream.search=target.search;
  try{const direct=await fetch(upstream.toString(),{headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});if(direct.ok){const body=await direct.clone().json();if(Array.isArray(body.categorias)||Array.isArray(body.produtos))return direct;}}catch{/* Network/CORS failures use our server with the same credit grant. */}
 }
 const response=await fetch(target.pathname+target.search,{headers:{'x-search-grant':grants.get(scope)!},signal:AbortSignal.timeout(target.searchParams.get('expand')==='1'?180000:30000)});if(response.status===401||response.status===403){grants.delete(scope);window.dispatchEvent(new CustomEvent('account-required'));}if(response.status===428)window.dispatchEvent(new CustomEvent('mpbr-connection-required'));
 // Recover only upstream failures, never account, credit or authorization failures.
 if(!browserBarcode&&target.pathname==='/api/produtos'&&(!target.searchParams.get('uf')||target.searchParams.get('uf')==='PR')&&response.status===502){
  const failure=await response.clone().json().catch(()=>null);
  if(['PARANA_RESPONSE_INCONSISTENT','PARANA_UPSTREAM_UNAVAILABLE'].includes(failure?.code))try{
   const direct=await directParanaProducts(target);if(direct)return direct;
  }catch{/* Keep the original error if the browser also cannot obtain valid data. */}
 }
 return response;}

export function clearGrants(){grants.clear()}
