export type PriceFields={valor?:string;valor_tabela?:string;valor_desconto?:string};
const amount=(value?:string)=>{if(value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;};
// Preço original: valor_tabela; desconto concedido: valor_desconto; preço pago: valor.
export function offerPrice(offer:PriceFields){const final=amount(offer.valor);if(final!==null)return final;const original=amount(offer.valor_tabela),discount=amount(offer.valor_desconto);if(original===null)return NaN;return discount!==null&&discount<=original?Math.round((original-discount)*1000)/1000:original;}
export function offerDiscount(offer:PriceFields){const original=amount(offer.valor_tabela),final=offerPrice(offer),discount=amount(offer.valor_desconto);if(original===null||!Number.isFinite(final)||final>=original)return 0;if(discount!==null)return discount<=original?discount:0;return Math.round((original-final)*1000)/1000;}
export function discountOrder(a:PriceFields,b:PriceFields){return offerDiscount(b)-offerDiscount(a)||offerPrice(a)-offerPrice(b);}

export const commercialBenefitWarning='Preço muito abaixo dos demais registros deste produto. Pode ter sido aplicada uma vantagem comercial, como fidelidade, cupom, promoção ou condição de pagamento, que talvez não esteja disponível para outros clientes. As datas também podem influenciar a diferença. Confirme o valor e as condições com o estabelecimento.';
export function unusuallyLowPrices<T extends PriceFields & {id?:string;gtin?:string;desc?:string}>(offers:T[]){
 const groups=new Map<string,T[]>();for(const offer of offers){const code=String(offer.gtin||'').trim();if(!/^(\d{8}|\d{12,14})$/.test(code)||/^0+$/.test(code))continue;const key=code.padStart(14,'0');const group=groups.get(key)||[];group.push(offer);groups.set(key,group);}
 const ids=new Set<string>();for(const group of groups.values()){const prices=[...new Set(group.map(offerPrice).filter(p=>Number.isFinite(p)&&p>0))].sort((a,b)=>a-b);for(const offer of group){const price=offerPrice(offer),next=prices.find(p=>p>price);if(offer.id&&next!==undefined&&price>0&&price<=next*.7)ids.add(offer.id);}}
 return ids;
}
