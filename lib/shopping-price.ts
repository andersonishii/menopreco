import {offerPrice,discountOrder} from './offer-price';
import {distancePriceOrder,distanceToleranceOrder} from './product-groups';
import type {Store} from './offer-details';
export type PricePolicy='cheapest'|'today'|'recent'|'distance'|'discount';
export type ShoppingOffer={id?:string;gtin?:string;desc:string;valor?:string;valor_tabela?:string;valor_desconto?:string;datahora?:string;tempo:string;distkm:string;estabelecimento:Store};
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function saleDay(value:string|Date){
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=calendar.formatToParts(date);
 return ['year','month','day'].map(key=>parts.find(p=>p.type===key)?.value).join('-');
}
export function chooseShoppingOffer(offers:ShoppingOffer[],code:string,policy:PricePolicy,now=new Date(),tolerance=0){
 const today=saleDay(now)!;
 let candidates=offers.filter(p=>String(p.gtin??'').padStart(14,'0')===code.padStart(14,'0')).map(offer=>({offer,value:offerPrice(offer),day:offer.datahora?saleDay(offer.datahora):null})).filter(p=>Number.isFinite(p.value)&&p.value>0);
 if(policy==='today'||policy==='recent'){
  candidates=candidates.filter(p=>p.day!==null&&p.day<=today);
  const target=policy==='today'?today:candidates.reduce((latest,p)=>p.day!>latest?p.day!:latest,'');
  candidates=candidates.filter(p=>p.day===target);
 }
 if(policy==='distance')candidates=candidates.filter(p=>String(p.offer.distkm??'').trim()!==''&&Number.isFinite(Number(p.offer.distkm))&&Number(p.offer.distkm)>=0);
 const distance=(offer:ShoppingOffer)=>{const raw=String(offer.distkm??'').trim(),value=Number(raw);return raw!==''&&Number.isFinite(value)&&value>=0?value:Infinity;};
 const distanceTie=(a:ShoppingOffer,b:ShoppingOffer)=>{const da=distance(a),db=distance(b);return da===db?0:da<db?-1:1;};
 candidates.sort((a,b)=>(policy==='discount'?discountOrder(a.offer,b.offer):policy==='distance'?distancePriceOrder({...a.offer,id:a.offer.id||'',valor:undefined,valor_desconto:undefined,valor_tabela:String(a.value)},{...b.offer,id:b.offer.id||'',valor:undefined,valor_desconto:undefined,valor_tabela:String(b.value)}):a.value-b.value)||distanceTie(a.offer,b.offer)||(Date.parse(b.offer.datahora||'')||0)-(Date.parse(a.offer.datahora||'')||0));
 if(policy==='distance'&&tolerance>0){const ordered=distanceToleranceOrder(candidates.map(p=>({candidate:p,distkm:p.offer.distkm,valor_tabela:String(p.value)})),tolerance);return ordered[0]?.candidate;}
 return candidates[0];
}
