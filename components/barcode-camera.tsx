"use client";
import {useEffect,useRef,useState} from 'react';
function CameraView({onDetected,onClose}:{onDetected:(code:string)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),callbacks=useRef({onDetected,onClose});callbacks.current={onDetected,onClose};
 const [message,setMessage]=useState('Abrindo a câmera…'),[failed,setFailed]=useState(false),[devices,setDevices]=useState<MediaDeviceInfo[]>([]),[device,setDevice]=useState('');
 useEffect(()=>{
  let disposed=false,stream:MediaStream|undefined,controls:{stop:()=>void}|undefined,nativeTimer:ReturnType<typeof setTimeout>|undefined;setFailed(false);setMessage('Abrindo a câmera…');
  const stop=()=>{clearTimeout(nativeTimer);controls?.stop();stream?.getTracks().forEach(track=>track.stop());};
  const close=()=>callbacks.current.onClose();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
  const visibility=()=>{if(document.hidden)close();};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  void (async()=>{try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use o site em HTTPS para acessar a câmera. Você também pode digitar o código.');
   const [{BrowserMultiFormatOneDReader},{DecodeHintType,BarcodeFormat}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);if(disposed)return;
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{...(device?{deviceId:{exact:device}}:{facingMode:{ideal:'environment'}}),width:{ideal:1920},height:{ideal:1080}}});
   if(disposed){stop();return;}
   const cameraDevices=await navigator.mediaDevices.enumerateDevices();if(disposed){stop();return;}setDevices(cameraDevices.filter(d=>d.kind==='videoinput'));
   const track=stream.getVideoTracks()[0];try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]} as unknown as MediaTrackConstraints);}catch{}if(disposed){stop();return;}
   const accept=(code:string)=>{if(disposed||! /^(\d{8}|\d{12,14})$/.test(code))return;disposed=true;stop();callbacks.current.onDetected(code);};
   const hints=new Map();hints.set(DecodeHintType.TRY_HARDER,true);hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.ITF]);
   const reader=new BrowserMultiFormatOneDReader(hints,{delayBetweenScanAttempts:250});
   controls=await reader.decodeFromStream(stream,video.current!,result=>{
    if(result)accept(result.getText());
   });
   if(disposed){stop();return;}setMessage('Aponte para as barras, mantenha a embalagem parada e ajuste a distância para focar.');
   type Detector={detect:(source:HTMLVideoElement)=>Promise<{rawValue:string}[]>};
   const Native=(window as unknown as {BarcodeDetector?:{new(options:{formats:string[]}):Detector;getSupportedFormats:()=>Promise<string[]>}}).BarcodeDetector;
   if(Native)try{const supported=await Native.getSupportedFormats();if(disposed)return;const formats=['ean_13','ean_8','upc_a','upc_e','itf'].filter(f=>supported.includes(f));if(formats.length){const detector=new Native({formats});const scan=async()=>{if(disposed)return;try{if(video.current&&video.current.readyState>=2){const results=await detector.detect(video.current);for(const result of results)accept(result.rawValue);}}catch{}if(!disposed)nativeTimer=setTimeout(()=>void scan(),350);};void scan();}}catch{} 
  }catch(error){stop();if(disposed)return;setFailed(true);const name=(error as Error).name;setMessage(name==='NotAllowedError'?'Permita o acesso à câmera nas configurações do navegador, ou digite o código.':name==='NotFoundError'?'Nenhuma câmera encontrada. Digite o código de barras.':name==='NotReadableError'?'A câmera está indisponível ou em uso por outro aplicativo. Feche-o e tente novamente.':(error as Error).message||'Não foi possível abrir a câmera. Digite o código de barras.');}})();
  return()=>{disposed=true;stop();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[device]);
 return <section className="barcode-camera" aria-label="Leitor de código de barras"><div className="camera-heading"><h3>Ler código com a câmera</h3><button type="button" className="example-button" onClick={onClose}>Fechar câmera</button></div><label htmlFor="barcode-device">Câmera</label><select id="barcode-device" value={device} onChange={e=>setDevice(e.target.value)}><option value="">Traseira (automática)</option>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Câmera ${i+1}`}</option>)}</select><p role={failed?'alert':'status'}>{message}</p>{!failed&&<div className="camera-preview"><video ref={video} muted autoPlay playsInline aria-label="Imagem da câmera"/><div className="camera-frame" aria-hidden="true"/></div>}<p className="shopping-hint">Enquadre todas as barras, com boa iluminação. A leitura preenche o campo; clique em “Buscar preços” para consultar.</p></section>;
}
export default function BarcodeCamera({onDetected,disabled}:{onDetected:(code:string)=>void;disabled:boolean}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState('');
 return <div className="barcode-reader"><button type="button" className="example-button" disabled={disabled} onClick={()=>{setStatus('');setOpen(!open);}}>{open?'Cancelar leitura':'Ler código com a câmera'}</button>{status&&<p role="status">{status}</p>}{open&&<CameraView onClose={()=>setOpen(false)} onDetected={code=>{setOpen(false);setStatus('Código lido: '+code+'. Clique em Buscar preços para consultar.');onDetected(code);}}/>}</div>;
}
