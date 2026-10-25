import {AccessError,fail,rateLimit,requireSearch} from '../../../../lib/credit-server';
import {bahiaSearch} from '../../../../lib/bahia-server';
import {bahiaRequest,bahiaResponse} from '../../../../lib/bahia-products';
import {withPriceHistory} from '../../../../lib/price-history-server';
import {uniqueOffers} from '../../../../lib/description-offers';

export async function GET(request:Request){try{
 const query=new URL(request.url).searchParams;
 // Validate before touching an upstream session, then enforce the application's own search grant.
 bahiaRequest(query);
 const account=await requireSearch(request);
 rateLimit('bahia-search:'+account.userId,24,60000);
 const response=await bahiaSearch(query,account.userId!,request.signal);
 const result=bahiaResponse(response.data,response.request.page,response.request.gtin,response.request);
 // BR is the existing verified-Brazil history partition. A separate provider namespace
 // keeps Bahia observations isolated from MPBR without changing the database schema.
 const produtos=await withPriceHistory(uniqueOffers(result.produtos),'BR',undefined,'bahia');
 return Response.json({...result,produtos},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error instanceof AccessError?error:new AccessError('Não foi possível consultar o Preço da Hora Bahia. Tente novamente.',502,'BAHIA_UPSTREAM_UNAVAILABLE'));}}
