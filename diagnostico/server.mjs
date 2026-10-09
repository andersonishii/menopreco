import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const page=readFileSync(new URL('./index.html',import.meta.url));
export function diagnosticServer(upstreamFetch=fetch){
 let active=0;
 return createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method!=='GET')return send(405,{error:'Use GET.'});
  const incoming=new URL(req.url,'http://localhost');
  if(incoming.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(page);}
  if(incoming.pathname==='/health')return send(200,{ok:true});
  if(incoming.pathname!=='/api/teste')return send(404,{error:'Página não encontrada.'});
  const q=incoming.searchParams,endpoint=q.get('endpoint')||'categorias',termo=(q.get('termo')||'arroz').trim(),local=q.get('local')||'6gkzqf9vb',raio=q.get('raio')||'2',categoria=q.get('categoria')||'6',ordem=q.get('ordem')||'0';
  if(!['categorias','produtos'].includes(endpoint)||!termo||termo.length>120||!/^[0-9bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(local)||!/^\d+$/.test(raio)||Number(raio)<1||Number(raio)>50||!/^\d+$/.test(categoria)||!['0','1','2','3'].includes(ordem))return send(400,{error:'Revise os parâmetros.'});
  if(active>=2)return send(429,{error:'Há duas consultas em andamento. Aguarde e tente novamente.'});
  const target=new URL('https://menorpreco.notaparana.pr.gov.br/api/v1/'+endpoint);
  target.search=new URLSearchParams({local,termo,raio,...(endpoint==='produtos'?{categoria,offset:'0',data:'-1',ordem}:{})}).toString();
  active++;const started=Date.now();
  try{
   const response=await upstreamFetch(target,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   const reader=response.body?.getReader();let size=0;const chunks=[];
   if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();throw Error('Resposta maior que 2 MB.');}chunks.push(Buffer.from(value));}
   const raw=Buffer.concat(chunks).toString('utf8');let body;try{body=JSON.parse(raw)}catch{body=null;}
   const headers={};for(const name of ['date','server','content-type','cache-control','age','via','vary','etag','x-cache','access-control-allow-origin']){const value=response.headers.get(name);if(value!==null)headers[name]=value;}
   send(200,{consultadoEm:new Date().toISOString(),url:target.toString(),urlFinal:response.url,statusAPI:response.status,duracaoMs:Date.now()-started,formato:Array.isArray(body?.categorias)?'categorias':Array.isArray(body?.produtos)?'produtos':Array.isArray(body)?'lista':'outro',quantidade:body?.categorias?.length??body?.produtos?.length??(Array.isArray(body)?body.length:null),headers,resposta:body??raw});
  }catch(e){send(502,{url:target.toString(),error:e.name==='TimeoutError'?'Tempo limite de 20 segundos.':e.message});}finally{active--;}
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.PORT)||3000;
 diagnosticServer().listen(port,'0.0.0.0',()=>console.log('Diagnóstico iniciado na porta '+port));
}
