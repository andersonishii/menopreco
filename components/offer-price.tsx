import {offerPrice,offerDiscount,type PriceFields} from '../lib/offer-price';
export default function OfferPrice({offer,decimals=2}:{offer:PriceFields;decimals?:number}){
 const final=offerPrice(offer),discount=offerDiscount(offer);const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:decimals,maximumFractionDigits:decimals});
 return <span className="discount-price">{discount>0&&<><del aria-label="Preço antes do desconto">{money(Number(offer.valor_tabela))}</del></>}<span>{Number.isFinite(final)?money(final):'Preço indisponível'}</span>{discount>0&&<><small>Desconto registrado: {money(discount)}</small><span className="discount-conditions"><b>Atenção às condições do desconto</b><span>O desconto pode variar conforme o cliente, a forma de pagamento, programas de fidelidade, cupons ou outras condições comerciais. Ele pode não estar disponível para todos. Confirme com o estabelecimento antes de comprar.</span></span></>}</span>;
}
