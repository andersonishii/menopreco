import {requireSearch,fail} from '../../../lib/credit-server';
export async function GET(request:Request){
 const local=new URL(request.url).searchParams.get('local');
 const raio=new URL(request.url).searchParams.get('raio')||(new URL(request.url).searchParams.has('tp_comb')?'7':'22');
 if(!/^\d+$/.test(raio)||Number(raio)<1||Number(raio)>30)return Response.json({error:'Informe um raio entre 1 e 30 km.'},{status:400});
 if(!local||! /^[0123456789bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(local))return Response.json({error:'Selecione uma cidade válida.'},{status:400});
 const query=new URL(request.url).searchParams,termo=query.get('termo')?.trim(),gtin=query.get('gtin')?.trim();
 const fuel=query.get('tp_comb');
 const categoria=query.get('categoria'),offset=query.get('offset')||'0',ordem=query.get('ordem')||'0';
 if(!['0','1','2','3'].includes(ordem)||!/^\d+$/.test(offset))return Response.json({error:'Página ou ordenação inválida.'},{status:400});
 if(fuel!==null&&!['1','2','3','4','5'].includes(fuel))return Response.json({error:'Combustível inválido.'},{status:400});
 if(fuel===null&&(gtin?!/^(\d{8}|\d{12,14})$/.test(gtin):(!termo||termo.length>120||!categoria||!/^\d+$/.test(categoria))))return Response.json({error:'Código de barras ou descrição e categoria inválidos.'},{status:400});
 const params=new URLSearchParams({local,raio,offset,data:fuel?'3':'-1',ordem,...(fuel?{tp_comb:fuel}:gtin?{gtin}:{termo:termo!,categoria:categoria!})});
 try{await requireSearch(request);}catch(e){return fail(e);}
 try{const response=await fetch(new Request('https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)}));if(!response.ok)throw new Error();const data=await response.json() as {produtos?:unknown};if(!Array.isArray(data.produtos))throw new Error();return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Não foi possível consultar o Nota Paraná. Tente novamente.'},{status:502});}
}
