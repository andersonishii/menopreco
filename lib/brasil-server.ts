import {requiresGovConnection} from './search-provider';
import {mpbrAccessToken} from './mpbr-auth';
import {AccessError} from './credit-server';
import {enabledStates,type Participant} from './brasil-products';
const base='https://mprs.sefaz.rs.gov.br/API/ConsultaMenorPrecoBrasil/api/v1';
let states:{until:number;value:Participant[]}|null=null;
export async function participatingStates(){if(states&&states.until>Date.now())return states.value;const response=await fetch(base+'/Config/UfsParticipantes',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new AccessError('Não foi possível consultar os estados participantes. Tente novamente.',502);const value=enabledStates(await response.json());states={value,until:Date.now()+3600000};return value;}
export async function validateBrasil(params:URLSearchParams){const uf=params.get('uf'),latitude=Number(params.get('latitude')),longitude=Number(params.get('longitude'));if(!uf||!params.has('latitude')||!params.has('longitude')||!params.get('latitude')?.trim()||!params.get('longitude')?.trim()||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude< -90||latitude>90||longitude< -180||longitude>180)throw new AccessError('Selecione uma localização válida.',400);if(!requiresGovConnection(uf)||!(await participatingStates()).some(s=>s.sigla===uf))throw new AccessError('Este estado ainda não está disponível para pesquisas.',400);return {uf,latitude,longitude};}
export async function brasilSearch(path:string,params:URLSearchParams,userId:string,signal?:AbortSignal){
 const send=(token:string)=>fetch(base+'/'+path+'?'+params,{headers:{Accept:'application/json',Authorization:'Bearer '+token},cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
 let response=await send(await mpbrAccessToken(userId));if(response.status===401)response=await send(await mpbrAccessToken(userId,true));
 if(response.status===401||response.status===403)throw new AccessError('Sua conexão ao Menor Preço Brasil não está autorizada. Conecte novamente.',428,'MPBR_CONNECTION_REQUIRED');if(!response.ok)throw new AccessError('Não foi possível consultar os preços deste estado.',502);return response.json();
}
