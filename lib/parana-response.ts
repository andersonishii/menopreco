import {normalizedGtin} from './description-offers';
export class ParanaResponseError extends Error{code='PARANA_RESPONSE_INCONSISTENT';}
export function paranaHeaders(request:Request):HeadersInit{
 const headers:Record<string,string>={Accept:'application/json'};
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
 const nextOffset=offset+50,count=data.sourceCount??data.produtos.length;
 const total=typeof data.total==='number'||typeof data.total==='string'&&/^\d+$/.test(data.total)?Number(data.total):null;
 return{nextOffset,hasMore:count>0&&(total!==null&&Number.isSafeInteger(total)&&total>=0?nextOffset<total:true)};
}
