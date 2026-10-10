"use client";
import {useEffect,useRef,useState} from 'react';
function CameraView({onDetected,onClose}:{onDetected:(code:string)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),callbacks=useRef({onDetected,onClose});callbacks.current={onDetected,onClose};
 const [message,setMessage]=useState('Abrindo a câmera…'),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let disposed=false,stream:MediaStream|undefined,controls:{stop:()=>void}|undefined;
  const stop=()=>{controls?.stop();stream?.getTracks().forEach(track=>track.stop());};
  const close=()=>callbacks.current.onClose();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
  const visibility=()=>{if(document.hidden)close();};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  void (async()=>{try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use o site em HTTPS para acessar a câmera. Você também pode digitar o código.');
   const {BrowserMultiFormatOneDReader}=await import('@zxing/browser');if(disposed)return;
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(disposed){stop();return;}
   const reader=new BrowserMultiFormatOneDReader();
   controls=await reader.decodeFromStream(stream,video.current!,result=>{
    if(disposed||!result)return;const code=result.getText();if(!/^(\d{8}|\d{12,14})$/.test(code))return;
    disposed=true;stop();callbacks.current.onDetected(code);
   });
   if(disposed){stop();return;}setMessage('Aponte para o código de barras e mantenha a embalagem parada.');
  }catch(error){stop();if(disposed)return;setFailed(true);const name=(error as Error).name;setMessage(name==='NotAllowedError'?'Permita o acesso à câmera nas configurações do navegador, ou digite o código.':name==='NotFoundError'?'Nenhuma câmera encontrada. Digite o código de barras.':name==='NotReadableError'?'A câmera está indisponível ou em uso por outro aplicativo. Feche-o e tente novamente.':(error as Error).message||'Não foi possível abrir a câmera. Digite o código de barras.');}})();
  return()=>{disposed=true;stop();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return <section className="barcode-camera" aria-label="Leitor de código de barras"><div className="camera-heading"><h3>Ler código com a câmera</h3><button type="button" className="example-button" onClick={onClose}>Fechar câmera</button></div><p role={failed?'alert':'status'}>{message}</p>{!failed&&<div className="camera-preview"><video ref={video} muted autoPlay playsInline aria-label="Imagem da câmera"/><div className="camera-frame" aria-hidden="true"/></div>}<p className="shopping-hint">Enquadre todas as barras, com boa iluminação. A leitura preenche o campo; clique em “Buscar preços” para consultar.</p></section>;
}
export default function BarcodeCamera({onDetected,disabled}:{onDetected:(code:string)=>void;disabled:boolean}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState('');
 return <div className="barcode-reader"><button type="button" className="example-button" disabled={disabled} onClick={()=>{setStatus('');setOpen(!open);}}>{open?'Cancelar leitura':'Ler código com a câmera'}</button>{status&&<p role="status">{status}</p>}{open&&<CameraView onClose={()=>setOpen(false)} onDetected={code=>{setOpen(false);setStatus('Código lido: '+code+'. Clique em Buscar preços para consultar.');onDetected(code);}}/>}</div>;
}
