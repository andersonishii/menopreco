import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='pub-test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';
delete process.env.MPBR_ANDROID_CLIENT_ID;delete process.env.MPBR_ANDROID_REDIRECT_AUTHORIZED;
const auth=await import('./lib/mpbr-auth.ts');const {GET,POST}=await import('./app/api/brasil/conexao/route.ts');
const rows=new Map();let exchanges=0,refreshes=0,verifier;
globalThis.fetch=async(url,init={})=>{
 const target=new URL(String(url));
 if(target.pathname.endsWith('/auth/v1/user'))return Response.json({id:init.headers.Authorization.replace('Bearer ',''),email_confirmed_at:'2026-01-01'});
 if(target.pathname.includes('/rest/v1/mpbr_connections')){if(init.method==='POST'){const row=JSON.parse(init.body);rows.set(row.user_id,row);return new Response('',{status:201});}const user=target.searchParams.get('user_id')?.replace('eq.','');return Response.json(rows.has(user)?[rows.get(user)]:[]);}
 const form=new URLSearchParams(init.body);
 assert.equal(form.get('redirect_uri'),auth.androidRedirectUri);assert.equal(form.get('client_id'),'authorized-test-android-client');
 if(target.pathname.endsWith('/Login/token')){exchanges++;assert.equal(form.get('code_verifier'),verifier);assert.equal(form.get('code'),'fake-android-code');return Response.json({access_token:'android-private-token',refresh_token:'android-private-refresh',expires_in:3600});}
 if(target.pathname.endsWith('/Login/refresh_token')){refreshes++;assert.equal(form.get('refresh_token'),'android-private-refresh');return Response.json({access_token:'android-renewed-token',expires_in:3600});}
 throw Error('Unexpected mocked endpoint');
};
const request=(body,user='alice',flow='',origin='https://site.example')=>new Request('https://site.example/api/brasil/conexao',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:'pp_auth='+user+(flow?'; '+flow:'')},body:JSON.stringify(body)});
const id='A'.repeat(43);
assert.equal(auth.androidMpbrAvailable(),false);
assert.equal((await POST(request({action:'begin_android',request:'invalid'}))).status,400);
const blocked=await POST(request({action:'begin_android',request:id}));assert.equal(blocked.status,503);assert.equal((await blocked.json()).code,'MPBR_ANDROID_NOT_CONFIGURED');assert.equal(blocked.headers.get('set-cookie'),null);
process.env.MPBR_ANDROID_CLIENT_ID='authorized-test-android-client';assert.equal(auth.androidMpbrAvailable(),false);process.env.MPBR_ANDROID_REDIRECT_AUTHORIZED='true';
assert.equal((await POST(request({action:'begin_android',request:id},'alice','','https://evil.example'))).status,403);
const start=await POST(request({action:'begin_android',request:id}));assert.equal(start.status,200);
const payload=await start.json(),url=new URL(payload.authorizeUrl),app=new URL(payload.appStartUrl),flow=start.headers.get('set-cookie').split(';')[0];
assert.equal(url.searchParams.get('redirect_uri'),auth.androidRedirectUri);assert.equal(app.protocol,'br.com.precoperto.app:');assert.equal(app.pathname,'/start');assert.equal(app.searchParams.get('request'),id);assert.equal(app.searchParams.get('url'),payload.authorizeUrl);
verifier=auth.openMpbr(flow.slice(flow.indexOf('=')+1),'alice','flow').verifier;assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(verifier).digest('base64url'));assert.equal(payload.verifier,undefined);
const callback=auth.androidRedirectUri+'?code=fake-android-code&state='+url.searchParams.get('state');
for(const invalid of [callback.replace('br.com.precoperto.app','br.gov.rs.procergs.mpbr'),callback.replace(url.searchParams.get('state'),'invalid-state'),callback+'&state=duplicate',callback+'&code=duplicate'])assert.equal((await POST(request({action:'complete',callbackUrl:invalid},'alice',flow))).status,400);
assert.equal((await POST(request({action:'complete',callbackUrl:callback},'bob',flow))).status,428);assert.equal(exchanges,0);
const completed=await POST(request({action:'complete',callbackUrl:callback},'alice',flow));assert.equal(completed.status,200);const result=await completed.json();assert.equal(result.connected,true);assert.equal(result.access_token,undefined);assert.equal(exchanges,1);
const ticket=auth.openMpbr(rows.get('alice').token_ciphertext,'alice');assert.equal(ticket.client.redirectUri,auth.androidRedirectUri);assert.equal(ticket.client.clientId,'authorized-test-android-client');assert.ok(!rows.get('alice').token_ciphertext.includes('android-private-token'));
rows.get('alice').token_ciphertext=auth.sealMpbr({...ticket,expires:Date.now()-1000},'alice');assert.equal(await auth.mpbrAccessToken('alice'),'android-renewed-token');assert.equal(refreshes,1);
const status=await GET(new Request('https://site.example/api/brasil/conexao',{headers:{cookie:'pp_auth=alice'}}));assert.equal((await status.json()).androidAvailable,true);
console.log('PASS: Android bloqueado sem autorização, callback próprio, PKCE, state, conta, duplicatas, criptografia e renovação com cliente correto. Login gov.br simulado.');
