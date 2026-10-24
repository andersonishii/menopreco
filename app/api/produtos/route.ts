import {paranaHeaders,assertParanaProducts,ParanaResponseError,paranaPriceRange,paranaOffset,paranaBusyResponse,paranaProductsUrl} from '../../../lib/parana-response';
import {withPriceHistory} from '../../../lib/price-history-server';
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
 const hasRange=query.has('valor_min')||query.has('valor_max');
 const range=hasRange?paranaPriceRange({min:query.get('valor_min'),max:query.get('valor_max')}):null;
 if(hasRange&&!range)return Response.json({error:'Faixa de preços inválida.'},{status:400});
 const params=new URLSearchParams({local,raio,offset:String(paranaOffset(offset)),data:'3',ordem,...(fuel?{tp_comb:fuel}:gtin?{gtin}:{termo:termo!,categoria:categoria!})});
 if(range){params.set('valor_min',range.min);params.set('valor_max',range.max);}
 try{await requireSearch(request);}catch(e){return fail(e);}
 let stage='upstream',upstreamStatus:number|undefined;
 try{
  const response=await fetch(paranaProductsUrl(params),{headers:paranaHeaders(request),cache:'no-store',signal:AbortSignal.timeout(20000)});
  upstreamStatus=response.status;if(!response.ok){const busy=await paranaBusyResponse(response);if(busy)return busy;throw new Error();}
  stage='response';const data=await response.json();assertParanaProducts(data,local,gtin);
  stage='history';const produtos=await withPriceHistory(data.produtos,'PR');
  return Response.json({...data,sourceCount:data.produtos.length,produtos},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const code=error instanceof ParanaResponseError?error.code:stage==='history'?'PARANA_PROCESSING_FAILED':'PARANA_UPSTREAM_UNAVAILABLE';
  console.warn('[parana-products]',{code,stage,upstreamStatus});
  return Response.json({error:'Não foi possível consultar o Nota Paraná. Tente novamente.',code},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
