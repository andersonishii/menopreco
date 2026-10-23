import {NextResponse,type NextRequest} from 'next/server';
export function proxy(request:NextRequest){
 const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
 const policy=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV==='development'?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' https: data: blob:","connect-src 'self' https://api.bigdatacloud.net https://menorpreco.notaparana.pr.gov.br","font-src 'self'","worker-src 'self' blob:","media-src 'self' blob:","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'",...(process.env.NODE_ENV==='production'?['upgrade-insecure-requests']:[])].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',policy);
 response.headers.set('X-Frame-Options','DENY');response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','no-referrer');
 response.headers.set('Permissions-Policy','camera=(self), geolocation=(self), microphone=(), payment=()');
 response.headers.set('Cache-Control','private, no-store');
 if(process.env.NODE_ENV==='production')response.headers.set('Strict-Transport-Security','max-age=31536000');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|preco-perto-chrome).*)']};
