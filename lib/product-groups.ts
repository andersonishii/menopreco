import {offerPrice} from './offer-price';
import type {Store} from './offer-details';
export type Offer={id:string;gtin?:string;desc:string;tempo:string;datahora?:string;valor_tabela:string;valor?:string;valor_desconto?:string;distkm:string;estabelecimento:Store};
export function groupOffers(offers:Offer[]){
 const groups=new Map<string,{key:string;gtin:string|null;offers:Offer[]}>();
 for(const offer of offers){const code=String(offer.gtin??'').trim();const gtin=/^(\d{8}|\d{12,14})$/.test(code)&&!/^0+$/.test(code)?code.padStart(14,'0'):null;const key=gtin??'offer:'+offer.id;let group=groups.get(key);if(!group){group={key,gtin,offers:[]};groups.set(key,group);}group.offers.push(offer);}
 return [...groups.values()].map(group=>({...group,offers:[...group.offers].sort((a,b)=>{const price=(s:string)=>s.trim()!==''&&Number.isFinite(Number(s))?Number(s):Infinity;return offerPrice(a)-offerPrice(b);})}));
}

// Distâncias iguais na precisão exibida (0,01 km) são desempatadas pelo preço.
export function distancePriceOrder(a:Offer,b:Offer){
 const distance=(offer:Offer)=>{const value=String(offer.distkm??'').trim();const n=Number(value);return value!==''&&Number.isFinite(n)&&n>=0?Math.round(n*100):Infinity;};
 const price=(offer:Offer)=>{const n=offerPrice(offer);return Number.isFinite(n)?n:Infinity;};
 const da=distance(a),db=distance(b);
 if(da!==db)return da<db?-1:1;
 const pa=price(a),pb=price(b);return pa===pb?0:pa<pb?-1:1;
}

export function distanceToleranceOrder<T extends {distkm:string;valor_tabela?:string;valor?:string;valor_desconto?:string}>(offers:T[],tolerance=0):T[]{
 const distance=(offer:T)=>{const raw=String(offer.distkm??'').trim(),value=Number(raw);return raw!==''&&Number.isFinite(value)&&value>=0?value:Infinity;};
 const price=(offer:T)=>{const n=offerPrice(offer);return Number.isFinite(n)?n:Infinity;};
 const closest=Math.min(...offers.map(distance));
 const limit=closest+(Number.isFinite(tolerance)?Math.max(0,tolerance):0);
 return [...offers].sort((a,b)=>{
  const da=distance(a),db=distance(b);
  if(tolerance>0&&Number.isFinite(closest)){
   const nearA=da<=limit+1e-9,nearB=db<=limit+1e-9;
   if(nearA!==nearB)return nearA?-1:1;
   if(nearA)return (price(a)-price(b))||(da-db);
  }
  const roundedA=Math.round(da*100),roundedB=Math.round(db*100);
  return roundedA===roundedB?(price(a)-price(b))||0:roundedA<roundedB?-1:1;
 });
}
