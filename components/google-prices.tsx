"use client";
export default function GooglePrices({code,name}:{code?:string;name?:string}){
 const query=[name?.trim(),code&&/^\d{8}$|^\d{12,14}$/.test(code)?code:undefined,'preço comprar'].filter(Boolean).join(' ');
 return <a className="google-prices-link" href={'https://www.google.com/search?tbm=shop&q='+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>Ver preços no Google ↗</a>;
}
