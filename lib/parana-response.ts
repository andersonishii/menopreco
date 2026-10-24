import {normalizedGtin} from './description-offers';
export class ParanaResponseError extends Error{code='PARANA_RESPONSE_INCONSISTENT';}
export function paranaHeaders(request:Request):HeadersInit{
 const headers:Record<string,string>={Accept:'application/json, text/plain, */*'};
 const agent=request.headers.get('user-agent');
 // Forward the actual caller's browser identity. Never forward cookies, grants or authorization.
 if(agent&&agent.length<=1024)headers['User-Agent']=agent;
 return headers;
}
export function assertParanaProducts(data:unknown,local:string,gtin?:string|null):asserts data is {produtos:any[];[key:string]:unknown}{
 if(!data||typeof data!=='object'||!Array.isArray((data as any).produtos))throw new ParanaResponseError('Resposta de produtos inválida.');
 const body=data as {produtos:any[];local?:unknown};
 if(body.produtos.length&&typeof body.local==='string'&&body.local!==local)throw new ParanaResponseError('A resposta do Nota Paraná não corresponde à localização consultada.');
 if(gtin&&body.produtos.some(offer=>normalizedGtin(offer?.gtin)!==normalizedGtin(gtin)))throw new ParanaResponseError('A resposta do Nota Paraná não corresponde ao código consultado.');
}

// The API advances over 50 source positions even when it returns fewer offers.
export function paranaPage(offset:number,data:{produtos:unknown[];total?:unknown;sourceCount?:number}){
 const nextOffset=paranaOffset(offset)+50,count=data.sourceCount??data.produtos.length;
 const total=typeof data.total==='number'||typeof data.total==='string'&&/^\d+$/.test(data.total)?Number(data.total):null;
 return{nextOffset,hasMore:count>0&&(offset===0||count>=50)&&(total!==null&&Number.isSafeInteger(total)&&total>=0?nextOffset<total:true)};
}

export type ParanaPriceRange={min:string;max:string};
export function paranaPriceRange(value:unknown):ParanaPriceRange|null{
 if(!value||typeof value!=='object')return null;
 const {min,max}=value as {min?:unknown;max?:unknown};
 const valid=(part:unknown)=>['string','number'].includes(typeof part)&&/^\d{1,7}(?:\.\d{1,3})?$/.test(String(part))&&Number(part)<=1000000;
 return valid(min)&&valid(max)&&Number(min)<=Number(max)?{min:String(min),max:String(max)}:null;
}
export function paranaRangeParams(offset:number,range:ParanaPriceRange|null):Record<string,string>{
 return offset>0&&range?{valor_min:range.min,valor_max:range.max}:{};
}

export function paranaOffset(value:unknown){
 const offset=Number(value),aligned=Math.ceil(offset/50)*50;
 return Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(aligned)?aligned:0;
}
export async function paranaBusyResponse(response:Response):Promise<Response|null>{
 let busy=response.status===429||response.status===503;
 if(response.status===500){const body=await response.clone().json().catch(()=>null);busy=typeof body?.message==='string'&&body.message.includes('es_rejected_execution_exception');}
 return busy?Response.json({error:'O serviço do Nota Paraná está sobrecarregado. Aguarde alguns instantes e tente novamente.',code:'PARANA_UPSTREAM_BUSY'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'10'}}):null;
}

// Legacy caches stored a count-derived next offset, not a verified page cursor.
// Revisit page 50 safely instead of skipping unconfirmed pages from those caches.
export function restoredParanaOffset(saved:{paginationVersion?:unknown;lastLoadedOffset?:unknown},hasResults:boolean){
 if(!hasResults)return 0;
 const last=saved.lastLoadedOffset;
 return saved.paginationVersion===1&&typeof last==='number'&&Number.isSafeInteger(last)&&last>=0&&last%50===0?last+50:50;
}

// Recent-day selection is applied locally; fetch its candidate page by price,
// matching the official application's initial product query.
export function paranaRequestOrder(order:string){return order==='recent-day'||order==='discount'?'0':order;}

export function paranaProductsUrl(query:URLSearchParams){
 const params=new URLSearchParams();
 for(const name of ['local','termo','categoria','offset','raio','data','gtin','tp_comb','valor_min','valor_max','ordem']){
  const value=query.get(name);if(value!==null)params.set(name,value);
 }
 return 'https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?'+params;
}
