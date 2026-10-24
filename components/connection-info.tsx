import type {ConnectionSource} from '../lib/connection';
export default function ConnectionInfo({source,cached=false}:{source:ConnectionSource|null;cached?:boolean}){
 if(!source)return null;
 const label=source==='device'?'IP do seu dispositivo':'IP do servidor';
 const description=source==='device'?'A última consulta de preços usou a conexão do seu navegador.':'A última consulta de preços foi realizada pelo servidor do Preço Perto.';
 return <small className="connection-info" title={description+(cached?' Resultado restaurado do cache, sem nova consulta.':'')}>{cached?'Consulta salva':'Conexão da consulta'}: {label}</small>;
}
