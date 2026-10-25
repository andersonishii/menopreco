import {createHash} from 'node:crypto';
import {AccessError} from './credit-server';
import {createParanaQueue} from './parana-queue';
import {bahiaRequest} from './bahia-products';

const base='https://precodahora.ba.gov.br';
type Session={cookies:Map<string,string>;csrf:string;expires:number};
type Queue=(key:string,perform:()=>Promise<Response>)=>Promise<Response>;
type Options={fetch?:typeof fetch;now?:()=>number;queue?:Queue};
const limitError=()=>new AccessError('O Preço da Hora Bahia limitou temporariamente as consultas. Aguarde antes de tentar novamente.',429,'BAHIA_UPSTREAM_LIMIT');

async function limitedText(response:Response){
 const reader=response.body?.getReader();if(!reader)return'';
 const parts:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw new AccessError('Resposta da Bahia excedeu o limite permitido.',502);}parts.push(value);}}
 finally{reader.releaseLock();}
 return Buffer.concat(parts).toString('utf8');
}
function updateCookies(response:Response,cookies:Map<string,string>){
 for(const raw of response.headers.getSetCookie()){
  const pair=raw.split(';')[0],index=pair.indexOf('=');if(index<1)continue;
  const name=pair.slice(0,index).trim(),value=pair.slice(index+1);
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(name)||value.length>16000)continue;
  if(/max-age=0(?:;|$)/i.test(raw))cookies.delete(name);else cookies.set(name,value);
 }
}
function csrfFromHtml(html:string){
 const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]).find(tag=>/\bid=["']validate["']/i.test(tag));
 const token=meta?.match(/\bdata-id=["']([^"']+)["']/i)?.[1];
 if(!token||token.length>4096||/[\r\n]/.test(token))throw new AccessError('Não foi possível iniciar a sessão de consulta na Bahia. Tente novamente mais tarde.',502,'BAHIA_SESSION_UNAVAILABLE');
 return token;
}

export function createBahiaService(options:Options={}){
 const fetcher:typeof fetch=options.fetch||((input,init)=>fetch(input,init)),now=options.now||Date.now;
 const queued=options.queue||createParanaQueue({interval:2000,exclusive:work=>work(),readNext:()=>0,writeNext:()=>{}});
 const sessions=new Map<string,Session>();let blockedUntil=0;
 function checkLimit(response:Response){
  const location=response.headers.get('location');
  if(response.status===429||(location&&new URL(location,base).pathname.startsWith('/challenge'))||response.url.includes('/challenge')){
   const retry=Number(response.headers.get('Retry-After'));
   blockedUntil=now()+Math.min(300000,Math.max(60000,Number.isFinite(retry)?retry*1000:60000));
   throw limitError();
  }
 }
 async function bootstrap(key:string,signal?:AbortSignal){
  const response=await fetcher(base+'/produtos/',{headers:{Accept:'text/html'},redirect:'manual',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
  checkLimit(response);
  if(!response.ok)throw new AccessError('O Preço da Hora Bahia não iniciou a sessão de consulta. Tente novamente.',502,'BAHIA_SESSION_UNAVAILABLE');
  const cookies=new Map<string,string>();updateCookies(response,cookies);
  const session={cookies,csrf:csrfFromHtml(await limitedText(response)),expires:now()+10*60000};
  if(sessions.size>=500)sessions.delete(sessions.keys().next().value!);
  sessions.set(key,session);return session;
 }
 return async function search(query:URLSearchParams,userId:string,signal?:AbortSignal){
  const request=bahiaRequest(query),key=createHash('sha256').update(userId).digest('hex');
  const queueKey=base+'/produtos/?request='+createHash('sha256').update(key+'|'+request.body.toString()).digest('hex');
  const result=await queued(queueKey,async()=>{
   if(signal?.aborted)throw new AccessError('Consulta da Bahia cancelada.',499);
   if(blockedUntil>now())throw limitError();
   let session=sessions.get(key);
   if(!session||session.expires<=now())session=await bootstrap(key,signal);
   for(let attempt=0;attempt<2;attempt++){
    const response=await fetcher(base+'/produtos/',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',Origin:base,Referer:base+'/produtos/','X-CSRFToken':session.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:[...session.cookies].map(([name,value])=>name+'='+value).join('; ')},body:request.body,redirect:'manual',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
    checkLimit(response);updateCookies(response,session.cookies);
    const text=await limitedText(response);
    // Refresh a genuinely expired CSRF session once. Never rotate sessions to bypass a limit/challenge.
    if(attempt===0&&response.status===403&&/\bcsrf\b/i.test(text)&&!/captcha|challenge/i.test(text)){session=await bootstrap(key,signal);continue;}
    if(!response.ok)throw new AccessError('Não foi possível consultar o Preço da Hora Bahia. Tente novamente em instantes.',502,'BAHIA_UPSTREAM_UNAVAILABLE');
    let data;try{data=JSON.parse(text);}catch{throw new AccessError('O Preço da Hora Bahia retornou uma resposta inválida. Tente novamente.',502,'BAHIA_INVALID_RESPONSE');}
    if(Number(data?.codigo)===429){blockedUntil=now()+60000;throw limitError();}
    return Response.json(data);
   }
   throw new AccessError('A sessão de consulta da Bahia expirou. Tente novamente.',502,'BAHIA_SESSION_UNAVAILABLE');
  });
  return {data:await result.json(),request};
 };
}

export const bahiaSearch=createBahiaService();
