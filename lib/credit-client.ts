"use client";
const grants=new Map<string,string>();
let queue:Promise<unknown>=Promise.resolve();
const key=(p:URLSearchParams)=>[p.get('uf')&&p.get('uf')!=='PR'?p.get('local')+'|uf:'+p.get('uf')+'|lat:'+Number(p.get('latitude'))+'|lon:'+Number(p.get('longitude')):p.get('local'),p.get('tp_comb')?'fuel:'+p.get('tp_comb'):p.get('gtin')?'gtin:'+p.get('gtin'):'term:'+p.get('termo')?.trim()].join('|');
export async function creditFetch(url:string,reset=false):Promise<Response>{const target=new URL(url,location.origin),scope=key(target.searchParams);if(reset)grants.delete(scope);if(!grants.has(scope)){
 const run=queue.then(async()=>{if(grants.has(scope))return;const r=await fetch('/api/credits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),params:Object.fromEntries(target.searchParams)})});const data=await r.json();window.dispatchEvent(new CustomEvent('credits-changed'));if(!r.ok){if(data.code==='MPBR_CONNECTION_REQUIRED')window.dispatchEvent(new CustomEvent('mpbr-connection-required'));if(r.status===402||r.status===401)window.dispatchEvent(new CustomEvent('account-required'));throw new Error(data.error||'Não foi possível iniciar a consulta.');}grants.set(scope,data.grant);});queue=run.catch(()=>{});await run;
 }
 // Reserve the credit on our server before using the browser connection.
 if(target.pathname==='/api/categorias'||target.pathname==='/api/produtos'){
  const upstream=new URL('https://menorpreco.notaparana.pr.gov.br/api/v1/'+target.pathname.split('/').pop());upstream.search=target.search;
  try{const direct=await fetch(upstream.toString(),{headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});if(direct.ok){const body=await direct.clone().json();if(Array.isArray(body.categorias)||Array.isArray(body.produtos))return direct;}}catch{/* Network/CORS failures use our server with the same credit grant. */}
 }
 const response=await fetch(target.pathname+target.search,{headers:{'x-search-grant':grants.get(scope)!},signal:AbortSignal.timeout(30000)});if(response.status===401||response.status===403){grants.delete(scope);window.dispatchEvent(new CustomEvent('account-required'));}if(response.status===428)window.dispatchEvent(new CustomEvent('mpbr-connection-required'));return response;}
export function clearGrants(){grants.clear()}
