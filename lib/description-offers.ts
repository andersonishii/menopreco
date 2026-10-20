import {offerPrice} from './offer-price';
import type {Offer} from './product-groups';
export function normalizedGtin(value:unknown){const code=String(value??'').trim();return /^(\d{8}|\d{12,14})$/.test(code)&&!/^0+$/.test(code)?code.padStart(14,'0'):null;}
const normalized=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
export function uniqueOffers(offers:Offer[]){
 const seen=new Set<string>();return offers.filter(offer=>{
  const store=offer.estabelecimento||{},code=normalizedGtin(offer.gtin),time=Date.parse(offer.datahora||''),price=offerPrice(offer);
  const address=store.nm_logr&&store.mun?[normalized([store.tp_logr,store.nm_logr].filter(Boolean).join(' ')),normalized(store.nr_logr),normalized(store.complemento||store.nm_compl),normalized(store.bairro),normalized(store.mun),normalized(store.uf||store.sg_uf)].join('|'):null;
  const key=code&&address&&Number.isFinite(time)&&Number.isFinite(price)?JSON.stringify([code,address,price,time]):JSON.stringify(['id',code,offer.id||offer]);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
// Four lookups at a time; each GTIN is requested once even when descriptions differ.
export async function expandDescriptionOffers(initial:Offer[],lookup:(gtin:string)=>Promise<Offer[]>){
 const codes=[...new Map(initial.flatMap(offer=>{const code=normalizedGtin(offer.gtin);return code?[[code,String(offer.gtin).trim()] as const]:[];})).entries()];
 const batches:Offer[][]=Array.from({length:codes.length},()=>[]);let cursor=0,failed=0,fatal:unknown;
 await Promise.all(Array.from({length:Math.min(4,codes.length)},async()=>{while(cursor<codes.length&&!fatal){const index=cursor++,[code,queryCode]=codes[index];try{batches[index]=(await lookup(queryCode)).filter(offer=>normalizedGtin(offer.gtin)===code);}catch(error){if((error as {status?:number})?.status===428||(error as {status?:number})?.status===401)fatal=error;else{const partial=(error as {partialOffers?:Offer[]})?.partialOffers;if(Array.isArray(partial))batches[index]=partial.filter(offer=>normalizedGtin(offer.gtin)===code);failed++;}}}}));
 if(fatal)throw fatal;
 return {produtos:uniqueOffers([...initial,...batches.flat()]),expandedGtins:codes.length-failed,expansionWarning:failed?'Não foi possível completar a consulta por código de barras de '+failed+' produto(s). Exibimos as ofertas obtidas; tente uma nova busca para completar.':null};
}
