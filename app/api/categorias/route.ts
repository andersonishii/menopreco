import {requireSearch,fail} from '../../../lib/credit-server';
import {readDescriptionResponse} from '../../../lib/description-response';
export async function GET(request:Request){
 const local=new URL(request.url).searchParams.get('local');
 const raio=new URL(request.url).searchParams.get('raio')||'20';
 if(!/^\d+$/.test(raio)||Number(raio)<1||Number(raio)>30)return Response.json({error:'Informe um raio entre 1 e 30 km.'},{status:400});
 if(!local||! /^[0123456789bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(local))return Response.json({error:'Selecione uma cidade válida.'},{status:400});
 const termo=new URL(request.url).searchParams.get('termo')?.trim();
 if(!termo||termo.length>120)return Response.json({error:'Informe uma descrição de até 120 caracteres.'},{status:400});
 const url=new URL('https://menorpreco.notaparana.pr.gov.br/api/v1/categorias');url.search=new URLSearchParams({local,termo,raio}).toString();
 try{await requireSearch(request);}catch(e){return fail(e);}
 try{const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();const result=readDescriptionResponse(await response.json());return Response.json(result.kind==='categories'?{categorias:result.categories}:{produtos:result.products},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Não foi possível consultar as categorias no Nota Paraná. Tente novamente em instantes.'},{status:502});}
}
