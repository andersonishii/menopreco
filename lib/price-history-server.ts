import {createHash} from 'node:crypto';
import {db} from './credit-server';
import {offerPrice,offerDiscount} from './offer-price';
import {normalizedGtin} from './description-offers';
import type {HistoricalOffer,PriceHistory} from './price-history';
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function observation(offer:HistoricalOffer,source:'PR'|'BR',now=Date.now()){
 const gtin=normalizedGtin(offer.gtin),store=offer.estabelecimento,stamp=Date.parse(offer.datahora||''),price=offerPrice(offer);
 if(!gtin||!store||!store.nm_logr||!store.nr_logr||!store.mun||!store.uf||!Number.isFinite(stamp)||stamp>now+300000||stamp<946684800000||!Number.isFinite(price)||price<=0||price>1000000)return null;
 const storeKey=hash([store.uf,store.mun,store.nm_logr,store.nr_logr,store.complemento||store.nm_compl||'',store.nm_emp||store.nm_fan||''].map(normalize).join('|'));
 const paid=Math.round(price*1000)/1000,discount=Math.round(offerDiscount(offer)*1000)/1000,recordedAt=new Date(stamp).toISOString();
 return{observation_key:hash([source,gtin,storeKey,recordedAt,paid,discount].join('|')),source,gtin,store_key:storeKey,price:paid,discount,recorded_at:recordedAt};
}
// Only upstream responses reach this function; browsers cannot submit shared price records.
export async function withPriceHistory<T extends HistoricalOffer>(offers:T[],source:'PR'|'BR'):Promise<T[]>{
 const mapped=offers.map(offer=>observation(offer,source));
 const entries=[...new Map(mapped.filter(x=>x!==null).map(x=>[x!.observation_key,x!])).values()];
 if(!entries.length)return offers;
 try{
  const summaries=new Map<string,PriceHistory>();
  const signal=AbortSignal.timeout(4000);
  for(let start=0;start<entries.length;start+=200){
   const response=await db('rpc/record_price_observations',{method:'POST',signal,body:JSON.stringify({observations:entries.slice(start,start+200)})});
   if(!Array.isArray(response))throw Error('Invalid history response');
   for(const row of response)summaries.set(row.observation_key,{points:row.points||[],hasNewer:!!row.has_newer});
  }
  return offers.map((offer,index)=>{const entry=mapped[index],history=entry&&summaries.get(entry.observation_key);return history?{...offer,priceHistory:history}:entry?{...offer,historyUnavailable:true}:offer;});
 }catch{
  // A history outage must never hide search results or charge another query.
  return offers.map((offer,index)=>mapped[index]?{...offer,historyUnavailable:true}:offer);
 }
}
