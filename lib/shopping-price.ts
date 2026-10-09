export type PricePolicy='cheapest'|'today'|'recent';
export type ShoppingOffer={gtin?:string;desc:string;valor?:string;valor_tabela?:string;datahora?:string;tempo:string;distkm:string;estabelecimento:{nm_emp:string;nm_fan:string;bairro:string;mun:string;tp_logr:string;nm_logr:string;nr_logr:string}};
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function saleDay(value:string|Date){
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=calendar.formatToParts(date);
 return ['year','month','day'].map(key=>parts.find(p=>p.type===key)?.value).join('-');
}
export function chooseShoppingOffer(offers:ShoppingOffer[],code:string,policy:PricePolicy,now=new Date()){
 const today=saleDay(now)!;
 let candidates=offers.filter(p=>String(p.gtin??'').padStart(14,'0')===code.padStart(14,'0')).map(offer=>({offer,value:Number(offer.valor??offer.valor_tabela),day:offer.datahora?saleDay(offer.datahora):null})).filter(p=>Number.isFinite(p.value)&&p.value>0);
 if(policy!=='cheapest'){
  candidates=candidates.filter(p=>p.day!==null&&p.day<=today);
  const target=policy==='today'?today:candidates.reduce((latest,p)=>p.day!>latest?p.day!:latest,'');
  candidates=candidates.filter(p=>p.day===target);
 }
 candidates.sort((a,b)=>a.value-b.value||(Date.parse(b.offer.datahora||'')||0)-(Date.parse(a.offer.datahora||'')||0));
 return candidates[0];
}
