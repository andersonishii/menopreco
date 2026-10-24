export type ConnectionSource='device'|'server';
const header='X-Preco-Perto-Connection';
export function connectionSource(response:Response):ConnectionSource|null{
 const value=response.headers.get(header);return value==='device'||value==='server'?value:null;
}
export function markConnection(response:Response,source:ConnectionSource){
 const headers=new Headers(response.headers);headers.set(header,source);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function savedConnection(value:unknown):ConnectionSource|null{return value==='device'||value==='server'?value:null;}
