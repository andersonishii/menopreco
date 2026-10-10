export async function GET(request:Request){
 const regiao=new URL(request.url).searchParams.get('regiao')?.trim();
 if(!regiao||regiao.length>120)return Response.json({error:'Informe o nome da cidade.'},{status:400});
 try{
 const response=await fetch('https://menorpreco.notaparana.pr.gov.br/mapa/search?'+new URLSearchParams({regiao}),{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data))throw new Error();
 const cidades=data.filter((c:any)=>typeof c.geohash==='string'&&/^[0123456789bcdefghjkmnpqrstuvwxyz]{4,12}$/.test(c.geohash)&&typeof c.display_name==='string'&&/(^|,\s*)(PR|Paraná)(,|$)/i.test(c.display_name)).map((c:any)=>({geohash:c.geohash,name:c.display_name.split(',')[0].trim()}));
 return Response.json({cidades},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Não foi possível consultar as cidades. Tente novamente.'},{status:502});}
}
