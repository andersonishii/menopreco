export const bahiaHours=[12,24,36,48,60,72];
export const bahiaFuels:Record<string,string>={'1':'GASOLINA','3':'ETANOL','4':'DIESEL','5':'GNV'};
export type BahiaCategory={id:number;desc:string;qtd:number};
export function bahiaFilterParams(uf:string|undefined,hours:unknown=72,categories:unknown=[]):Record<string,string>{
 if(uf!=='BA')return{};
 const period=Number(hours);
 if(!bahiaHours.includes(period))throw new Error('Escolha um período entre 12 e 72 horas.');
 const values=Array.isArray(categories)?categories:String(categories||'').split(',').filter(Boolean);
 if(values.length>20||values.some(value=>!/^\d{1,6}$/.test(String(value))||Number(value)<1))throw new Error('Categorias da Bahia inválidas.');
 return{horas:String(period),...(values.length?{categorias:[...new Set(values.map(String))].join(',')}:{})};
}
export function savedBahiaFilters(value:unknown):Record<string,string>{try{const data=value as Record<string,string>|null;return bahiaFilterParams('BA',data?.horas||72,data?.categorias||[]);}catch{return{horas:'72'};}}
export function bahiaPage(data:{pagina?:unknown;nextOffset?:unknown;more?:unknown},page:number){
 const current=Number(data.pagina),next=Number(data.nextOffset);
 if(current!==page||!Number.isSafeInteger(next)||next!==page+1)throw new Error('Página da Bahia inconsistente. Tente novamente.');
 return{nextOffset:next,hasMore:data.more===true};
}
export function restoredBahiaCursor(saved:{bahiaPaginationVersion?:unknown;offset?:unknown;more?:unknown}){
 const offset=Number(saved.offset);
 return saved.bahiaPaginationVersion===1&&Number.isSafeInteger(offset)&&offset>=2?{offset,more:saved.more===true}:{offset:2,more:false};
}
export function savedBahiaCategories(value:unknown):BahiaCategory[]{return Array.isArray(value)?value.filter(item=>Number.isInteger(item?.id)&&item.id>0&&typeof item.desc==='string').slice(0,100).map(item=>({id:item.id,desc:item.desc.slice(0,120),qtd:0})):[];}
