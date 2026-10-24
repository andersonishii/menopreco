import {normalizedGtin} from './description-offers';
import type {HistoricalOffer} from './price-history';
import type {Store} from './offer-details';
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
export function storeIdentity(store?:Store){
 if(!store?.nm_logr||!store.nr_logr||!store.mun||!store.uf)return null;
 return [store.uf,store.mun,store.nm_logr,store.nr_logr,store.complemento||store.nm_compl||'',store.nm_emp||store.nm_fan||''].map(normalize).join('|');
}
// Use invoice time, never the cheapest price. Equal timestamps remain comparable offers.
export function latestStoreOffers<T extends HistoricalOffer>(offers:T[],now=Date.now()):T[]{
 const entries=offers.map(offer=>{
  const code=normalizedGtin(offer.gtin),store=storeIdentity(offer.estabelecimento),stamp=Date.parse(offer.datahora||'');
  return{key:code&&store?code+'|'+store:null,time:Number.isFinite(stamp)&&stamp<=now+300000?stamp:-Infinity};
 });
 const newest=new Map<string,number>();
 for(const entry of entries)if(entry.key)newest.set(entry.key,Math.max(newest.get(entry.key)??-Infinity,entry.time));
 return offers.filter((_,index)=>{const entry=entries[index];return !entry.key||entry.time===newest.get(entry.key);});
}
