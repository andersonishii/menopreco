import type {Offer} from './product-groups';
export type Category={id:number;desc:string;qtd:number};
export function readDescriptionResponse(data:unknown):{kind:'categories';categories:Category[]}|{kind:'products';products:Offer[]}{
 const body=data as {categorias?:unknown;produtos?:unknown}|null;
 const categories=Array.isArray(data)?data:body?.categorias;
 if(Array.isArray(categories)&&categories.every(c=>c&&Number.isInteger(c.id)&&typeof c.desc==='string'&&Number.isFinite(Number(c.qtd))))return{kind:'categories',categories};
 const products=body?.produtos;
 if(Array.isArray(products)&&products.every(p=>p&&typeof p.id==='string'&&typeof p.desc==='string'&&typeof p.valor_tabela==='string'))return{kind:'products',products};
 throw new Error('Não foi possível reconhecer a resposta do Nota Paraná. Tente novamente.');
}
