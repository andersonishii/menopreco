import {isRegionalProvider} from '../../../../lib/search-provider';
import {AccessError,fail,rateLimit,readJson,requireSearch,sameOrigin} from '../../../../lib/credit-server';
import {paranaFetch} from '../../../../lib/parana-browser';
import {paranaHeaders} from '../../../../lib/parana-response';
import {createParanaQueue} from '../../../../lib/parana-queue';
import {withPriceHistory} from '../../../../lib/price-history-server';
// This queue is distinct from the browser queue and shared by this server process.
const serverQueue=createParanaQueue({exclusive:work=>work(),readNext:()=>0,writeNext:()=>{}});
export async function POST(request:Request){try{
 sameOrigin(request);const account=await requireSearch(request),target=new URL(request.url),kind=target.searchParams.get('tipo');
 if(!['categorias','produtos'].includes(kind||'')||!isRegionalProvider(target.searchParams.get('uf')))throw new AccessError('Consulta alternativa inválida.',400);
 const body=await readJson(request,1024);if(Object.keys(body).length)throw new AccessError('A consulta alternativa não aceita dados de ofertas.',400);
 rateLimit('parana-fallback:'+account.userId,10,60000);
 target.pathname='/api/'+kind;target.searchParams.delete('tipo');
 return await paranaFetch(new Request(target),offers=>withPriceHistory(offers,'PR',account.userId!),{server:true,headers:paranaHeaders(request),signal:request.signal,queue:serverQueue});
 }catch(error){return fail(error);}}
