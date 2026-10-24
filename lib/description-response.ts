export type Category={id:number;desc:string;qtd:number};
export function readDescriptionResponse(data:unknown):{kind:'categories';categories:Category[]}{
 const body=data as {categorias?:unknown;produtos?:unknown;total?:unknown}|null;
 const categories=Array.isArray(data)?data:body?.categorias;
 if(Array.isArray(categories)&&categories.every(c=>c&&Number.isInteger(c.id)&&typeof c.desc==='string'&&Number.isFinite(Number(c.qtd))))return{kind:'categories',categories};
 // The API may return a products-shaped response for a valid search with no matches.
 if(!Array.isArray(data)&&Array.isArray(body?.produtos)&&body.produtos.length===0&&(body.total===0||body.total==='0'))return{kind:'categories',categories:[]};
 throw new Error('Não foi possível encontrar as categorias no Nota Paraná. Tente novamente.');
}
