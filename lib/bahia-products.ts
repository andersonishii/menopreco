import {AccessError} from './credit-server';
import {validCoordinates} from './device-location';
import {normalizedGtin} from './description-offers';
import {parsePriceBounds} from './price-bounds';
import type {Offer} from './product-groups';

import {bahiaFuels,bahiaFilterParams} from './bahia-filters';
export {bahiaHours,bahiaFuels,bahiaFilterParams} from './bahia-filters';
const orders:Record<string,string>={'0':'preco.asc','3':'preco.desc','2':'data.desc','1':'distancia.asc','recent-day':'data.desc',discount:'preco.asc'};
export type BahiaCategory={id:number;desc:string;qtd:number};

export function bahiaRequest(query:URLSearchParams){
 const latitude=query.has('latitude')&&query.get('latitude')?.trim()?Number(query.get('latitude')):NaN;
 const longitude=query.has('longitude')&&query.get('longitude')?.trim()?Number(query.get('longitude')):NaN;
 if(query.get('uf')!=='BA'||!validCoordinates(latitude,longitude))throw new AccessError('Selecione uma localização válida na Bahia.',400);
 const radius=Number(query.get('raio')),offset=Number(query.get('offset')||0);
 if(!Number.isInteger(radius)||radius<1||radius>30)throw new AccessError('Informe um raio entre 1 e 30 km.',400);
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new AccessError('Página inválida.',400);
 const order=orders[query.get('ordem')||'0'];
 if(!order)throw new AccessError('Ordenação inválida.',400);
 const page=offset||1,term=query.get('termo')?.trim(),gtin=query.get('gtin')?.trim(),fuel=query.get('tp_comb');
 if(fuel!==null&&!bahiaFuels[fuel])throw new AccessError('Escolha gasolina, etanol, diesel ou GNV para consultar na Bahia.',400);
 if(fuel===null&&(gtin?!normalizedGtin(gtin):!term||term.length<3||term.length>120))throw new AccessError('Informe uma descrição de 3 a 120 caracteres ou um código de barras válido.',400);
 let filters:Record<string,string>;try{filters=bahiaFilterParams('BA',query.get('horas')||72,query.get('categorias')||query.get('categoria')||[]);}catch(error){throw new AccessError((error as Error).message,400);}
 let bounds:Record<string,string>;
 try{bounds=parsePriceBounds(query.get('valor_min'),query.get('valor_max'));}catch(error){throw new AccessError((error as Error).message,400);}
 const body=new URLSearchParams({pagina:String(page),ordenar:order,raio:String(radius),horas:filters.horas,latitude:String(latitude),longitude:String(longitude)});
 if(fuel!==null)body.set('anp',bahiaFuels[fuel]);else if(gtin)body.set('gtin',gtin);else body.set('termo',term!);
 if(filters.categorias)body.set('categorias',filters.categorias);
 if(bounds.valor_min!==undefined)body.set('precomin',bounds.valor_min);
 if(bounds.valor_max!==undefined)body.set('precomax',bounds.valor_max);
 return {body,page,latitude,longitude,radius,gtin:gtin||null};
}

const text=(value:unknown,max=240)=>typeof value==='string'||typeof value==='number'?String(value).trim().slice(0,max):'';
const amount=(value:unknown)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):NaN;
const rounded=(value:number)=>Math.round(value*1000)/1000;
export function bahiaResponse(data:any,expectedPage:number,gtin?:string|null,location?:{latitude:number;longitude:number;radius:number}){
 if(Number(data?.codigo)===429)throw new AccessError('O Preço da Hora Bahia limitou temporariamente as consultas. Aguarde antes de tentar novamente.',429,'BAHIA_UPSTREAM_LIMIT');
 // The official site uses code 50 for a valid search with no matches.
 if(Number(data?.codigo)===50)return{produtos:[] as Offer[],sourceCount:0,total:0,more:false,nextOffset:expectedPage+1,pagina:expectedPage,categorias:[] as BahiaCategory[],precos:null};
 if(Number(data?.codigo)!==80||!Array.isArray(data.resultado))throw new AccessError('O Preço da Hora Bahia não concluiu a consulta. Tente novamente em instantes.',502,'BAHIA_INVALID_RESPONSE');
 if(location&&(!data.centro||Math.abs(amount(data.centro.latitude)-location.latitude)>0.000001||Math.abs(amount(data.centro.longitude)-location.longitude)>0.000001||!Number.isFinite(amount(data.centro.latitude))||!Number.isFinite(amount(data.centro.longitude))))throw new AccessError('A resposta da Bahia não corresponde à localização consultada.',502,'BAHIA_INVALID_RESPONSE');
 const page=Number(data.pagina),pages=Number(data.totalPaginas);
 if(!Number.isSafeInteger(page)||page!==expectedPage||!Number.isSafeInteger(pages)||pages<0||pages>10000)throw new AccessError('O Preço da Hora Bahia retornou uma página inconsistente. Tente novamente.',502,'BAHIA_INVALID_RESPONSE');
 const produtos:Offer[]=[];
 for(const row of data.resultado){
  const item=row?.produto,store=row?.estabelecimento,paid=amount(item?.precoLiquido),original=amount(item?.precoUnitario),stamp=Date.parse(text(item?.data).replace(' ','T'));
  if(!item||!store||store.uf!=='BA'||!text(item.descricao)||!Number.isFinite(paid)||paid<=0||paid>1000000||!Number.isFinite(stamp))continue;
  const code=normalizedGtin(item.gtin);
  if(gtin&&code!==normalizedGtin(gtin))throw new AccessError('O Preço da Hora Bahia retornou outro código de barras. Tente novamente.',502,'BAHIA_INVALID_RESPONSE');
  const list=Number.isFinite(original)&&original>=paid?original:paid;
  const distance=amount(store.distancia);
  if(location&&(!Number.isFinite(distance)||distance<0||distance>location.radius))continue;
  produtos.push({id:[text(store.cnpj,14),code||text(item.codProduto,80),text(item.cod_nfce,80),stamp,rounded(paid)].join('|'),...(code?{gtin:code}:{}),desc:text(item.descricao,500),valor:String(rounded(paid)),valor_tabela:String(rounded(list)),valor_desconto:String(rounded(Math.max(0,list-paid))),datahora:new Date(stamp).toISOString(),tempo:text(item.intervalo,120)||'registrado em '+new Date(stamp).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),distkm:Number.isFinite(distance)&&distance>=0?String(distance):'',estabelecimento:{cnpj:text(store.cnpj,14),nm_emp:text(store.nomeEstabelecimento),nm_logr:text(store.endLogradouro),nr_logr:text(store.endNumero,30),bairro:text(store.bairro,120),mun:text(store.municipio,120),uf:'BA',cep:text(store.cep,10)}});
 }
 const categorias:BahiaCategory[]=Array.isArray(data.categorias)?data.categorias.filter((item:any)=>Number.isInteger(item?.codigo)&&item.codigo>0&&typeof item.descricao==='string').map((item:any)=>({id:item.codigo,desc:text(item.descricao,120),qtd:0})):[];
 const min=amount(data.intervaloPreco?.min),max=amount(data.intervaloPreco?.max);
 const precos=Number.isFinite(min)&&min>=0&&Number.isFinite(max)&&max>=min?{min:String(min),max:String(max)}:null;
 return {produtos,sourceCount:data.resultado.length,total:Number.isSafeInteger(Number(data.totalRegistros))?Number(data.totalRegistros):produtos.length,more:data.resultado.length>0&&page<pages,nextOffset:page+1,pagina:page,categorias,precos};
}
