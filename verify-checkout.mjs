import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?n(s+'.ts',c):n(s,c)}});
Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'sb_secret_test',APP_URL:'https://site.example',MERCADO_PAGO_ACCESS_TOKEN:'production-mock',MERCADO_PAGO_TEST_MODE:'false'});
const {POST}=await import('./app/api/checkout/route.ts');let preferences=0;
globalThis.fetch=async url=>{url=String(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:'user-1',email:'test@example.com',email_confirmed_at:'2026-01-01'});if(url.includes('/checkout/preferences')){preferences++;return Response.json({init_point:'https://www.mercadopago.com.br/checkout/mock',sandbox_init_point:'https://sandbox.mercadopago.com.br/mock'});}return Response.json(null);};
const request=()=>new Request('https://site.example/api/checkout',{method:'POST',headers:{origin:'https://site.example',cookie:'pp_auth=mock'}});
for(const mode of ['false','true']){process.env.MERCADO_PAGO_TEST_MODE=mode;const response=await POST(request());assert.equal(response.status,200);assert.equal((await response.json()).url,'https://www.mercadopago.com.br/checkout/mock');}
process.env.MERCADO_PAGO_TEST_MODE='false';process.env.MERCADO_PAGO_ACCESS_TOKEN='TEST-mock';assert.equal((await POST(request())).status,503);assert.equal(preferences,2);
console.log('OK: checkout usa init_point e rejeita token TEST em produção, sem criar preferência.');
