// PR and PE use the same regional API, selected by the coordinate geohash.
export function isRegionalProvider(uf?:string|null){return !uf||uf==='PR'||uf==='PE';}
export function requiresGovConnection(uf?:string|null){return !!uf&&!isRegionalProvider(uf)&&uf!=='BA';}
export function regionalServiceName(uf?:string|null){return uf==='PE'?'Menor Preço Pernambuco':'Nota Paraná';}
export const regionalStates=[{codUf:41,sigla:'PR',nome:'Paraná',possuiModulo:false},{codUf:26,sigla:'PE',nome:'Pernambuco',possuiModulo:false}];

export const standaloneStates=[...regionalStates,{codUf:29,sigla:'BA',nome:'Bahia',possuiModulo:false}];
export function supportsPriceBounds(uf?:string|null){return isRegionalProvider(uf)||uf==='BA';}
export function priceServiceName(uf?:string|null){return isRegionalProvider(uf)?regionalServiceName(uf):uf==='BA'?'Preço da Hora Bahia':'Menor Preço Brasil';}
