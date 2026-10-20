import {expandDescriptionOffers} from './description-offers';
import type {Offer} from './product-groups';
export async function expandParanaDescription(offers:Offer[],source:URLSearchParams){
 return expandDescriptionOffers(offers,async gtin=>{
  const results:Offer[]=[];let offset=0;const pages=new Set<string>();
  try{for(let page=0;page<100;page++){
   const params=new URLSearchParams({local:source.get('local')!,raio:source.get('raio')||'22',data:'-1',ordem:source.get('ordem')||'2',gtin,offset:String(offset)});
   const response=await fetch('https://menorpreco.notaparana.pr.gov.br/api/v1/produtos?'+params,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('Falha na consulta por GTIN.');const data=await response.json();if(!Array.isArray(data.produtos))throw Error('Resposta inválida por GTIN.');
   const batch=data.produtos as Offer[];if(!batch.length)return results;
   const signature=JSON.stringify(batch);if(pages.has(signature))throw Error('Paginação repetida.');pages.add(signature);results.push(...batch);offset+=batch.length;
  }
  throw Error('Paginação não concluída.');}catch(error){throw Object.assign(error instanceof Error?error:Error('Consulta incompleta.'),{partialOffers:results});}
 });
}
