import {saleDay} from './shopping-price';
export type Store={id?:string;cnpj?:string;nm_emp?:string;nm_fan?:string;tp_logr?:string;nm_logr?:string;nr_logr?:string;bairro?:string;mun?:string;uf?:string;sg_uf?:string;cep?:string;nr_cep?:string;complemento?:string;nm_compl?:string};
export function fullAddress(store?:Store){
 if(!store)return 'Endereço não informado';
 const street=[store.tp_logr,store.nm_logr,store.nr_logr].filter(Boolean).join(' ');
 const city=store.mun?[store.mun,store.uf||store.sg_uf||'PR'].filter(Boolean).join(' / '):'';
 return [street,store.complemento||store.nm_compl,store.bairro,city,(store.cep||store.nr_cep)?'CEP '+(store.cep||store.nr_cep):''].filter(Boolean).join(' · ')||'Endereço não informado';
}
type DatedOffer={id?:string;gtin?:string;desc?:string;datahora?:string;valor?:string;valor_tabela?:string;estabelecimento?:Store};
export function recentPriceOrder(a:DatedOffer,b:DatedOffer){
 const day=(o:DatedOffer)=>o.datahora?saleDay(o.datahora)||'':'';
 const price=(o:DatedOffer)=>Number(o.valor_tabela??o.valor)||Infinity;
 return day(b).localeCompare(day(a))||price(a)-price(b)||(Date.parse(b.datahora||'')||0)-(Date.parse(a.datahora||'')||0);
}
export function differentDailyPrices<T extends DatedOffer>(offers:T[]){
 const buckets=new Map<string,{prices:Set<number>;ids:string[]}>();
 for(const offer of offers){const store=offer.estabelecimento,day=offer.datahora?saleDay(offer.datahora):null;
  const identity=store?.cnpj||store?.id||(store?.nm_logr&&store.mun?[store.nm_emp,store.tp_logr,store.nm_logr,store.nr_logr,store.bairro,store.mun].join('|'):null);
  const price=Number(offer.valor_tabela??offer.valor);if(!identity||!day||!Number.isFinite(price)||price<=0||!offer.id)continue;
  const product=offer.gtin?String(offer.gtin).padStart(14,'0'):offer.desc?.trim().toUpperCase();if(!product)continue;
  const key=[product,identity,day].join('|');const bucket=buckets.get(key)||{prices:new Set<number>(),ids:[]};bucket.prices.add(price);bucket.ids.push(offer.id);buckets.set(key,bucket);
 }
 return new Set([...buckets.values()].filter(b=>b.prices.size>1).flatMap(b=>b.ids));
}
