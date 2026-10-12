export type PriceFields={valor?:string;valor_tabela?:string;valor_desconto?:string};
const amount=(value?:string)=>{if(value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;};
// Regra definida para esta aplicação: valor_desconto positivo é o preço final.
export function offerPrice(offer:PriceFields){const final=amount(offer.valor_desconto);if(final!==null&&final>0)return final;return amount(offer.valor_tabela)??amount(offer.valor)??NaN;}
export function offerDiscount(offer:PriceFields){const original=amount(offer.valor_tabela),final=offerPrice(offer);if(original===null||!Number.isFinite(final)||final>=original)return 0;const granted=amount(offer.valor);return granted!==null&&granted>0&&amount(offer.valor_desconto)!==null&&Number(offer.valor_desconto)>0?granted:Math.round((original-final)*1000)/1000;}
export function discountOrder(a:PriceFields,b:PriceFields){return offerDiscount(b)-offerDiscount(a)||offerPrice(a)-offerPrice(b);}
