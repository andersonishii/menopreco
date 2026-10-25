import {AccessError,fail,readJson,requestLimit,sameOrigin} from '../../../lib/credit-server';
import {readDeviceLocation,validCoordinates} from '../../../lib/device-location';
export async function POST(request:Request){try{
 sameOrigin(request);requestLimit(request,'reverse-location',30);
 const {latitude,longitude}=await readJson(request,512);
 if(!validCoordinates(latitude,longitude))throw new AccessError('Coordenadas inválidas.',400);
 const response=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?'+new URLSearchParams({latitude:String(latitude),longitude:String(longitude),localityLanguage:'pt'}),{cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(8000)])});
 if(!response.ok)throw new AccessError('A localização foi obtida, mas o serviço de identificação da cidade não respondeu. Você pode escolher estado e cidade manualmente.',502);
 return Response.json(readDeviceLocation(await response.json()),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error instanceof AccessError?error:new AccessError('A localização foi obtida, mas não foi possível identificar a cidade agora. Você pode escolher estado e cidade manualmente.',502));}}
