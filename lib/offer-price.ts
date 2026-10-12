export type PriceFields={valor?:string;valor_tabela?:string;valor_desconto?:string};
const amount=(value?:string)=>{if(value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;};
// Preço original: valor_tabela; desconto concedido: valor_desconto; preço pago: valor.
export function offerPrice(offer:PriceFields){const final=amount(offer.valor);if(final!==null)return final;const original=amount(offer.valor_tabela),discount=amount(offer.valor_desconto);if(original===null)return NaN;return discount!==null&&discount<=original?Math.round((original-discount)*1000)/1000:original;}
export function offerDiscount(offer:PriceFields){const original=amount(offer.valor_tabela),final=offerPrice(offer),discount=amount(offer.valor_desconto);if(original===null||!Number.isFinite(final)||final>=original)return 0;if(discount!==null)return discount<=original?discount:0;return Math.round((original-final)*1000)/1000;}
export function discountOrder(a:PriceFields,b:PriceFields){return offerDiscount(b)-offerDiscount(a)||offerPrice(a)-offerPrice(b);}
