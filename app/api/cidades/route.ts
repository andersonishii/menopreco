import {isRegionalProvider} from '../../../lib/search-provider';
import municipalities from '../../../lib/municipality-data.json';
import {geohash} from '../../../lib/location';
import {participatingStates} from '../../../lib/brasil-server';
import {fail,AccessError} from '../../../lib/credit-server';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export async function GET(request:Request){try{const query=new URL(request.url).searchParams,uf=query.get('uf')||'PR',regiao=query.get('regiao')?.trim();if(!regiao||regiao.length>120)throw new AccessError('Informe o nome da cidade.',400);if(!isRegionalProvider(uf)&&!(await participatingStates()).some(s=>s.sigla===uf))throw new AccessError('Estado indisponível para pesquisas.',400);const cidades=municipalities.filter(m=>m.uf===uf&&normalize(m.name)===normalize(regiao)).map(m=>({...m,geohash:geohash(m.latitude,m.longitude)}));return Response.json({cidades},{headers:{'Cache-Control':'public,max-age=3600'}});}catch(error){return fail(error);}}
