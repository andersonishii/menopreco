import {fullAddress,type Store} from '../lib/offer-details';
export default function StoreAddress({store}:{store?:Store}){
 const address=fullAddress(store);
 if(address==='Endereço não informado')return <>{address}</>;
 const query=address;
 return <a className="store-map-link" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer" title="Abrir endereço no mapa" aria-label={'Abrir no mapa: '+address}>{address} <span aria-hidden="true">↗</span></a>;
}
