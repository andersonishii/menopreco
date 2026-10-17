export const siteOrigin='https://menopreco-1.onrender.com';
export const redirect='br.gov.rs.procergs.mpbr://oauth/auth';
export function eventReturn(method,params){
 if(method==='Log.entryAdded')return params.entry?.text;
 if(['Page.frameRequestedNavigation','Page.frameScheduledNavigation','Page.frameStartedNavigating'].includes(method))return params.url;
 if(method==='Network.responseReceivedExtraInfo'&&params.statusCode>=300&&params.statusCode<400)return Object.entries(params.headers||{}).find(([name])=>name.toLowerCase()==='location')?.[1];
 if(method==='Network.requestWillBeSent')return params.request?.url;
 return null;
}
export function authorize(value){
 const url=new URL(value);
 if(url.origin!=='https://sso.acesso.gov.br'||url.pathname!=='/authorize'||url.username||url.password||url.hash)throw Error('Endereço de login inválido.');
 const p=url.searchParams;
 if(p.get('client_id')!=='p-mprs.sefaz.rs.gov.br'||p.get('redirect_uri')!==redirect||p.get('response_type')!=='code'||p.get('code_challenge_method')!=='S256'||!/^[\w-]{43}$/.test(p.get('code_challenge')||'')||!/^[\w-]{20,128}$/.test(p.get('state')||''))throw Error('Tentativa de conexão inválida.');
 return {url:url.href,state:p.get('state')};
}
export function callback(text,state){
 if(typeof text!=='string'||text.length>20000)return null;
 const match=text.match(/br\.gov\.rs\.procergs\.mpbr:\/\/oauth\/auth\?[^\s'"<>]+/);if(!match)return null;
 try{const url=new URL(match[0]),code=url.searchParams.get('code');
 if(url.protocol!=='br.gov.rs.procergs.mpbr:'||url.hostname!=='oauth'||url.pathname!=='/auth'||url.port||url.username||url.password||url.hash||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length!==1||url.searchParams.get('state')!==state||url.searchParams.has('error')||!code||code.length>10000||/[\s\u2026]/.test(code)||code.includes('...'))return null;
 return url.href;
 }catch{return null;}
}
