import {saleDay} from './shopping-price';
import {offerPrice} from './offer-price';
import type {Offer} from './product-groups';
export function recentFuelOffers<T extends Offer>(offers:T[],now=new Date()){
 const today=saleDay(now)||'';const dated=offers.map(offer=>({offer,day:offer.datahora?saleDay(offer.datahora):null})).filter(p=>p.day&&p.day<=today&&Number.isFinite(offerPrice(p.offer))&&offerPrice(p.offer)>0);
 const day=dated.reduce((latest,p)=>p.day!>latest?p.day!:latest,'');
 const distance=(offer:T)=>{const raw=String(offer.distkm??'').trim(),n=Number(raw);return raw!==''&&Number.isFinite(n)&&n>=0?n:Infinity;};
 const selected=dated.filter(p=>p.day===day).map(p=>p.offer).sort((a,b)=>offerPrice(a)-offerPrice(b)||(distance(a)===distance(b)?0:distance(a)<distance(b)?-1:1)||(Date.parse(b.datahora||'')||0)-(Date.parse(a.datahora||'')||0));
 return {offers:selected,day};
}

export function fuelWithinRadius<T extends {distkm:string}>(offers:T[],radius:number):T[]{
 if(!Number.isFinite(radius)||radius<1||radius>30)return [];
 return offers.filter(offer=>{const raw=String(offer.distkm??'').trim(),distance=Number(raw);return raw!==''&&Number.isFinite(distance)&&distance>=0&&distance<=radius;});
}
