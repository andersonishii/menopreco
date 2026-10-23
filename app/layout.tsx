import type {Metadata} from 'next';
import './globals.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Preço Perto — Compare preços perto de você',description:'Compare ofertas registradas em notas fiscais nos estados participantes. Pesquise por nome, código de barras ou lista de compras.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
