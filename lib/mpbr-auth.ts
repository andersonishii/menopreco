import {createCipheriv,createDecipheriv,createHash,hkdfSync,randomBytes,timingSafeEqual} from 'node:crypto';
import {AccessError,cookie,cookies,db} from './credit-server';
const base='https://mprs.sefaz.rs.gov.br/API/ConsultaMenorPrecoBrasil/api/v1/';
const clientId='p-mprs.sefaz.rs.gov.br',redirectUri='br.gov.rs.procergs.mpbr://oauth/auth';
const flowCookie='pp_mpbr_flow';
export const androidRedirectUri='br.com.precoperto.app://oauth/auth';
type Client={clientId:string;redirectUri:string};
type Flow={state:string;nonce:string;verifier:string;expires:number;client?:Client};
export function androidMpbrAvailable(){return process.env.MPBR_ANDROID_REDIRECT_AUTHORIZED==='true'&&!!process.env.MPBR_ANDROID_CLIENT_ID?.trim();}
type Ticket={accessToken:string;refreshToken?:string;expires:number;client?:Client};
export function sealMpbr(data:unknown,userId:string,purpose='token'){
 const secret=process.env.MPBR_TOKEN_ENCRYPTION_KEY||process.env.SUPABASE_SECRET_KEY;if(!secret)throw new AccessError('A conexão nacional ainda não foi configurada.',503);
 const key=Buffer.from(hkdfSync('sha256',secret,'preco-perto-mpbr',purpose,32)),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(purpose+':'+userId));const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function openMpbr<T>(value:string,userId:string,purpose='token'):T{
 try{if(value.length>100000)throw Error();const [version,iv,tag,encrypted,...rest]=value.split('.');if(version!=='v1'||rest.length)throw Error();const secret=process.env.MPBR_TOKEN_ENCRYPTION_KEY||process.env.SUPABASE_SECRET_KEY;if(!secret)throw Error();const key=Buffer.from(hkdfSync('sha256',secret,'preco-perto-mpbr',purpose,32)),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from(purpose+':'+userId));decipher.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')),decipher.final()]).toString());}catch{throw new AccessError('A conexão expirou ou não pertence a esta conta. Inicie uma nova conexão.',428,'MPBR_CONNECTION_REQUIRED');}
}
export function beginMpbr(userId:string,androidRequest?:unknown){
 let client:Client|undefined;
 if(androidRequest!==undefined){
  if(typeof androidRequest!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(androidRequest))throw new AccessError('Abra a conexão pelo aplicativo Android.',400);
  if(!androidMpbrAvailable())throw new AccessError('O retorno do gov.br para o aplicativo Preço Perto ainda aguarda autorização do provedor. O teste de retorno do aplicativo já pode ser usado.',503,'MPBR_ANDROID_NOT_CONFIGURED');
  client={clientId:process.env.MPBR_ANDROID_CLIENT_ID!.trim(),redirectUri:androidRedirectUri};
 }
 const verifier=randomBytes(48).toString('base64url'),state=randomBytes(24).toString('base64url'),nonce=randomBytes(16).toString('base64url');const flow:Flow={verifier,state,nonce,expires:Date.now()+10*60000,...(client?{client}:{})};
 const params=new URLSearchParams({response_type:'code',client_id:client?.clientId||clientId,redirect_uri:client?.redirectUri||redirectUri,scope:'openid email profile govbr_confiabilidades',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 const url='https://sso.acesso.gov.br/authorize?'+params;
 return {url,...(client?{appStartUrl:'br.com.precoperto.app://oauth/start?'+new URLSearchParams({request:String(androidRequest),url})}:{}),header:cookie(flowCookie,sealMpbr(flow,userId,'flow'),600)};
}
export function clearMpbrFlow(){return cookie(flowCookie,'',0);}
async function connectionDb(path:string,init:RequestInit={}){try{return await db(path,init);}catch{throw new AccessError('A conexão individual ao Menor Preço Brasil precisa da atualização do banco de dados no servidor.',503,'MPBR_SETUP_REQUIRED');}}
async function loadTicket(userId:string):Promise<Ticket|null>{const rows=await connectionDb('mpbr_connections?user_id=eq.'+encodeURIComponent(userId)+'&select=token_ciphertext');if(!rows?.[0])return null;return openMpbr<Ticket>(rows[0].token_ciphertext,userId);}
async function saveTicket(userId:string,data:any,previousRefresh?:string,client?:Client){
 if(typeof data.access_token!=='string'||!data.access_token||data.access_token.length>50000)throw new AccessError('O serviço não devolveu um token válido. Inicie uma nova conexão.',502);
 const expirations:number[]=[];const seconds=Number(data.expires_in);if(Number.isFinite(seconds)&&seconds>0)expirations.push(Date.now()+seconds*1000);
 try{const payload=JSON.parse(Buffer.from(data.access_token.split('.')[1],'base64url').toString());if(Number.isFinite(payload.exp))expirations.push(payload.exp*1000);}catch{}
 const expires=Math.min(...expirations);if(!Number.isFinite(expires)||expires<=Date.now())throw new AccessError('O serviço devolveu uma conexão vencida. Inicie novamente.',502);
 const ticket:Ticket={accessToken:data.access_token,refreshToken:typeof data.refresh_token==='string'&&data.refresh_token?data.refresh_token:previousRefresh,expires,...(client?{client}:{})};
 await connectionDb('mpbr_connections?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:userId,token_ciphertext:sealMpbr(ticket,userId),expires_at:new Date(expires).toISOString(),updated_at:new Date().toISOString()})});return ticket;
}
async function tokenRequest(path:string,body:URLSearchParams){let response:Response;try{response=await fetch(base+path,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body.toString(),cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{throw new AccessError('O serviço de autenticação está indisponível. Tente conectar novamente.',502);}
 if(!response.ok)throw new AccessError('O código já foi usado ou expirou. Inicie uma nova conexão e cole o link de retorno completo logo após entrar no gov.br.',428,'MPBR_CONNECTION_REQUIRED');try{return await response.json();}catch{throw new AccessError('O serviço devolveu uma resposta inválida. Tente novamente.',502);}
}
export async function completeMpbr(request:Request,userId:string,raw:unknown){
 if(typeof raw!=='string'||raw.length>16000)throw new AccessError('Cole o link completo de retorno do aplicativo.',400);
 const encrypted=cookies(request)[flowCookie];if(!encrypted)throw new AccessError('Inicie a conexão antes de colar o link de retorno.',400);
 const flow=openMpbr<Flow>(encrypted,userId,'flow');if(flow.expires<Date.now())throw new AccessError('Esta tentativa expirou. Inicie uma nova conexão.',400);
 let url:URL;try{const match=raw.trim().match(/(?:br\.gov\.rs\.procergs\.mpbr|br\.com\.precoperto\.app):\/\/oauth\/auth\?[^\s'"<>]+/);url=new URL(match?match[0]:raw.trim());}catch{throw new AccessError('Cole o link completo, começando com br.gov.rs.procergs.mpbr://oauth/auth, incluindo code e state.',400);}
 if(url.origin!=='null'||url.protocol!==new URL(flow.client?.redirectUri||redirectUri).protocol||url.hostname!=='oauth'||url.pathname!=='/auth'||url.port||url.hash||url.username||url.password)throw new AccessError('O link informado não é o retorno do Menor Preço Brasil.',400);
 if(url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length>1)throw new AccessError('O retorno contém parâmetros inválidos. Inicie novamente.',400);
 const state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';const supplied=Buffer.from(state),expected=Buffer.from(flow.state);if(!state||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new AccessError('Este retorno não pertence à tentativa atual. Abra o link gov.br gerado nesta página.',400);
 if(url.searchParams.has('error'))throw new AccessError('A autorização não foi concluída no gov.br. Inicie novamente.',400);
 if(!code||code.length>10000||/[\s\u2026]/.test(code)||code.includes('...'))throw new AccessError('O código está ausente ou incompleto. Copie o link de retorno completo.',400);
 const params=new URLSearchParams({grant_type:'authorization_code',code,client_id:flow.client?.clientId||clientId,redirect_uri:flow.client?.redirectUri||redirectUri,ambiente:'Producao',code_verifier:flow.verifier});const ticket=await saveTicket(userId,await tokenRequest('Login/token',params),undefined,flow.client);return {connected:true,expiresAt:new Date(ticket.expires).toISOString()};
}
export async function mpbrStatus(userId:string){const ticket=await loadTicket(userId);return {connected:!!ticket&&(ticket.expires>Date.now()||!!ticket.refreshToken),expiresAt:ticket?new Date(ticket.expires).toISOString():null};}
export async function disconnectMpbr(userId:string){await connectionDb('mpbr_connections?user_id=eq.'+encodeURIComponent(userId),{method:'DELETE'});}
const refreshing=new Map<string,Promise<string>>();
export async function mpbrAccessToken(userId:string,forceRefresh=false):Promise<string>{
 const ticket=await loadTicket(userId);if(!ticket)throw new AccessError('Conecte sua conta gov.br ao Menor Preço Brasil para pesquisar neste estado.',428,'MPBR_CONNECTION_REQUIRED');
 if(!forceRefresh&&ticket.expires>Date.now()+300000)return ticket.accessToken;
 if(!ticket.refreshToken){if(!forceRefresh&&ticket.expires>Date.now())return ticket.accessToken;throw new AccessError('Sua conexão ao Menor Preço Brasil expirou. Conecte novamente.',428,'MPBR_CONNECTION_REQUIRED');}
 let task=refreshing.get(userId);if(!task){task=(async()=>{const params=new URLSearchParams({grant_type:'refresh_token',refresh_token:ticket.refreshToken!,client_id:ticket.client?.clientId||clientId,redirect_uri:ticket.client?.redirectUri||redirectUri,ambiente:'Producao'});try{const next=await saveTicket(userId,await tokenRequest('Login/refresh_token',params),ticket.refreshToken,ticket.client);return next.accessToken;}catch(error){if(!forceRefresh&&ticket.expires>Date.now()&&error instanceof AccessError&&error.status>=500)return ticket.accessToken;throw error;}})();refreshing.set(userId,task);task.finally(()=>refreshing.delete(userId)).catch(()=>{});}return task;
}
