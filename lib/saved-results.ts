"use client";
import {useEffect,useRef,useState} from 'react';
const prefix='preco-perto-results-v1:';
export function readSavedResults(key:string){try{const raw=localStorage.getItem(prefix+key);if(!raw||raw.length>2000000)return null;const saved=JSON.parse(raw);if(saved.version!==1||!Number.isFinite(saved.savedAt)||Date.now()-saved.savedAt>30*60000||!saved.data)return null;return saved;}catch{return null;}}
export function writeSavedResults(key:string,data:unknown,savedAt=Date.now()){try{const raw=JSON.stringify({version:1,savedAt,data});if(raw.length<=2000000)localStorage.setItem(prefix+key,raw);}catch{}}
export function useSavedResults(key:string|null,data:unknown,restore:(data:any,savedAt:number)=>void,canSave=true){
 const callback=useRef(restore);callback.current=restore;const [readyKey,setReadyKey]=useState<string|null>(null);const serialized=JSON.stringify(data);
 useEffect(()=>{if(!key){setReadyKey(null);return;}const saved=readSavedResults(key);if(saved)callback.current(saved.data,saved.savedAt);setReadyKey(key);},[key]);
 useEffect(()=>{if(key&&readyKey===key&&canSave)writeSavedResults(key,JSON.parse(serialized));},[key,readyKey,serialized,canSave]);
}
