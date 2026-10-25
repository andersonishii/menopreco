const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const runtime=createRequire(path.join(root,'render-app/package.json'));
const ts=runtime('typescript');
// Compile the real source in memory. Per-loader caches isolate state and mocks.
function loader(stubs={}){
 const cache=new Map();
 function load(file){
  file=path.resolve(root,file);
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const localRequire=id=>{
   if(Object.hasOwn(stubs,id))return stubs[id];
   if(!id.startsWith('.'))return runtime(id);
   const base=path.resolve(path.dirname(file),id);
   const found=['','.ts','.tsx','.json'].map(ext=>base+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   if(!found)throw Error('Cannot resolve '+id+' from '+file);
   return found.endsWith('.json')?JSON.parse(fs.readFileSync(found,'utf8')):load(found);
  };
  new Function('require','module','exports',code)(localRequire,module,module.exports);
  return module.exports;
 }
 return load;
}
const store={nm_emp:'Mercado',nm_logr:'Rua A',nr_logr:'10',mun:'Curitiba',uf:'PR'};
function offer(id,price='10',extra={}){return{id,gtin:'7898024394938',desc:'Produto',valor:price,valor_tabela:price,tempo:'recente',distkm:'1',datahora:'2026-01-02T12:00:00Z',estabelecimento:{...store},...extra};}
module.exports={loader,offer,root,runtime,ts};
