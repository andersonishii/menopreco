import {isRegionalProvider} from '../../../lib/search-provider';
import {AccessError,fail,readJson,requireSearch,sameOrigin} from '../../../lib/credit-server';
import {withPriceHistory} from '../../../lib/price-history-server';
import {normalizedGtin} from '../../../lib/description-offers';
import type {HistoricalOffer} from '../../../lib/price-history';
const field=(value:unknown,max:number)=>{
 if(value===undefined||value===null)return undefined;
 if(!['string','number'].includes(typeof value)||String(value).length>max)throw new AccessError('Dados de histórico inválidos.',400);
 return String(value).trim();
};
const price=(value:unknown)=>{
 const text=field(value,20);
 if(text!==undefined&&(!/^\d+(?:\.\d{1,3})?$/.test(text)||Number(text)>1000000))throw new AccessError('Valor de histórico inválido.',400);
 return text;
};
export async function POST(request:Request){try{
 sameOrigin(request);const query=new URL(request.url).searchParams;
 if(!isRegionalProvider(query.get('uf')))throw new AccessError('Histórico direto disponível apenas para Paraná e Pernambuco.',400);
 const expectedUf=query.get('uf')||'PR';
 const account=await requireSearch(request),body=await readJson(request,65536);
 if(!Array.isArray(body.offers)||body.offers.length<1||body.offers.length>50)throw new AccessError('Envie entre 1 e 50 ofertas por vez.',400);
 const code=query.get('gtin');
 const offers:(HistoricalOffer&{index:number})[]=body.offers.map((raw:unknown,index:number)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AccessError('Oferta inválida.',400);
  const item=raw as Record<string,any>,store=item.estabelecimento;
  if(store!==undefined&&(!store||typeof store!=='object'||Array.isArray(store)))throw new AccessError('Estabelecimento inválido.',400);
  const offer:HistoricalOffer&{index:number}={index,gtin:field(item.gtin,14),datahora:field(item.datahora,40),valor:price(item.valor),valor_tabela:price(item.valor_tabela),valor_desconto:price(item.valor_desconto)};
  if(code&&normalizedGtin(offer.gtin)!==normalizedGtin(code))throw new AccessError('Código não corresponde à consulta.',400);
  if(store){
   if(store.uf!==expectedUf)throw new AccessError('Estabelecimento fora do estado consultado.',400);
   offer.estabelecimento={uf:expectedUf,mun:field(store.mun,120),nm_logr:field(store.nm_logr,240),nr_logr:field(store.nr_logr,30),complemento:field(store.complemento,120),nm_compl:field(store.nm_compl,120),nm_emp:field(store.nm_emp,240),nm_fan:field(store.nm_fan,240)};
  }
  return offer;
 });
 const enriched=await withPriceHistory(offers,'PR',account.userId!);
 return Response.json({entries:enriched.map(offer=>({index:offer.index,...(offer.priceHistory?{priceHistory:offer.priceHistory}:{historyUnavailable:true})}))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error);}}
