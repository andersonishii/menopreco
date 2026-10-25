import {regionalStates,isRegionalProvider} from '../../../../lib/search-provider';
import {participatingStates} from '../../../../lib/brasil-server';
import {fail} from '../../../../lib/credit-server';
export async function GET(){try{return Response.json({estados:[...regionalStates,...(await participatingStates()).filter(s=>!isRegionalProvider(s.sigla))]},{headers:{'Cache-Control':'public, max-age=300'}});}catch(error){return fail(error);}}
