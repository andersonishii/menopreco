const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function comparablePrices(name:string,results:any[]){
 const original=normalize(name),tokens=original.match(/[a-z]{3,}/g)?.filter(t=>!['com','para','choc','chocolate','produto'].includes(t))||[];
 const sizes=[...original.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|mg|ml|g|l)\b/g)].map(m=>m[1].replace(',','.')+m[2]);
 if(tokens.length<2)return [];
 return results.filter(r=>{if(typeof r.title!=='string'||!/^R\$/.test(String(r.price).trim())||!Number.isFinite(r.extracted_price)||r.extracted_price<=0||r.second_hand_condition||r.installment)return false;const title=normalize(r.title);if(tokens.some(t=>!title.includes(t)))return false;const targetSizes=[...title.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|mg|ml|g|l)\b/g)].map(m=>m[1].replace(',','.')+m[2]);if(sizes.some(size=>!targetSizes.includes(size)))return false;if(/\b(kit|caixa|pack|combo|fardo|\d+\s*(unidades|unid|un|x))\b/.test(title)&&! /\b(kit|caixa|pack|combo|fardo)\b/.test(original))return false;return true;}).map(r=>({title:r.title,price:r.extracted_price,store:typeof r.source==='string'?r.source:'Loja online'}));
}

export function parseOnlinePrice(value:unknown){if(typeof value!=='string')return NaN;const match=value.trim().match(/^R\$\s*(\d+(?:\.\d{3})*(?:,\d{2})?)$/);return match?Number(match[1].replace(/\./g,'').replace(',','.')):NaN;}
