import {isRegionalProvider,regionalServiceName} from './search-provider';
import {queueParanaRequest} from './parana-queue';
import {assertParanaProducts,ParanaResponseError,paranaBusyResponse,paranaOffset,paranaPriceRange,paranaProductsUrl} from './parana-response';
import {readDescriptionResponse} from './description-response';
import {latestStoreOffers} from './latest-offers';
class BrowserAccessError extends Error{}
type FetchOptions={headers?:HeadersInit;signal?:AbortSignal;server?:boolean;queue?:typeof queueParanaRequest};
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const categoryError=(upstreamStatus?:number,service='Nota Paraná')=>json({...(upstreamStatus?{upstreamStatus}:{}),error:`Não foi possível consultar as categorias no ${service}. Tente novamente em instantes.`,code:'PARANA_CATEGORIES_UNAVAILABLE'},502);
export async function paranaFetch(request:Request,enrich?:(offers:any[])=>Promise<any[]>,options:FetchOptions={}):Promise<Response>{
 const target=new URL(request.url),query=target.searchParams,categories=target.pathname.endsWith('/categorias'),service=regionalServiceName(query.get('uf'));
 if(!isRegionalProvider(query.get('uf')))return json({error:'Estado não atendido por este serviço regional.'},400);
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
  const response=await (options.queue||queueParanaRequest)(upstream,async()=>{
   const timeout=AbortSignal.timeout(20000),signal=options.signal?AbortSignal.any([timeout,options.signal]):timeout;
   try{return await fetch(upstream,{headers:options.headers||{Accept:'application/json, text/plain, */*'},credentials:'omit',cache:'no-store',signal});}
   catch(error){if(!options.server&&error instanceof TypeError)throw new BrowserAccessError();throw error;}
  });
  if(!response.ok){
   const busy=await paranaBusyResponse(response);if(busy){const headers=new Headers(busy.headers);if(response.status===500)headers.set('Retry-After','8');return Response.json({...await busy.json(),error:`O serviço do ${service} está sobrecarregado. Aguarde alguns instantes e tente novamente.`,upstreamStatus:response.status},{status:busy.status,headers});}
   if(categories&&(response.status===401||response.status===403))return json({error:`O serviço do ${service} recusou a consulta. Tente novamente mais tarde.`,code:'PARANA_UPSTREAM_REJECTED'},502);
   return categories?categoryError(response.status,service):json({error:`Não foi possível consultar o ${service}. Tente novamente.`,code:'PARANA_UPSTREAM_UNAVAILABLE',upstreamStatus:response.status},502);
  }
  const data=await response.json();
  if(categories)return json({categorias:readDescriptionResponse(data).categories});
  assertParanaProducts(data,local,gtin);
  const expectedUf=query.get('uf')||'PR';
  if(data.produtos.some(offer=>offer.estabelecimento?.uf&&offer.estabelecimento.uf!==expectedUf))throw new ParanaResponseError('Estabelecimento fora do estado consultado.');
  let offers=data.produtos.map(offer=>({...offer,priceHistory:undefined,historyUnavailable:true}));
  if(enrich)try{offers=await enrich(offers);}catch{/* Display prices even when history is unavailable. */}
  return json({...data,sourceCount:data.produtos.length,produtos:latestStoreOffers(offers)});
 }catch(error){
  if(error instanceof BrowserAccessError)return json({error:`O navegador não conseguiu acessar o ${service}. Pode haver bloqueio de CORS ou falha de conexão.`,code:'PARANA_BROWSER_ACCESS_UNAVAILABLE'},502);
  if(error instanceof ParanaResponseError)return json({error:`O ${service} retornou dados inconsistentes para esta busca. Tente novamente em instantes.`,code:error.code},502);
  return categories?categoryError(undefined,service):json({error:`Não foi possível consultar o ${service}. Tente novamente.`,code:'PARANA_UPSTREAM_UNAVAILABLE'},502);
 }
}
