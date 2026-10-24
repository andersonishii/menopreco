"use client";
import {useState} from 'react';
import {offerPrice} from '../lib/offer-price';
import {historyChange,type HistoricalOffer} from '../lib/price-history';
export default function PriceHistory({offer,decimals=2}:{offer:HistoricalOffer;decimals?:number}){
 const [open,setOpen]=useState(false);
 if(offer.historyUnavailable)return <span className="history-unavailable">Histórico indisponível no momento.</span>;
 const history=offer.priceHistory;if(!history)return null;
 const price=offerPrice(offer),scale=10**decimals;
 const change=historyChange(Math.round(price*scale)/scale,{...history,points:history.points.map(point=>({...point,price:Math.round(point.price*scale)/scale}))});
 const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:decimals,maximumFractionDigits:decimals});
 const date=(value:string)=>new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const label=change.kind==='first'?'Primeiro registro neste histórico':change.kind==='older'?'Há um registro mais recente no histórico':change.kind==='same'?'Sem alteração no preço registrado':`${change.kind==='down'?'↓ Caiu':'↑ Subiu'} ${money(Math.abs(change.difference!))}${change.percent!==null?` (${Math.abs(change.percent!).toLocaleString('pt-BR',{maximumFractionDigits:1})}%)`:''}`;
 return <span className={'price-history history-'+change.kind}><span className="history-change">{label}</span>{change.previous&&<small>Antes: {money(change.previous.price)} · nota de {date(change.previous.recordedAt)}</small>}<small>Mesmo produto e mesma loja.</small><span className="history-records"><button type="button" aria-expanded={open} onClick={event=>{event.stopPropagation();setOpen(value=>!value);}}>{open?'Ocultar histórico':'Ver histórico de preços'}</button><span className="history-content" hidden={!open}><b>Notas consultadas nesta loja</b><span>Preço desta oferta: {money(price)}{offer.datahora&&` · ${date(offer.datahora)}`}</span>{history.points.length?<span className="history-points">{history.points.map((point,index)=><span key={point.recordedAt+':'+index}><time dateTime={point.recordedAt}>{date(point.recordedAt)}</time><strong>{money(point.price)}</strong>{point.discount>0&&<small>Com desconto registrado</small>}</span>)}</span>:<span>Ainda não há registros anteriores para comparar. Novas consultas ajudam a formar o histórico.</span>}<small>Datas das notas fiscais, não das consultas. Histórico formado pelas ofertas consultadas no site; não cobre todas as vendas. Descontos e condições comerciais podem explicar diferenças.</small></span></span></span>;
}
