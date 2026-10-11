"use client";
import {fullAddress,type Store} from '../lib/offer-details';
export default function StoreAddress({store}:{store?:Store}){
 const address=fullAddress(store);
 if(address==='Endereço não informado')return <>{address}</>;
 const query=address;
 return <span className="store-address"><span>{address}</span><a className="store-map-link" onClick={event=>event.stopPropagation()} href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer" title="Abrir endereço no mapa" aria-label={'Abrir no mapa: '+address}>Abrir endereço no mapa <span aria-hidden="true">↗</span></a></span>;
}
