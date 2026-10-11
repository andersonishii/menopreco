"use client";
import {useEffect,useRef,useState} from 'react';
type Picture={url:string;source:string};
const pictures=new Map<string,Picture|null>();
export default function ProductImage({code,name}:{code?:string;name:string}){
 const container=useRef<HTMLSpanElement>(null),[image,setImage]=useState<Picture|null>(null);
 useEffect(()=>{setImage(null);if(!code||!container.current)return;let active=true;const key=code.padStart(14,'0');const observer=new IntersectionObserver(entries=>{if(!entries.some(entry=>entry.isIntersecting))return;observer.disconnect();if(pictures.has(key)){setImage(pictures.get(key)||null);return;}
  fetch('/api/product-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,code})}).then(async response=>{if(!response.ok)return null;return (await response.json()).image as Picture|null;}).then(value=>{pictures.set(key,value||null);if(active)setImage(value||null);}).catch(()=>{});
 },{rootMargin:'100px'});observer.observe(container.current);return()=>{active=false;observer.disconnect();};},[code,name]);
 return <span ref={container} className={image?'product-picture':'icon'}>{image?<><img src={image.url} alt={name+' — imagem ilustrativa'} loading="lazy" referrerPolicy="no-referrer" onError={()=>setImage(null)}/><a href={image.source} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>Imagem ilustrativa ↗</a></>:<span aria-hidden="true">▥</span>}</span>;
}
