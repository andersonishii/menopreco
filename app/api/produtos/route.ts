export async function GET(request:Request){
 const query=new URL(request.url).searchParams,termo=query.get('termo')?.trim(),gtin=query.get('gtin')?.trim();
 const categoria=query.get('categoria'),offset=query.get('offset')||'0',ordem=query.get('ordem')||'0';
 if(!['0','1','2','3'].includes(ordem)||!/^\d+$/.test(offset))return Response.json({error:'Página ou ordenação inválida.'},{status:400});
 if(gtin?!/^(\d{8}|\d{12,14})$/.test(gtin):(!termo||termo.length>120||!categoria||!/^\d+$/.test(categoria)))return Response.json({error:'Código de barras ou descrição e categoria inválidos.'},{status:400});
 const params=new URLSearchParams({local:gtin?'6gkzqf9vb':'6gkzq99z5j5f',raio:'22',offset,data:'-1',ordem,...(gtin?{gtin}:{termo:termo!,categoria:categoria!})});
 try{const response=await fetch(new Request('https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)}));if(!response.ok)throw new Error();const data=await response.json() as {produtos?:unknown};if(!Array.isArray(data.produtos))throw new Error();return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Não foi possível consultar o Nota Paraná. Tente novamente.'},{status:502});}
}
