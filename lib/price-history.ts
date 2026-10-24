import type {PriceFields} from './offer-price';
import type {Store} from './offer-details';
export type HistoryPoint={price:number;recordedAt:string;discount:number};
export type PriceHistory={points:HistoryPoint[];hasNewer:boolean;origin?:'client'};
export type HistoricalOffer=PriceFields&{gtin?:string;datahora?:string;estabelecimento?:Store;priceHistory?:PriceHistory;historyUnavailable?:boolean};
export function historyChange(price:number,history:PriceHistory){
 const previous=history.points[0];
 if(history.hasNewer)return{kind:'older' as const};
 if(!previous)return{kind:'first' as const};
 const difference=Math.round((price-previous.price)*1000)/1000;
 return{kind:difference<0?'down' as const:difference>0?'up' as const:'same' as const,difference,percent:previous.price>0?difference/previous.price*100:null,previous};
}
