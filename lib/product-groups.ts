export type Offer={id:string;gtin?:string;desc:string;tempo:string;datahora?:string;valor_tabela:string;distkm:string;estabelecimento:{nm_emp:string;bairro:string;mun:string}};
export function groupOffers(offers:Offer[]){
 const groups=new Map<string,{key:string;gtin:string|null;offers:Offer[]}>();
 for(const offer of offers){const code=String(offer.gtin??'').trim();const gtin=/^(\d{8}|\d{12,14})$/.test(code)&&!/^0+$/.test(code)?code.padStart(14,'0'):null;const key=gtin??'offer:'+offer.id;let group=groups.get(key);if(!group){group={key,gtin,offers:[]};groups.set(key,group);}group.offers.push(offer);}
 return [...groups.values()].map(group=>({...group,offers:[...group.offers].sort((a,b)=>{const price=(s:string)=>s.trim()!==''&&Number.isFinite(Number(s))?Number(s):Infinity;return price(a.valor_tabela)-price(b.valor_tabela);})}));
}
