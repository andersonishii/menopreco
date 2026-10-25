import {requiresGovConnection} from '../../../../lib/search-provider';
import municipalities from '../../../../lib/municipality-data.json';
import {participatingStates} from '../../../../lib/brasil-server';
import {fail,AccessError} from '../../../../lib/credit-server';
export async function GET(request:Request){try{const uf=new URL(request.url).searchParams.get('uf');if(requiresGovConnection(uf)&&!(await participatingStates()).some(s=>s.sigla===uf))throw new AccessError('Estado indisponível.',400);return Response.json({municipios:municipalities.filter(m=>m.uf===uf).map(m=>({name:m.name}))},{headers:{'Cache-Control':'public,max-age=3600'}});}catch(error){return fail(error);}}
