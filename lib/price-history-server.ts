import {latestStoreOffers,storeIdentity} from './latest-offers';
import {createHash} from 'node:crypto';
import {db} from './credit-server';
import {offerPrice,offerDiscount} from './offer-price';
import {normalizedGtin} from './description-offers';
import type {HistoricalOffer,PriceHistory} from './price-history';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function observation(offer:HistoricalOffer,source:'PR'|'BR',now=Date.now(),clientOwner?:string,provider?:'bahia'){
 const gtin=normalizedGtin(offer.gtin),store=offer.estabelecimento,stamp=Date.parse(offer.datahora||''),price=offerPrice(offer);
 if(!gtin||!store||!store.nm_logr||!store.nr_logr||!store.mun||!store.uf||!Number.isFinite(stamp)||stamp>now+300000||stamp<946684800000||!Number.isFinite(price)||price<=0||price>1000000)return null;
 // Isolate legacy PR observations collected before browser User-Agent forwarding.
 const storeKey=hash((clientOwner?'client-reported-v1|'+clientOwner+'|':provider==='bahia'?'bahia-validated-v1|':source==='PR'?'parana-validated-v2|':'')+storeIdentity(store)!);
 const paid=Math.round(price*1000)/1000,discount=Math.round(offerDiscount(offer)*1000)/1000,recordedAt=new Date(stamp).toISOString();
 return{observation_key:hash([source,gtin,storeKey,recordedAt,paid,discount].join('|')),source,gtin,store_key:storeKey,price:paid,discount,recorded_at:recordedAt};
}
// Client observations require an account-specific namespace; never mix with verified upstream observations.
export async function withPriceHistory<T extends HistoricalOffer>(offers:T[],source:'PR'|'BR',clientOwner?:string,provider?:'bahia'):Promise<T[]>{
 const mapped=offers.map(offer=>observation(offer,source,Date.now(),clientOwner,provider));
 const entries=[...new Map(mapped.filter(x=>x!==null).map(x=>[x!.observation_key,x!])).values()];
 if(!entries.length)return latestStoreOffers(offers);
 try{
  const summaries=new Map<string,PriceHistory>();
  const signal=AbortSignal.timeout(4000);
  for(let start=0;start<entries.length;start+=200){
   const response=await db('rpc/record_price_observations',{method:'POST',signal,body:JSON.stringify({observations:entries.slice(start,start+200)})});
   if(!Array.isArray(response))throw Error('Invalid history response');
   for(const row of response)summaries.set(row.observation_key,{points:row.points||[],hasNewer:!!row.has_newer,...(clientOwner?{origin:'client' as const}:{})});
  }
  return latestStoreOffers(offers.map((offer,index)=>{const entry=mapped[index],history=entry&&summaries.get(entry.observation_key);return history?{...offer,priceHistory:history}:entry?{...offer,historyUnavailable:true}:offer;}));
 }catch{
  // A history outage must never hide search results or charge another query.
  return latestStoreOffers(offers.map((offer,index)=>mapped[index]?{...offer,historyUnavailable:true}:offer));
 }
}
