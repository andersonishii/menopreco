type Exclusive=<T>(work:()=>Promise<T>)=>Promise<T>;
type QueueOptions={interval?:number;now?:()=>number;sleep?:(ms:number)=>Promise<void>;exclusive?:Exclusive;readNext?:()=>number;writeNext?:(time:number)=>void};
const key='preco-perto-parana-next-request';
const readNext=()=>{try{return Number(localStorage.getItem(key))||0;}catch{return 0;}};
const writeNext=(time:number)=>{try{localStorage.setItem(key,String(time));}catch{}};
const exclusive:Exclusive=async work=>{
 let started=false;
 try{
  if(typeof navigator==='undefined'||!navigator.locks)return work();
  return await navigator.locks.request('preco-perto-parana-api',{mode:'exclusive'},()=>{started=true;return work();});
 }catch(error){if(started)throw error;return work();}
};
export function createParanaQueue(options:QueueOptions={}){
 const now=options.now||Date.now,sleep=options.sleep||(ms=>new Promise<void>(resolve=>setTimeout(resolve,ms))),interval=options.interval??2000;
 const lock=options.exclusive||exclusive,read=options.readNext||readNext,write=options.writeNext||writeNext;
 let tail:Promise<unknown>=Promise.resolve(),nextAllowed=0;
 const pending=new Map<string,Promise<Response>>();
 return function queued(url:string,perform:()=>Promise<Response>):Promise<Response>{
  const target=new URL(url);target.searchParams.sort();const requestKey=target.toString();
  const existing=pending.get(requestKey);if(existing)return existing.then(response=>response.clone());
  const task=tail.then(()=>lock(async()=>{
   const shared=read(),validShared=Number.isFinite(shared)&&shared<=now()+60000?shared:0;
   const wait=Math.max(0,Math.max(nextAllowed,validShared)-now());if(wait)await sleep(wait);
   try{
    const response=await perform(),body=await response.arrayBuffer();
    // Retain the slot until the response body is fully received; callers get independent copies.
    return new Response(body.byteLength?body:null,{status:response.status,statusText:response.statusText,headers:response.headers});
   }finally{nextAllowed=now()+interval;write(nextAllowed);}
  }));
  pending.set(requestKey,task);tail=task.then(()=>undefined,()=>undefined);
  const clear=()=>{if(pending.get(requestKey)===task)pending.delete(requestKey);};task.then(clear,clear);
  return task.then(response=>response.clone());
 };
}
export const queueParanaRequest=createParanaQueue();
