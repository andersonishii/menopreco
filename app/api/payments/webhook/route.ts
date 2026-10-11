import {createHmac,timingSafeEqual} from 'node:crypto';
import {fail,AccessError} from '../../../../lib/credit-server';
import {getPayment,applyPayment} from '../../../../lib/payment-server';
export async function POST(request:Request){try{const query=new URL(request.url).searchParams;const body=await request.json();if(body.type!=='payment')return Response.json({ok:true});const id=String(query.get('data.id')||body.data?.id||'');if(!/^\d+$/.test(id))throw new AccessError('Notificação inválida.',400);
 const secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET;
 if(secret){const fields=Object.fromEntries((request.headers.get('x-signature')||'').split(',').map(part=>part.trim().split('=')));const requestId=request.headers.get('x-request-id');if(!fields.ts||!fields.v1||!requestId)throw new AccessError('Assinatura inválida.',401);const manifest=`id:${id};request-id:${requestId};ts:${fields.ts};`;const expected=createHmac('sha256',secret).update(manifest).digest();const supplied=Buffer.from(fields.v1,'hex');if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))throw new AccessError('Assinatura inválida.',401);}
 const payment=await getPayment(id);await applyPayment(payment);return Response.json({ok:true});}catch(e){return fail(e)}}
