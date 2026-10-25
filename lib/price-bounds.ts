import {isRegionalProvider} from './search-provider';
import {paranaRangeParams,type ParanaPriceRange} from './parana-response';
export type PriceBounds=Record<string,string>;
// Limit user-entered currency fields without changing three-decimal API ranges.
export function priceInputValue(value:string,previous=''){
 const text=value.trim();
 if(!/^\d*(?:[.,]\d*)?$/.test(text))return previous;
 const separator=text.search(/[.,]/);
 return separator<0?text:text.slice(0,separator+3);
}

export function formatPriceInput(value:string){
 const text=priceInputValue(value);
 if(!text||!/^\d+(?:[.,]\d{0,2})?$/.test(text))return text;
 return Number(text.replace(',','.')).toFixed(2);
}
export function parsePriceBounds(minimum:unknown,maximum:unknown):PriceBounds{
 const parse=(value:unknown)=>{const text=String(value??'').trim();if(!text)return null;if(!/^\d{1,7}(?:[.,]\d{1,3})?$/.test(text)||Number(text.replace(',','.'))>1000000)throw new Error('Informe preços válidos, de R$ 0,00 a R$ 1.000.000,00, sem separador de milhares.');const decimal=text.replace(',','.');return Number(decimal).toFixed((decimal.split('.')[1]?.length||0)>2?3:2);};
 const min=parse(minimum),max=parse(maximum);
 if(min!==null&&max!==null&&Number(min)>Number(max))throw new Error('O preço mínimo não pode ser maior que o preço máximo.');
 return {...(min!==null?{valor_min:min}:{}),...(max!==null?{valor_max:max}:{})};
}
export function savedPriceBounds(value:unknown):PriceBounds{try{const bounds=value as PriceBounds|null;return parsePriceBounds(bounds?.valor_min,bounds?.valor_max);}catch{return{};}}
export function regionalPriceParams(uf:string|undefined,bounds:PriceBounds,offset=0,range:ParanaPriceRange|null=null):PriceBounds{
 if(!isRegionalProvider(uf))return{};
 const selected=savedPriceBounds(bounds);
 return Object.keys(selected).length?selected:paranaRangeParams(offset,range);
}
