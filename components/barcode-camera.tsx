"use client";
import {useEffect,useRef,useState} from 'react';
function CameraView({onDetected,onClose,mode}:{onDetected:(code:string)=>void;onClose:()=>void;mode:"search"|"list"}){
 const video=useRef<HTMLVideoElement>(null),callbacks=useRef({onDetected,onClose});callbacks.current={onDetected,onClose};
 const [message,setMessage]=useState('Abrindo a câmera…'),[failed,setFailed]=useState(false),[devices,setDevices]=useState<MediaDeviceInfo[]>([]),[device,setDevice]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let disposed=false,stream:MediaStream|undefined,controls:{stop:()=>void}|undefined,nativeTimer:ReturnType<typeof setTimeout>|undefined,playTimer:ReturnType<typeof setTimeout>|undefined;setFailed(false);setMessage('Abrindo a câmera…');
  const stop=()=>{clearTimeout(nativeTimer);clearTimeout(playTimer);controls?.stop();stream?.getTracks().forEach(track=>track.stop());};
  const close=()=>callbacks.current.onClose();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
  const visibility=()=>{if(document.hidden)close();};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  void (async()=>{try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use o site em HTTPS para acessar a câmera. Você também pode digitar o código.');
   const [{BrowserMultiFormatOneDReader},{DecodeHintType,BarcodeFormat}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);if(disposed)return;
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{...(device?{deviceId:{exact:device}}:{facingMode:{ideal:'environment'}}),width:{ideal:1280},height:{ideal:720}}});
   if(disposed){stop();return;}
   const preview=video.current;if(!preview)throw new Error('Não foi possível iniciar a imagem da câmera. Tente abrir novamente.');
   preview.srcObject=stream;preview.muted=true;preview.setAttribute('playsinline','');
   await Promise.race([preview.play(),new Promise<never>((_,reject)=>{playTimer=setTimeout(()=>reject(new Error('A câmera não iniciou a imagem. Tente novamente ou selecione outra câmera.')),8000);})]);clearTimeout(playTimer);
   if(disposed){stop();return;}
   // Device enumeration is optional and must never delay the live image.
   void navigator.mediaDevices.enumerateDevices().then(list=>{if(!disposed)setDevices(list.filter(d=>d.kind==='videoinput'));}).catch(()=>{});
   const accept=(code:string)=>{if(disposed||! /^(\d{8}|\d{12,14})$/.test(code))return;disposed=true;stop();callbacks.current.onDetected(code);};
   const hints=new Map();hints.set(DecodeHintType.TRY_HARDER,true);hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.ITF]);
   const reader=new BrowserMultiFormatOneDReader(hints,{delayBetweenScanAttempts:250});
   controls=await reader.decodeFromVideoElement(preview,result=>{
    if(result)accept(result.getText());
   });
   if(disposed){stop();return;}setMessage('Aponte para as barras, mantenha a embalagem parada e ajuste a distância para focar.');
   type Detector={detect:(source:HTMLVideoElement)=>Promise<{rawValue:string}[]>};
   const Native=(window as unknown as {BarcodeDetector?:{new(options:{formats:string[]}):Detector;getSupportedFormats:()=>Promise<string[]>}}).BarcodeDetector;
   if(Native)try{const supported=await Native.getSupportedFormats();if(disposed)return;const formats=['ean_13','ean_8','upc_a','upc_e','itf'].filter(f=>supported.includes(f));if(formats.length){const detector=new Native({formats});const scan=async()=>{if(disposed)return;try{if(video.current&&video.current.readyState>=2){const results=await detector.detect(video.current);for(const result of results)accept(result.rawValue);}}catch{}if(!disposed)nativeTimer=setTimeout(()=>void scan(),350);};void scan();}}catch{}
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
