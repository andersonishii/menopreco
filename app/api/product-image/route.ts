import {identity,sameOrigin,fail,AccessError} from '../../../lib/credit-server';
import {selectProductImage} from '../../../lib/product-image';
const cache=new Map<string,{until:number;image:any}>(),pending=new Map<string,Promise<any>>(),limits=new Map<string,{until:number;count:number}>();
export async function POST(request:Request){try{
 sameOrigin(request);const account=await identity(request);if(!account.userId)throw new AccessError('Entre para consultar imagens.',401);
 const {name,code}=await request.json();if(typeof name!=='string'||name.length<3||name.length>180||typeof code!=='string'||!/^(\d{8}|\d{12,14})$/.test(code))throw new AccessError('Produto inválido.',400);
 if(process.env.PRODUCT_IMAGES_ENABLED==='false')return Response.json({image:null});
 const key=code.padStart(14,'0'),hit=cache.get(key);if(hit&&hit.until>Date.now())return Response.json({image:hit.image});
 const apiKey=(process.env.SERPER_API_KEY||process.env.SERPAPI_API_KEY)?.trim();if(!apiKey)return Response.json({image:null});
 let task=pending.get(key);if(!task){
  let limit=limits.get(account.userId);if(!limit||limit.until<Date.now()){limit={until:Date.now()+3600000,count:0};limits.set(account.userId,limit);}if(limit.count>=24)return Response.json({image:null});limit.count++;
  task=(async()=>{const response=await fetch('https://google.serper.dev/images',{method:'POST',headers:{'X-API-KEY':apiKey,'Content-Type':'application/json'},body:JSON.stringify({q:'"'+code+'" '+name,gl:'br',hl:'pt-br',num:10}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new AccessError('Imagem indisponível.',502);const data=await response.json();const image=selectProductImage(name,code,Array.isArray(data.images)?data.images:[]);if(cache.size>=1000)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+(image?7*86400000:86400000),image});return image;})();pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});
 }
 return Response.json({image:await task},{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e)}}
