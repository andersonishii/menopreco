export type Category={id:number;desc:string;qtd:number};
export function readDescriptionResponse(data:unknown):{kind:'categories';categories:Category[]}{
 const body=data as {categorias?:unknown}|null;
 const categories=Array.isArray(data)?data:body?.categorias;
 if(Array.isArray(categories)&&categories.length>0&&categories.every(c=>c&&Number.isInteger(c.id)&&typeof c.desc==='string'&&Number.isFinite(Number(c.qtd))))return{kind:'categories',categories};
 throw new Error('Não foi possível encontrar as categorias no Nota Paraná. Tente novamente.');
}
