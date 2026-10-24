import {normalizedGtin} from './description-offers';
export function paranaHeaders(request:Request):HeadersInit{
 const headers:Record<string,string>={Accept:'application/json'};
 const agent=request.headers.get('user-agent');
 // Forward the actual caller's browser identity. Never forward cookies, grants or authorization.
 if(agent&&agent.length<=1024)headers['User-Agent']=agent;
 return headers;
}
export function assertParanaProducts(data:unknown,local:string,gtin?:string|null):asserts data is {produtos:any[];[key:string]:unknown}{
 if(!data||typeof data!=='object'||!Array.isArray((data as any).produtos))throw Error('Resposta de produtos inválida.');
 const body=data as {produtos:any[];local?:unknown};
 if(body.produtos.length&&typeof body.local==='string'&&body.local!==local)throw Error('A resposta do Nota Paraná não corresponde à localização consultada.');
 if(gtin&&body.produtos.some(offer=>normalizedGtin(offer?.gtin)!==normalizedGtin(gtin)))throw Error('A resposta do Nota Paraná não corresponde ao código consultado.');
}
