// PR and PE use the same regional API, selected by the coordinate geohash.
export function isRegionalProvider(uf?:string|null){return !uf||uf==='PR'||uf==='PE';}
export function requiresGovConnection(uf?:string|null){return !!uf&&!isRegionalProvider(uf);}
export function regionalServiceName(uf?:string|null){return uf==='PE'?'Menor Preço Pernambuco':'Nota Paraná';}
export const regionalStates=[{codUf:41,sigla:'PR',nome:'Paraná',possuiModulo:false},{codUf:26,sigla:'PE',nome:'Pernambuco',possuiModulo:false}];
