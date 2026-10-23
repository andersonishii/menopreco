"use client";
import {useEffect,useRef,useState} from 'react';
import styles from './pilot.module.css';
import AccountPanel from '../../components/account-panel';

export default function AndroidPilot(){
 const started=useRef(false);
 const [mode,setMode]=useState(''),[request,setRequest]=useState(''),[appLink,setAppLink]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('Verificando o aplicativo…'),[available,setAvailable]=useState(false),[busy,setBusy]=useState(false),[login,setLogin]=useState(false);
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const current=new URL(location.href),callback=current.hash.startsWith('#callback=')?current.hash.slice(10):'';
  // Authorization codes stay out of HTTP URLs, referrers and browser history.
  history.replaceState(null,'',current.pathname+current.search);
  if(callback){
   setMode('complete');setMessage('Concluindo sua conexão ao Menor Preço Brasil…');setBusy(true);
   void(async()=>{try{
    const url=new URL(decodeURIComponent(callback));
    if(url.protocol!=='br.com.precoperto.app:'||url.hostname!=='oauth'||url.pathname!=='/auth')throw Error('Retorno do aplicativo inválido. Inicie novamente pelo APK.');
    const response=await fetch('/api/brasil/conexao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'complete',callbackUrl:url.toString()})}),data=await response.json();
    if(!response.ok)throw Error(data.error||'Não foi possível concluir a conexão.');
    setMessage('Conexão concluída! Sua autorização está salva na sua conta do Preço Perto.');
    const back='br.com.precoperto.app://oauth/complete?'+new URLSearchParams({state:url.searchParams.get('state')||''});
    setAppLink(back);location.assign(back);
   }catch(error){setError((error as Error).message);setMessage('A conexão não foi concluída.');}finally{setBusy(false);}})();return;
  }
  const id=current.searchParams.get('request')||'',selected=current.searchParams.get('mode')||'';
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(id)||!['test','connect'].includes(selected)){setError('Abra esta página pelo botão do aplicativo Preço Perto Piloto.');setMessage('Aplicativo Android');return;}
  setMode(selected);setRequest(id);
  if(selected==='test'){
   setMessage('Este teste verifica apenas se o navegador consegue voltar ao aplicativo. Ele não faz login no gov.br e não gera uma autorização.');
   setAppLink('br.com.precoperto.app://oauth/test?'+new URLSearchParams({request:id}));return;
  }
  void checkConnection();
 },[]);
 async function checkConnection(){
  setBusy(true);setError('');setMessage('Verificando sua conta do Preço Perto…');
  try{
   const response=await fetch('/api/brasil/conexao',{cache:'no-store'}),data=await response.json();
   if(response.status===401){setLogin(true);setAvailable(false);setMessage('Primeiro, entre na sua conta do Preço Perto abaixo. Esta é a conta de e-mail e senha do site, não a conta gov.br.');return;}
   if(!response.ok)throw Error(data.error||'Não foi possível verificar sua conta.');
   setLogin(false);setAvailable(!!data.androidAvailable);
   setMessage(data.androidAvailable?'Você já está conectado à conta do Preço Perto. Agora pode iniciar a conexão ao Menor Preço Brasil pelo gov.br.':'Você já está conectado à conta do Preço Perto. O login real do gov.br ainda não está disponível neste piloto: falta autorizar e configurar o retorno para o aplicativo. Por isso, a tela de CPF e senha do gov.br não será aberta.');
  }catch(error){setError((error as Error).message);setMessage('Não foi possível verificar a conexão.');}finally{setBusy(false);}
 }
 async function begin(){
  setBusy(true);setError('');try{
   const response=await fetch('/api/brasil/conexao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'begin_android',request})}),data=await response.json();
   if(!response.ok)throw Error(data.error);
   const link=new URL(data.appStartUrl);if(link.protocol!=='br.com.precoperto.app:'||link.hostname!=='oauth'||link.pathname!=='/start'||link.searchParams.get('request')!==request)throw Error('Resposta inesperada. Abra novamente pelo aplicativo.');
   setAppLink(link.toString());setMessage('Tudo pronto. Toque abaixo para abrir o gov.br no navegador e voltar automaticamente ao aplicativo após o login.');
  }catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 return <main className={styles.page}><a href="/" className={styles.brand}>preço perto</a><section className={styles.card} aria-busy={busy}><span className={styles.badge}>ANDROID · PILOTO 0.1.1</span><h1>{mode==='test'?'Vamos testar o retorno?':mode==='complete'?'Conexão ao Menor Preço Brasil':login?'1. Entre no Preço Perto':'Conexão com gov.br'}</h1><p role="status">{message}</p>{error&&<p className={styles.error} role="alert">{error}</p>}{login&&<div className={styles.loginForm}><AccountPanel startWithLogin onAccess={value=>{if(value)void checkConnection();}}/><p>Depois de entrar, esta página verifica automaticamente se a conexão gov.br está disponível. Você não precisa voltar ao APK para repetir esta etapa.</p></div>}{mode==='connect'&&!login&&!available&&!busy&&!error&&<div className={styles.pending}><strong>Conexão gov.br ainda não habilitada</strong><p>O botão de teste do APK verifica apenas a volta do navegador ao aplicativo. Ele não faz login no gov.br e não obtém token.</p></div>}{mode==='connect'&&available&&!appLink&&<button className={styles.button} disabled={busy} onClick={()=>void begin()}>{busy?'Preparando…':'Preparar conexão com gov.br'}</button>}{appLink&&<a className={styles.button} href={appLink}>{mode==='test'?'Voltar ao aplicativo e concluir teste':mode==='complete'?'Voltar ao aplicativo':'Abrir gov.br pelo aplicativo'}</a>}<a className={styles.secondary} href="/">Ir para as pesquisas</a><small>Use aqui apenas o e-mail e a senha do Preço Perto. O CPF e a senha do gov.br só serão solicitados na página oficial do gov.br quando essa integração estiver habilitada.</small></section></main>;
}
