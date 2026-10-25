import type {HistoricalOffer,PriceHistory} from './price-history';
const fields=['gtin','datahora','valor','valor_tabela','valor_desconto'] as const;
const storeFields=['uf','mun','nm_logr','nr_logr','complemento','nm_compl','nm_emp','nm_fan'] as const;
export async function saveClientPriceHistory<T extends HistoricalOffer>(offers:T[],target:URL,grant:string):Promise<T[]>{
 const metadata=new Map<number,PriceHistory>(),query=new URLSearchParams();
 for(const name of ['local','uf','termo','gtin','tp_comb']){const value=target.searchParams.get(name);if(value!==null)query.set(name,value);}
 const batches=Array.from({length:Math.ceil(Math.min(offers.length,200)/50)},(_,index)=>index*50);let cursor=0;
 await Promise.all(Array.from({length:Math.min(2,batches.length)},async()=>{while(cursor<batches.length){
  const start=batches[cursor++],payload=offers.slice(start,start+50).map(offer=>({...Object.fromEntries(fields.map(name=>[name,offer[name]])),...(offer.estabelecimento?{estabelecimento:Object.fromEntries(storeFields.map(name=>[name,offer.estabelecimento![name]]))}:{})}));
  try{
   const body=JSON.stringify({offers:payload});if(new TextEncoder().encode(body).length>65536)continue;
   const response=await fetch('/api/price-history?'+query,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-search-grant':grant},body,signal:AbortSignal.timeout(6000)});
   if(!response.ok)continue;const data=await response.json();if(!Array.isArray(data.entries))continue;
   for(const entry of data.entries)if(Number.isInteger(entry.index)&&entry.index>=0&&entry.index<payload.length&&entry.priceHistory?.origin==='client'&&Array.isArray(entry.priceHistory.points))metadata.set(start+entry.index,entry.priceHistory);
  }catch{/* History must never turn a valid search into an error. */}
 }}));
 return offers.map((offer,index)=>({...offer,priceHistory:metadata.get(index),historyUnavailable:!metadata.has(index)}));
}
