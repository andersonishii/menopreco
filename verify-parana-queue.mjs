import assert from 'node:assert/strict';
const {createParanaQueue}=await import('./lib/parana-queue.ts');
let time=1000,shared=0,active=0,maximum=0;const starts=[],waits=[];
const options={now:()=>time,sleep:async ms=>{waits.push(ms);time+=ms;},readNext:()=>shared,writeNext:value=>{shared=value;},exclusive:work=>work()};
const queue=createParanaQueue(options);
const perform=id=>async()=>{active++;maximum=Math.max(maximum,active);starts.push([id,time]);await Promise.resolve();active--;return Response.json({id});};
const results=await Promise.all([queue('https://official.example/a?x=1&y=2',perform('a')),queue('https://official.example/a?y=2&x=1',perform('duplicate')),queue('https://official.example/b',perform('b')),queue('https://official.example/c',perform('c'))]);
assert.equal(maximum,1);assert.deepEqual(starts,[['a',1000],['b',3000],['c',5000]]);assert.deepEqual(waits,[2000,2000]);assert.deepEqual(await Promise.all(results.map(r=>r.json())),[{id:'a'},{id:'a'},{id:'b'},{id:'c'}]);
// Failure releases the queue and identical requests may be tried again later.
await assert.rejects(()=>queue('https://official.example/fail',async()=>{throw Error('CORS');}),/CORS/);
assert.equal((await queue('https://official.example/fail',perform('recovered'))).status,200);
// The queue must hold the slot until a streamed response body is complete.
let release;const held=new Promise(resolve=>release=resolve);let secondStarted=false;
const streamQueue=createParanaQueue({...options,interval:0,readNext:()=>0,writeNext:()=>{}});
const first=streamQueue('https://official.example/stream',async()=>new Response(new ReadableStream({async start(controller){controller.enqueue(new TextEncoder().encode('ok'));await held;controller.close();}})));
const second=streamQueue('https://official.example/after-stream',async()=>{secondStarted=true;return Response.json({ok:true});});
await new Promise(resolve=>setTimeout(resolve,1));assert.equal(secondStarted,false);release();await Promise.all([first,second]);assert.equal(secondStarted,true);
// Two queue instances model separate tabs sharing one origin lock and timestamp.
let lockTail=Promise.resolve();const locked=work=>{const job=lockTail.then(work);lockTail=job.catch(()=>{});return job;};
time=20000;shared=0;active=0;maximum=0;starts.length=0;
const tabA=createParanaQueue({...options,exclusive:locked}),tabB=createParanaQueue({...options,exclusive:locked});
await Promise.all([tabA('https://official.example/tab-a',perform('tab-a')),tabB('https://official.example/tab-b',perform('tab-b'))]);assert.equal(maximum,1);assert.deepEqual(starts,[['tab-a',20000],['tab-b',22000]]);
console.log('PASS: one official request at a time, two-second spacing, independent clones for identical in-flight queries, stream completion, error recovery and cross-tab locking.');

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
try{
 let performed=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async()=>{throw Error('Unavailable');}}}});
 const fallback=createParanaQueue({interval:0,readNext:()=>0,writeNext:()=>{}});
 await fallback('https://official.example/no-lock',async()=>{performed++;return Response.json({ok:true});});assert.equal(performed,1);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,work)=>work()}}});
 const failure=createParanaQueue({interval:0,readNext:()=>0,writeNext:()=>{}});
 await assert.rejects(()=>failure('https://official.example/failed-network',async()=>{performed++;throw Error('Network failed');}),/Network failed/);assert.equal(performed,2);
}finally{if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
console.log('PASS: unavailable cross-tab locking falls back locally; a real network error never triggers an implicit duplicate request.');
