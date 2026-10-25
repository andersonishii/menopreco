import {priceSummary} from './offer-details';
import type {Offer} from './product-groups';
import type {ParanaPriceRange} from './parana-response';

// Only authoritative API bounds prove a missing extreme; never use loaded-only bounds.
export function needsOrderRefresh(order:string,offers:Offer[],range:ParanaPriceRange|null,queriedOrders:string[]):boolean{
 if(!range||!['0','3'].includes(order)||queriedOrders.includes(order))return false;
 const loaded=priceSummary(offers);
 if(!loaded)return true;
 const units=(value:number|string)=>Math.round(Number(value)*1000);
 return order==='3'?units(loaded.max)<units(range.max):units(loaded.min)>units(range.min);
}
