export function selectProductImage(name:string,code:string,images:any[]){
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const tokens=normalize(name).match(/[a-z]{3,}/g)||[];
 const sizes=normalize(name).match(/\d+(?:[.,]\d+)?\s*(?:kg|mg|ml|g|l)\b/g)||[];
 for(const image of images){
  if(typeof image.title!=='string')continue;
  const title=normalize(image.title),exact=(image.title+' '+(image.link||'')).includes(code);
  if(!exact&&(tokens.length<2||tokens.filter(t=>title.includes(t)).length<Math.max(2,Math.ceil(tokens.length*.7))))continue;
  if(sizes.some(size=>!title.replace(/\s/g,'').includes(size.replace(/\s/g,''))))continue;
  try{const url=new URL(image.thumbnailUrl||image.imageUrl),source=new URL(image.link);if(url.protocol!=='https:'||source.protocol!=='https:')continue;return {url:url.href,source:source.href};}catch{}
 }
 return null;
}
