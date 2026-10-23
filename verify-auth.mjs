import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test';process.env.SUPABASE_SECRET_KEY='sb_secret_test';
const {auth}=await import('./lib/credit-server.ts');
for(const [code,status,pattern] of [['over_email_send_rate_limit',429,/limite de envio/],['email_not_confirmed',400,/ativar seu acesso/],['email_address_not_authorized',400,/SMTP/]]){globalThis.fetch=async()=>Response.json({error_code:code},{status});await assert.rejects(()=>auth('signup',{email:'test@example.com',password:'test-only-password'}),e=>e.status===status&&pattern.test(e.message));}
console.log('OK: limites 429, confirmação pendente e SMTP retornam mensagens específicas.');
