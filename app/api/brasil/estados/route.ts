import {participatingStates} from '../../../../lib/brasil-server';
import {fail} from '../../../../lib/credit-server';
export async function GET(){try{return Response.json({estados:[{codUf:41,sigla:'PR',nome:'Paraná',possuiModulo:false},...(await participatingStates()).filter(s=>s.sigla!=='PR')]},{headers:{'Cache-Control':'public, max-age=300'}});}catch(error){return fail(error);}}
