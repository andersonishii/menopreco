import {readDescriptionResponse} from '../../../lib/description-response';
export async function GET(request:Request){
 const termo=new URL(request.url).searchParams.get('termo')?.trim();
 if(!termo||termo.length>120)return Response.json({error:'Informe uma descrição de até 120 caracteres.'},{status:400});
 const url=new URL('https://menorpreco.notaparana.pr.gov.br/api/v1/categorias');url.search=new URLSearchParams({local:'6gkzq99z5j5f',termo,raio:'20'}).toString();
 try{const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();const result=readDescriptionResponse(await response.json());return Response.json(result.kind==='categories'?{categorias:result.categories}:{produtos:result.products},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Não foi possível consultar as categorias no Nota Paraná. Tente novamente em instantes.'},{status:502});}
}
