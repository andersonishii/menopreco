import {assertParanaProducts,ParanaResponseError,paranaBusyResponse,paranaOffset,paranaPriceRange,paranaProductsUrl} from './parana-response';
import {readDescriptionResponse} from './description-response';
import {latestStoreOffers} from './latest-offers';
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const categoryError=(upstreamStatus?:number)=>json({...(upstreamStatus?{upstreamStatus}:{}),error:'Não foi possível consultar as categorias no Nota Paraná. Tente novamente em instantes.',code:'PARANA_CATEGORIES_UNAVAILABLE'},502);
export async function paranaFetch(request:Request,enrich?:(offers:any[])=>Promise<any[]>):Promise<Response>{
 const target=new URL(request.url),query=target.searchParams,categories=target.pathname.endsWith('/categorias');
 const local=query.get('local'),raio=query.get('raio')||(query.has('tp_comb')?'7':'22');
 if(!local||!/^[0123456789bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(local))return json({error:'Selecione uma cidade válida.'},400);
 if(!/^\d+$/.test(raio)||Number(raio)<1||Number(raio)>30)return json({error:'Informe um raio entre 1 e 30 km.'},400);
 const termo=query.get('termo')?.trim(),gtin=query.get('gtin')?.trim(),fuel=query.get('tp_comb'),categoria=query.get('categoria'),offset=query.get('offset')||'0',ordem=query.get('ordem')||'0';
 let upstream:string;
 if(categories){
  if(!termo||termo.length>120)return json({error:'Informe uma descrição de até 120 caracteres.'},400);
  upstream='https://menorpreco.notaparana.pr.gov.br/api/v1/categorias?'+new URLSearchParams({local,termo,raio});
 }else{
  if(!['0','1','2','3'].includes(ordem)||!/^\d+$/.test(offset))return json({error:'Página ou ordenação inválida.'},400);
  if(fuel!==null&&!['1','2','3','4','5'].includes(fuel))return json({error:'Combustível inválido.'},400);
  if(fuel===null&&(gtin?!/^(\d{8}|\d{12,14})$/.test(gtin):(!termo||termo.length>120||!categoria||!/^\d+$/.test(categoria))))return json({error:'Código de barras ou descrição e categoria inválidos.'},400);
  const hasRange=query.has('valor_min')||query.has('valor_max'),range=hasRange?paranaPriceRange({min:query.get('valor_min'),max:query.get('valor_max')}):null;
  if(hasRange&&!range)return json({error:'Faixa de preços inválida.'},400);
  const params=new URLSearchParams({local,raio,offset:String(paranaOffset(offset)),data:'3',ordem,...(fuel?{tp_comb:fuel}:gtin?{gtin}:{termo:termo!,categoria:categoria!})});
  if(range){params.set('valor_min',range.min);params.set('valor_max',range.max);}
  upstream=paranaProductsUrl(params);
 }
 try{
  const response=await fetch(upstream,{headers:{Accept:'application/json, text/plain, */*'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok){
   const busy=await paranaBusyResponse(response);if(busy){const headers=new Headers(busy.headers);if(response.status===500)headers.set('Retry-After','8');return Response.json({...await busy.json(),upstreamStatus:response.status},{status:busy.status,headers});}
   if(categories&&(response.status===401||response.status===403))return json({error:'O serviço do Nota Paraná recusou a consulta. Tente novamente mais tarde.',code:'PARANA_UPSTREAM_REJECTED'},502);
   return categories?categoryError(response.status):json({error:'Não foi possível consultar o Nota Paraná. Tente novamente.',code:'PARANA_UPSTREAM_UNAVAILABLE',upstreamStatus:response.status},502);
  }
  const data=await response.json();
  if(categories)return json({categorias:readDescriptionResponse(data).categories});
  assertParanaProducts(data,local,gtin);
  let offers=data.produtos.map(offer=>({...offer,priceHistory:undefined,historyUnavailable:true}));
  if(enrich)try{offers=await enrich(offers);}catch{/* Display prices even when history is unavailable. */}
  return json({...data,sourceCount:data.produtos.length,produtos:latestStoreOffers(offers)});
 }catch(error){
  if(error instanceof ParanaResponseError)return json({error:'O Nota Paraná retornou dados inconsistentes para esta busca. Tente novamente em instantes.',code:error.code},502);
  return categories?categoryError():json({error:'Não foi possível consultar o Nota Paraná. Tente novamente.',code:'PARANA_UPSTREAM_UNAVAILABLE'},502);
 }
}
