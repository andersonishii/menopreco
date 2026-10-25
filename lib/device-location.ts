const stateCodes:Record<string,string>={ACRE:'AC',ALAGOAS:'AL',AMAPA:'AP',AMAZONAS:'AM',BAHIA:'BA',CEARA:'CE','DISTRITO FEDERAL':'DF','ESPIRITO SANTO':'ES',GOIAS:'GO',MARANHAO:'MA','MATO GROSSO':'MT','MATO GROSSO DO SUL':'MS','MINAS GERAIS':'MG',PARA:'PA',PARAIBA:'PB',PARANA:'PR',PERNAMBUCO:'PE',PIAUI:'PI','RIO DE JANEIRO':'RJ','RIO GRANDE DO NORTE':'RN','RIO GRANDE DO SUL':'RS',RONDONIA:'RO',RORAIMA:'RR','SANTA CATARINA':'SC','SAO PAULO':'SP',SERGIPE:'SE',TOCANTINS:'TO'};
const normalized=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function readDeviceLocation(data:any){
 const country=normalized(data?.countryCode),code=normalized(data?.principalSubdivisionCode);
 const uf=country&&country!=='BR'?'':/^BR-[A-Z]{2}$/.test(code)?code.slice(3):country==='BR'?(stateCodes[normalized(data?.principalSubdivision)]||''):'';
 const raw=data?.city||data?.locality;
 return{uf,countryCode:country,name:typeof raw==='string'?raw.trim().slice(0,100):''};
}
export type ReceivedLocation={latitude:number;longitude:number;accuracy?:number;label?:string};
export function validCoordinates(latitude:unknown,longitude:unknown){return typeof latitude==='number'&&Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&typeof longitude==='number'&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180;}
