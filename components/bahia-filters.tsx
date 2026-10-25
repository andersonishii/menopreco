"use client";
import {bahiaHours,type BahiaCategory} from '../lib/bahia-filters';

export default function BahiaFilters({hours,onHours,categories,selected=[],onCategories,disabled=false}:{hours:number;onHours:(hours:number)=>void;categories?:BahiaCategory[];selected?:string[];onCategories?:(values:string[])=>void;disabled?:boolean}){
 return <fieldset className="bahia-filters" disabled={disabled}>
  <legend>Filtros da Bahia</legend>
  <label htmlFor="bahia-hours">Notas emitidas nas últimas<select id="bahia-hours" value={hours} onChange={event=>onHours(Number(event.target.value))}>{bahiaHours.map(value=><option key={value} value={value}>{value} horas</option>)}</select></label>
  <p>Os filtros serão aplicados na próxima busca. Os preços são consultados no Preço da Hora Bahia.</p>
  {categories!==undefined&&<details><summary>Categorias <span>Opcional{selected.length?' · '+selected.length+' selecionada(s)':''}</span></summary>{selected.length>0&&<button type="button" onClick={()=>onCategories?.([])}>Limpar seleção</button>}{categories.length?<div className="bahia-categories">{categories.map(category=><label key={category.id}><input type="checkbox" checked={selected.includes(String(category.id))} onChange={event=>onCategories?.(event.target.checked?[...selected,String(category.id)]:selected.filter(id=>id!==String(category.id)))}/>{category.desc}</label>)}</div>:<p>As categorias encontradas aparecerão após a primeira busca. Sem seleção, pesquisamos em todas.</p>}</details>}
 </fieldset>;
}
