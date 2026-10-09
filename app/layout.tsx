import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Preço Perto — Compare preços perto de você',description:'Busque produtos por descrição e compare preços do Nota Paraná.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
