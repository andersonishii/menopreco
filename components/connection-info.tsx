import type {ConnectionSource} from '../lib/connection';
export default function ConnectionInfo({source,cached=false,fallback=false}:{source:ConnectionSource|null;cached?:boolean;fallback?:boolean}){
 if(!source)return null;
 const label=source==='device'?'IP do seu dispositivo':fallback?'IP do servidor · após falha no dispositivo':'IP do servidor';
 const description=source==='device'?'A última consulta de preços usou a conexão do seu navegador.':'A última consulta de preços foi realizada pelo servidor do Preço Perto.'+(fallback?' A tentativa inicial pelo seu dispositivo não conseguiu acessar a resposta.':'');
 return <small className="connection-info" title={description+(cached?' Resultado restaurado do cache, sem nova consulta.':'')}>{cached?'Consulta salva':'Conexão da consulta'}: {label}</small>;
}
