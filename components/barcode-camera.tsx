"use client";
import {useEffect,useRef,useState} from 'react';
function CameraView({onDetected,onClose,mode}:{onDetected:(code:string)=>void;onClose:()=>void;mode:"search"|"list"}){
 const video=useRef<HTMLVideoElement>(null),callbacks=useRef({onDetected,onClose});callbacks.current={onDetected,onClose};
 const [message,setMessage]=useState('Abrindo a câmera…'),[failed,setFailed]=useState(false),[devices,setDevices]=useState<MediaDeviceInfo[]>([]),[device,setDevice]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let disposed=false,stream:MediaStream|undefined,scanTimer:ReturnType<typeof setTimeout>|undefined,playTimer:ReturnType<typeof setTimeout>|undefined;
  let canvas:HTMLCanvasElement|undefined;
  setFailed(false);setMessage('Abrindo a câmera…');
  const stop=()=>{
   clearTimeout(scanTimer);clearTimeout(playTimer);
   stream?.getTracks().forEach(track=>track.stop());
   const element=video.current;if(element&&element.srcObject===stream){element.pause();element.srcObject=null;}
   if(canvas){canvas.width=0;canvas.height=0;}
  };
  const close=()=>{disposed=true;stop();callbacks.current.onClose();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
  const visibility=()=>{if(document.hidden)close();};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  void (async()=>{try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use o site em HTTPS para acessar a câmera. Você também pode digitar o código.');
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{...(device?{deviceId:{exact:device}}:{facingMode:{ideal:'environment'}}),width:{ideal:960},height:{ideal:540},frameRate:{ideal:15,max:20}}});
   if(disposed){stop();return;}
   const preview=video.current;if(!preview)throw new Error('Não foi possível iniciar a imagem da câmera. Tente abrir novamente.');
   preview.srcObject=stream;preview.muted=true;preview.setAttribute('playsinline','');
   await Promise.race([preview.play(),new Promise<never>((_,reject)=>{playTimer=setTimeout(()=>reject(new Error('A câmera não iniciou a imagem. Tente novamente ou selecione outra câmera.')),8000);})]);clearTimeout(playTimer);
   if(disposed){stop();return;}
   void navigator.mediaDevices.enumerateDevices().then(list=>{if(!disposed)setDevices(list.filter(d=>d.kind==='videoinput'));}).catch(()=>{});
   const accept=(code:string)=>{if(disposed||! /^(\d{8}|\d{12,14})$/.test(code))return;disposed=true;stop();callbacks.current.onDetected(code);};
   // Process only the central band, reusing a bounded canvas for both engines.
   canvas=document.createElement('canvas');const context=canvas.getContext('2d',{willReadFrequently:true});
   if(!context)throw new Error('Não foi possível iniciar a leitura. Digite o código de barras.');
   const frame=()=>{
    if(disposed||preview.readyState<2||!preview.videoWidth||!preview.videoHeight)return false;
    const sourceHeight=Math.round(preview.videoHeight*0.6),scale=Math.min(1,960/preview.videoWidth,360/sourceHeight);
    const width=Math.round(preview.videoWidth*scale),height=Math.round(sourceHeight*scale);
    if(canvas!.width!==width||canvas!.height!==height){canvas!.width=width;canvas!.height=height;}
    context.drawImage(preview,0,(preview.videoHeight-sourceHeight)/2,preview.videoWidth,sourceHeight,0,0,width,height);
    return true;
   };
   const fallback=async()=>{
    const [{BrowserMultiFormatOneDReader},{DecodeHintType,BarcodeFormat}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
    if(disposed)return;
    const hints=new Map();hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.ITF]);
    const reader=new BrowserMultiFormatOneDReader(hints);
    return ()=>{if(frame())try{accept(reader.decodeFromCanvas(canvas!).getText());}catch{/* No barcode in this frame. */}};
   };
   type Detector={detect:(source:HTMLCanvasElement)=>Promise<{rawValue:string}[]>};
   const Native=(window as unknown as {BarcodeDetector?:{new(options:{formats:string[]}):Detector;getSupportedFormats:()=>Promise<string[]>}}).BarcodeDetector;
   let decode:(()=>void|Promise<void>)|undefined,nativeErrors=0;
   if(Native)try{
    const supported=await Native.getSupportedFormats();if(disposed)return;
    const formats=['ean_13','ean_8','upc_a','upc_e','itf'].filter(f=>supported.includes(f));
    if(formats.length){const detector=new Native({formats});decode=async()=>{
     if(!frame())return;
     try{const results=await detector.detect(canvas!);nativeErrors=0;for(const result of results)accept(result.rawValue);}
     catch{if(!disposed&&++nativeErrors>=3)decode=await fallback();}
    };}
   }catch{/* Unsupported native detector: use the software reader instead. */}
   if(!decode)decode=await fallback();if(disposed)return;
   setMessage('Aponte para as barras no centro da imagem, mantenha a embalagem parada e ajuste a distância para focar.');
   // One engine and one frame at a time. Slow devices get a longer rest between reads.
   const scan=async()=>{
    if(disposed)return;const started=performance.now();
    try{await decode?.();}catch{if(!disposed){stop();setFailed(true);setMessage('Não foi possível continuar a leitura. Tente abrir novamente ou digite o código de barras.');}return;}
    if(!disposed)scanTimer=setTimeout(()=>void scan(),Math.max(500,(performance.now()-started)*3));
   };
   scanTimer=setTimeout(()=>void scan(),300);
  }catch(error){stop();if(disposed)return;setFailed(true);const name=(error as Error).name;setMessage(name==='NotAllowedError'?'Permita o acesso à câmera nas configurações do navegador, ou digite o código.':name==='NotFoundError'?'Nenhuma câmera encontrada. Digite o código de barras.':name==='NotReadableError'?'A câmera está indisponível ou em uso por outro aplicativo. Feche-o e tente novamente.':(error as Error).message||'Não foi possível abrir a câmera. Digite o código de barras.');}})();
  return()=>{disposed=true;stop();const element=video.current;if(element&&element.srcObject===stream)element.srcObject=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[device,attempt]);
 return <section className="barcode-camera" aria-label="Leitor de código de barras"><div className="camera-heading"><h3>Ler código com a câmera</h3><button type="button" className="example-button" onClick={onClose}>Fechar câmera</button></div><label htmlFor="barcode-device">Câmera</label><select id="barcode-device" value={device} onChange={e=>setDevice(e.target.value)}><option value="">Traseira (automática)</option>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Câmera ${i+1}`}</option>)}</select><p role={failed?'alert':'status'}>{message}</p>{failed&&<button type="button" className="example-button" onClick={()=>setAttempt(n=>n+1)}>Tentar abrir novamente</button>}<div className="camera-preview" hidden={failed}><video ref={video} muted autoPlay playsInline aria-label="Imagem da câmera"/><div className="camera-frame" aria-hidden="true"/></div><p className="shopping-hint">Enquadre todas as barras, com boa iluminação. {mode==='list'?'O código será incluído na lista. Os preços só serão consultados ao clicar em Calcular menor preço.':'Ao reconhecer o código, a câmera fecha e a busca começa automaticamente. A busca consome uma consulta do seu plano.'}</p></section>;
}
export default function BarcodeCamera({onDetected,disabled,mode="search"}:{onDetected:(code:string)=>void;disabled:boolean;mode?:"search"|"list"}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState(''),[another,setAnother]=useState(false);
 const start=()=>{setStatus('');setAnother(false);setOpen(true);};
 return <div className="barcode-reader">{!another&&<button type="button" className="example-button" disabled={disabled} onClick={()=>{if(open)setOpen(false);else start();}}>{open?'Cancelar leitura':'Ler código com a câmera'}</button>}{status&&<p role="status">{status}</p>}{another&&<div><p>Deseja incluir mais um produto?</p><div className="shopping-actions"><button type="button" className="example-button" disabled={disabled} onClick={start}>Sim, ler outro produto</button><button type="button" className="example-button" onClick={()=>{setAnother(false);document.getElementById('shopping-codes')?.focus();}}>Não, finalizar leitura</button></div>{disabled&&<p className="shopping-hint">A lista aceita até 30 códigos por consulta.</p>}</div>}{open&&<CameraView mode={mode} onClose={()=>setOpen(false)} onDetected={code=>{setOpen(false);setStatus(mode==='list'?'Código incluído na lista: '+code+'.':'Código lido: '+code+'. Buscando preços automaticamente…');setAnother(mode==='list');onDetected(code);}}/>}</div>;
}
