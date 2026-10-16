import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='pub-test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';process.env.MENOR_PRECO_BRASIL_TOKEN='shared-token-must-not-be-used';
const auth=await import('./lib/mpbr-auth.ts');const {GET,POST,DELETE}=await import('./app/api/brasil/conexao/route.ts');
const rows=new Map();let exchanges=0,refreshes=0,claimedCode=false,expectedVerifier;
globalThis.fetch=async(url,init={})=>{const target=new URL(String(url));
 if(target.pathname.endsWith('/auth/v1/user')){const who=init.headers.Authorization.replace('Bearer ','');return Response.json({id:who,email_confirmed_at:'2026-01-01'});}
 if(target.pathname.includes('/rest/v1/mpbr_connections')){if(init.method==='POST'){const row=JSON.parse(init.body);rows.set(row.user_id,row);return new Response('',{status:201});}const user=target.searchParams.get('user_id')?.replace('eq.','');if(init.method==='DELETE'){rows.delete(user);return new Response(null,{status:204});}return Response.json(rows.has(user)?[rows.get(user)]:[]);}
 if(target.pathname.endsWith('/Login/token')){exchanges++;if(claimedCode)return Response.json({error:'invalid_grant'},{status:400});claimedCode=true;const form=new URLSearchParams(init.body);assert.equal(form.get('code_verifier'),expectedVerifier);assert.equal(form.get('redirect_uri'),'br.gov.rs.procergs.mpbr://oauth/auth');assert.equal(form.get('grant_type'),'authorization_code');return Response.json({access_token:'alice-private-token',refresh_token:'alice-private-refresh',expires_in:3600});}
 if(target.pathname.endsWith('/Login/refresh_token')){refreshes++;const form=new URLSearchParams(init.body);assert.equal(form.get('refresh_token'),'alice-private-refresh');return Response.json({access_token:'alice-renewed-token',expires_in:3600});}
 throw Error('unexpected request '+target.pathname);
};
const request=(body,user='alice',flow='',origin='https://site.example')=>new Request('https://site.example/api/brasil/conexao',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:'pp_auth='+user+(flow?'; '+flow:'')},body:JSON.stringify(body)});
assert.equal((await POST(request({action:'begin'},'alice','','https://evil.example'))).status,403);
const start=await POST(request({action:'begin'}));assert.equal(start.status,200);const payload=await start.json(),url=new URL(payload.authorizeUrl),flow=start.headers.get('set-cookie').split(';')[0];assert.equal(url.hostname,'sso.acesso.gov.br');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(payload.verifier,undefined);
expectedVerifier=auth.openMpbr(flow.slice(flow.indexOf('=')+1),'alice','flow').verifier;assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(expectedVerifier).digest('base64url'));assert.ok(expectedVerifier.length>=43);
const callback='br.gov.rs.procergs.mpbr://oauth/auth?code=fake-auth-code&state='+url.searchParams.get('state');
assert.equal((await POST(request({action:'complete',callbackUrl:callback.replace(url.searchParams.get('state'),'wrong-state')},'alice',flow))).status,400);assert.equal(exchanges,0);
assert.equal((await POST(request({action:'complete',callbackUrl:callback},'bob',flow))).status,428);assert.equal(exchanges,0);
const complete=await POST(request({action:'complete',callbackUrl:callback},'alice',flow));assert.equal(complete.status,200);const completeData=await complete.json();assert.equal(completeData.connected,true);assert.equal(completeData.access_token,undefined);assert.match(complete.headers.get('set-cookie'),/Max-Age=0/);assert.equal(exchanges,1);
assert.ok(!rows.get('alice').token_ciphertext.includes('alice-private'));assert.throws(()=>auth.openMpbr(rows.get('alice').token_ciphertext,'bob'));
assert.equal(await auth.mpbrAccessToken('alice'),'alice-private-token');await assert.rejects(()=>auth.mpbrAccessToken('bob'),e=>e.code==='MPBR_CONNECTION_REQUIRED');
let status=await GET(new Request('https://site.example/api/brasil/conexao',{headers:{cookie:'pp_auth=bob'}}));assert.equal((await status.json()).connected,false);
assert.equal((await POST(request({action:'complete',callbackUrl:callback},'alice',flow))).status,428);
rows.get('alice').token_ciphertext=auth.sealMpbr({accessToken:'expired',refreshToken:'alice-private-refresh',expires:Date.now()-1000},'alice');assert.equal(await auth.mpbrAccessToken('alice'),'alice-renewed-token');assert.equal(refreshes,1);
assert.equal((await DELETE(new Request('https://site.example/api/brasil/conexao',{method:'DELETE',headers:{origin:'https://site.example',cookie:'pp_auth=alice'}}))).status,200);assert.equal(rows.has('alice'),false);
console.log('PASS: PKCE, state, isolamento por conta, criptografia, código reutilizado, renovação, desconexão e token compartilhado ignorado.');
