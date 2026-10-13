import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';process.env.APP_URL='https://site.example';
const {POST:plan}=await import('./app/api/plan/route.ts');
const {POST:account}=await import('./app/api/account/route.ts');
const req=(path,body,login=true)=>new Request('https://site.example/api/'+path,{method:'POST',headers:{origin:'https://site.example','content-type':'application/json',...(login?{cookie:'pp_auth=test'}:{})},body:JSON.stringify(body)});
assert.equal((await plan(req('plan',{},false))).status,401);
let granted=false;
globalThis.fetch=async url=>String(url).endsWith('/auth/v1/user')?Response.json({id:'test',email_confirmed_at:'2026-01-01'}):Response.json(granted?-1:(granted=true,2));
assert.deepEqual(await (await plan(req('plan',{}))).json(),{remaining:2});
assert.equal((await plan(req('plan',{}))).status,409);
let called,options;
globalThis.fetch=async(url,init)=>{called=String(url);options=init;return Response.json({})};
assert.equal((await account(req('account',{action:'recover',email:'test@example.com'},false))).status,200);
assert.equal(new URL(called).searchParams.get('redirect_to'),'https://site.example/?recovery=true');
assert.equal((await account(req('account',{action:'reset',accessToken:'test-recovery',password:'test-only-password'},false))).status,200);
assert.equal(options.method,'PUT');assert.equal(options.headers.Authorization,'Bearer test-recovery');
console.log('OK: login obrigatório, gratuito único, link de recuperação e redefinição autenticada.');

globalThis.fetch=async()=>Response.json({error_code:'email_not_confirmed'},{status:400});
let unconfirmed=await account(req('account',{action:'login',email:'test@example.com',password:'test-password'},false));
assert.equal(unconfirmed.status,400);assert.match((await unconfirmed.json()).error,/conta ainda não está ativada/);
globalThis.fetch=async()=>Response.json({msg:'Email not confirmed'},{status:400});
unconfirmed=await account(req('account',{action:'login',email:'test@example.com',password:'test-password'},false));assert.match((await unconfirmed.json()).error,/ativar seu acesso/);
console.log('PASS: conta sem confirmação orienta ativação por e-mail.');

globalThis.fetch=async()=>Response.json({email:'test@example.com',email_confirmed_at:'2026-10-12T12:00:00Z'});
const confirmation=await account(req('account',{action:'confirm',accessToken:'test-token'},false));assert.equal(confirmation.status,200);assert.equal((await confirmation.json()).email,'test@example.com');assert.equal(confirmation.headers.get('set-cookie'),null);
globalThis.fetch=async()=>Response.json({email:'test@example.com'});assert.equal((await account(req('account',{action:'confirm',accessToken:'test-token'},false))).status,400);
console.log('PASS: confirmação validada sem login automático; conta não confirmada rejeitada.');

for(const code of ['invalid_credentials','invalid_login_credentials']){globalThis.fetch=async()=>Response.json({error_code:code},{status:400});const invalid=await account(req('account',{action:'login',email:'test@example.com',password:'incorrect-password'},false));assert.equal(invalid.status,400);assert.match((await invalid.json()).error,/E-mail ou senha inválidos/);}
console.log('PASS: credenciais inválidas retornam orientação clara.');
