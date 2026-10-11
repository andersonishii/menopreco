"use client";
import {fullAddress,type Store} from '../lib/offer-details';
export default function StoreAddress({store}:{store?:Store}){
 const address=fullAddress(store);
 if(address==='Endereço não informado')return <>{address}</>;
 const query=address;
 return <a className="store-address store-map-link" onClick={event=>event.stopPropagation()} href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer" title="Abrir endereço no mapa" aria-label={'Abrir no mapa: '+address}><span>{address}</span><span className="map-action">Abrir endereço no mapa ↗</span></a>;
}
