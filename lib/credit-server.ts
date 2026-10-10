import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
const url=()=>process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret=()=>process.env.SUPABASE_SECRET_KEY;
export class AccessError extends Error{status:number;constructor(message:string,status=403){super(message);this.status=status}}
function configured(){if(!url()||!pub()||!secret())throw new AccessError('O cadastro e os créditos ainda não foram configurados no servidor.',503)}
export function sign(value:object){configured();const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',secret()!).update(data).digest('base64url')}
export function verify(value:string):any{try{const [data,mac]=value.split('.');const expected=createHmac('sha256',secret()!).update(data).digest();const supplied=Buffer.from(mac,'base64url');if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;return JSON.parse(Buffer.from(data,'base64url').toString())}catch{return null}}
export function cookies(request:Request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(c=>{const i=c.indexOf('=');return[c.slice(0,i).trim(),c.slice(i+1)]}))}
export function cookie(name:string,value:string,maxAge=31536000){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`}
export async function db(path:string,init:RequestInit={}){configured();const r=await fetch(url()+'/rest/v1/'+path,{...init,headers:{apikey:secret()!,...(secret()!.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+secret()}),'Content-Type':'application/json',...init.headers},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new AccessError('Não foi possível acessar os créditos. Verifique a configuração do banco.',503);const text=await r.text();return text?JSON.parse(text):null}
export async function identity(request:Request){configured();const c=cookies(request);if(c.pp_auth){const r=await fetch(url()+'/auth/v1/user',{headers:{apikey:pub()!,Authorization:'Bearer '+c.pp_auth},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new AccessError('Sua sessão expirou. Entre novamente.',401);const user=await r.json();if(!user.email_confirmed_at)throw new AccessError('Confirme seu e-mail para liberar as consultas.',401);return{id:'user:'+user.id,userId:user.id,email:user.email,guestCookie:null};}const guest=verify(c.pp_guest||'');const id=guest?.id&&/^guest:[0-9a-f-]{36}$/.test(guest.id)?guest.id:'guest:'+randomUUID();return{id,userId:null,email:null,guestCookie:guest?null:cookie('pp_guest',sign({id}))}}
export function scope(params:URLSearchParams){const local=params.get('local');if(!local||! /^[0123456789bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(local))throw new AccessError('Selecione uma cidade válida.',400);const fuel=params.get('tp_comb'),gtin=params.get('gtin'),term=params.get('termo')?.trim();if(fuel&&['1','2','3','4','5'].includes(fuel))return `${local}|fuel:${fuel}`;if(gtin&&/^(\d{8}|\d{12,14})$/.test(gtin))return `${local}|gtin:${gtin}`;if(term&&term.length<=120)return `${local}|term:${term}`;throw new AccessError('Consulta inválida.',400)}
export async function requireSearch(request:Request){const account=await identity(request);if(!account.userId)throw new AccessError('Cadastre-se ou entre para consultar os preços.',401);const grant=verify(request.headers.get('x-search-grant')||'');if(!grant||grant.account!==account.id||grant.scope!==scope(new URL(request.url).searchParams)||grant.exp<Date.now())throw new AccessError('Inicie uma nova consulta para acessar os preços.',403)}
export function fail(error:unknown){const e=error instanceof AccessError?error:new AccessError('Não foi possível concluir a operação. Tente novamente.',500);return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}})}
export function sameOrigin(request:Request){
 const normalize=(value:string|null|undefined)=>{try{const parsed=new URL(value||'');return ['http:','https:'].includes(parsed.protocol)?parsed.origin:null;}catch{return null;}};
 const origin=normalize(request.headers.get('origin'));
 // APP_URL is the public origin; request.url can be internal behind Render's proxy.
 const allowed=normalize(process.env.APP_URL)||new URL(request.url).origin;
 if(!origin||origin!==allowed)throw new AccessError('Origem inválida.',403);
}
export async function auth(path:string,body:object){configured();const r=await fetch(url()+'/auth/v1/'+path,{method:'POST',headers:{apikey:pub()!,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok){
 const messages:Record<string,string>={
 email_address_not_authorized:'O envio de confirmação para este endereço exige configurar um serviço SMTP no Supabase.',
 over_email_send_rate_limit:'O limite de envio de e-mails de confirmação foi atingido. Aguarde antes de tentar novamente e confira sua caixa de entrada e spam.',
 over_request_rate_limit:'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.',
 email_not_confirmed:'Confirme seu e-mail antes de entrar. Confira sua caixa de entrada e spam.',
 invalid_credentials:'E-mail ou senha incorretos.',
 weak_password:'Escolha uma senha mais forte, conforme os requisitos do cadastro.',
 signup_disabled:'O cadastro está desativado no Supabase.',
 email_address_invalid:'Informe um endereço de e-mail válido.'
 };
 const message=messages[data.error_code||data.code]||(r.status===429?'O Supabase limitou temporariamente as tentativas ou o envio de confirmação. Aguarde e confira se recebeu o e-mail antes de tentar novamente.':'Não foi possível entrar ou cadastrar. Confira seus dados ou tente novamente mais tarde.');
 throw new AccessError(message,r.status===429?429:r.status>=500?503:400);
 }return data}

export async function resetPassword(token:string,password:string){configured();const response=await fetch(url()+'/auth/v1/user',{method:'PUT',headers:{apikey:pub()!,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new AccessError('Não foi possível redefinir a senha. Solicite um novo link e escolha uma senha forte.',400);}
