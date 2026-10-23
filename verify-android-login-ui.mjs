import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=readFileSync('app/android/page.tsx','utf8');
const code=stripTypeScriptTypes(source.slice(source.indexOf(' async function checkConnection(){'),source.indexOf(' async function begin(){')));
async function check(status,body){
 const state={};
 const names=['setBusy','setError','setMessage','setLogin','setAvailable'];
 const values=names.map(name=>value=>{state[name]=value;});
 const checkConnection=new Function(...names,'fetch',code+';return checkConnection;')(...values,async()=>Response.json(body,{status}));
 await checkConnection();assert.equal(state.setBusy,false);return state;
}
let state=await check(401,{error:'Entre na sua conta'});assert.equal(state.setLogin,true);assert.equal(state.setAvailable,false);assert.match(state.setMessage,/conta do Preço Perto abaixo/);assert.match(state.setMessage,/não a conta gov.br/);
state=await check(200,{androidAvailable:false});assert.equal(state.setLogin,false);assert.equal(state.setAvailable,false);assert.match(state.setMessage,/Você já está conectado/);assert.match(state.setMessage,/tela de CPF e senha.*não será aberta/);
state=await check(200,{androidAvailable:true});assert.equal(state.setLogin,false);assert.equal(state.setAvailable,true);assert.match(state.setMessage,/Agora pode iniciar/);
state=await check(503,{error:'Serviço indisponível'});assert.equal(state.setError,'Serviço indisponível');assert.match(state.setMessage,/Não foi possível/);
assert.ok(source.includes('<AccountPanel startWithLogin onAccess={value=>{if(value)void checkConnection();}}/>'));
assert.ok(readFileSync('components/account-panel.tsx','utf8').includes('[signup,setSignup]=useState(!startWithLogin)'));
console.log('PASS: login Preço Perto na mesma página, continuação após login e gov.br indisponível comunicado sem prometer tela de CPF.');
