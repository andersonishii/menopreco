import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const source=fs.readFileSync('components/barcode-camera.tsx','utf8');
const start=source.indexOf(' useEffect(()=>{')+' useEffect(()=>{'.length;
const end=source.indexOf('\n },[device,attempt]);',start);
const effect=stripTypeScriptTypes('function runEffect(){'+source.slice(start,end)+'}').replace("Promise.all([import('@zxing/browser'),import('@zxing/library')])",'loadReader()');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};};

function setup({native=true,pendingMedia=false,brokenNative=false,slow=false}={}){
 const timers=new Map(),listeners=new Map(),found=[],messages=[],failures=[];
 let timerId=0,stopped=0,paused=0,imports=0,nativeReads=0,softwareReads=0,now=0,constraints,drawn;
 const media=deferred(),detection=deferred();
 const stream={getTracks:()=>[{stop(){stopped++;}}]};
 const preview={srcObject:null,readyState:2,videoWidth:3840,videoHeight:2160,play:async()=>{},pause(){paused++;},setAttribute(){}};
 const canvas={width:0,height:0,getContext:()=>({drawImage(...args){drawn=args;}})};
 class Detector{
  static async getSupportedFormats(){return['ean_13','ean_8'];}
  async detect(image){assert.ok(image.width<=960&&image.height<=360);nativeReads++;if(brokenNative)throw Error('detector unavailable');if(slow)now+=300;return detection.promise;}
 }
 const document={hidden:false,createElement:()=>canvas,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const navigator={mediaDevices:{getUserMedia:async value=>{constraints=value;return pendingMedia?media.promise:stream;},enumerateDevices:async()=>[]}};
 const setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};
 const clearTimeout=id=>timers.delete(id);
 const loadReader=async()=>{imports++;return[{BrowserMultiFormatOneDReader:class{constructor(hints){assert.equal(hints.has('TRY_HARDER'),false);}decodeFromCanvas(image){assert.ok(image.width<=960&&image.height<=360);softwareReads++;throw Error('not found');}}},{DecodeHintType:{POSSIBLE_FORMATS:'formats'},BarcodeFormat:{EAN_13:1,EAN_8:2,UPC_A:3,UPC_E:4,ITF:5}}];};
 let closed=0;
 const cleanup=new Function('video','callbacks','setFailed','setMessage','setDevices','device','window','navigator','document','setTimeout','clearTimeout','performance','loadReader',effect+';return runEffect();')(
  {current:preview},{current:{onDetected:code=>found.push(code),onClose:()=>{closed++;}}},value=>failures.push(value),value=>messages.push(value),()=>{},'',{isSecureContext:true,BarcodeDetector:native?Detector:undefined},navigator,document,setTimeout,clearTimeout,{now:()=>now},loadReader
 );
 const tick=async()=>{assert.equal(timers.size,1);const [id,{fn}]=timers.entries().next().value;timers.delete(id);fn();await flush();};
 return{cleanup,flush,tick,timers,media,detection,stream,document,listeners,found,failures,preview,canvas,get state(){return{stopped,paused,imports,nativeReads,softwareReads,constraints,drawn,closed};}};
}

// Native detection never downloads/starts the software engine, nor overlaps frames.
const native=setup();await flush();assert.equal(native.state.imports,0);assert.equal(native.state.constraints.video.frameRate.max,20);
await native.tick();assert.equal(native.state.nativeReads,1);assert.equal(native.timers.size,0);
assert.ok(native.state.drawn[3]===3840&&native.state.drawn[4]<2160);
native.detection.resolve([{rawValue:'7898024394938'},{rawValue:'7898024394938'}]);await flush();
assert.deepEqual(native.found,['7898024394938']);assert.equal(native.state.stopped,1);assert.equal(native.preview.srcObject,null);assert.equal(native.timers.size,0);native.cleanup();

// Slow work is followed by a longer rest; closing while detection is pending is safe.
const slow=setup({slow:true});await flush();await slow.tick();slow.detection.resolve([]);await flush();
assert.equal([...slow.timers.values()][0].delay,900);slow.cleanup();assert.equal(slow.timers.size,0);
const pending=setup();await flush();await pending.tick();pending.cleanup();pending.detection.resolve([{rawValue:'7898024394938'}]);await flush();assert.deepEqual(pending.found,[]);assert.equal(pending.timers.size,0);

// Unsupported native detection uses one small software frame every 500 ms or longer.
const fallback=setup({native:false});await flush();await fallback.tick();assert.equal(fallback.state.imports,1);assert.equal(fallback.state.nativeReads,0);assert.equal(fallback.state.softwareReads,1);assert.equal([...fallback.timers.values()][0].delay,500);fallback.cleanup();assert.equal(fallback.preview.srcObject,null);
const broken=setup({brokenNative:true});await flush();await broken.tick();await broken.tick();await broken.tick();assert.equal(broken.state.imports,1);await broken.tick();assert.equal(broken.state.nativeReads,3);assert.equal(broken.state.softwareReads,1);broken.cleanup();

// Closing/backgrounding releases the camera, including delayed permission responses.
const late=setup({pendingMedia:true});late.cleanup();late.media.resolve(late.stream);await flush();assert.equal(late.state.stopped,1);assert.equal(late.timers.size,0);
const hidden=setup();await flush();hidden.document.hidden=true;hidden.listeners.get('visibilitychange')();assert.equal(hidden.state.closed,1);assert.equal(hidden.state.stopped,1);assert.equal(hidden.timers.size,0);hidden.cleanup();assert.equal(hidden.listeners.size,0);
console.log('PASS: câmera com leitor exclusivo, quadros limitados, intervalo adaptativo, fallback e liberação ao fechar.');
