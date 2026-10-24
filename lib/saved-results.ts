"use client";
import {useEffect,useRef,useState} from 'react';
const prefix='preco-perto-results-v1:';
export function readSavedResults(key:string){try{const raw=localStorage.getItem(prefix+key);if(!raw||raw.length>2000000)return null;const saved=JSON.parse(raw);if(saved.version!==2||!Number.isFinite(saved.savedAt)||Date.now()-saved.savedAt>30*60000||saved.savedAt>Date.now()+60000||!saved.data){localStorage.removeItem(prefix+key);return null;}return saved;}catch{return null;}}
export function writeSavedResults(key:string,data:unknown,savedAt=Date.now()){try{const raw=JSON.stringify({version:2,savedAt,data});if(raw.length<=2000000)localStorage.setItem(prefix+key,raw);}catch{}}
export function useSavedResults(key:string|null,data:unknown,restore:(data:any,savedAt:number)=>void,canSave=true){
 const callback=useRef(restore);callback.current=restore;const [readyKey,setReadyKey]=useState<string|null>(null);const serialized=JSON.stringify(data);
 const restored=useRef<{key:string;serialized:string;at:number}|null>(null);
 useEffect(()=>{let active=true;setReadyKey(null);if(!key)return;const saved=readSavedResults(key);restored.current=saved?{key,serialized:JSON.stringify(saved.data),at:saved.savedAt}:null;if(saved)callback.current(saved.data,saved.savedAt);
  // Finish hydration on the following task so default state cannot overwrite restored results.
  const timer=setTimeout(()=>{if(active)setReadyKey(key);},0);return()=>{active=false;clearTimeout(timer);};
 },[key]);
 useEffect(()=>{if(!key||readyKey!==key||!canSave)return;const previous=restored.current;if(previous?.key===key&&previous.serialized===serialized)return;const at=Date.now();writeSavedResults(key,JSON.parse(serialized),at);restored.current={key,serialized,at};},[key,readyKey,serialized,canSave]);
}

export function clearPrivateBrowserData(){try{
 const remove:string[]=[];for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key&&(key.startsWith(prefix)||key.startsWith('preco-perto-pix:')||key==='preco-perto-shopping-codes-v2'))remove.push(key);}
 for(const key of remove)localStorage.removeItem(key);
 const saved=JSON.parse(localStorage.getItem('preco-perto-city')||'null');if(saved?.device)localStorage.removeItem('preco-perto-city');
}catch{}}
