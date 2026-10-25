import type {ReceivedLocation} from '../lib/device-location';
export default function ReceivedLocationInfo({location}:{location:ReceivedLocation|null}){
 if(!location)return null;
 const coordinate=(value:number)=>value.toLocaleString('pt-BR',{minimumFractionDigits:6,maximumFractionDigits:6});
 return <small className="received-location">Última localização recebida do navegador: {location.label&&<>{location.label} · </>}latitude {coordinate(location.latitude)} · longitude {coordinate(location.longitude)}{typeof location.accuracy==='number'&&Number.isFinite(location.accuracy)&&location.accuracy>=0&&<> · precisão aproximada de {Math.round(location.accuracy).toLocaleString('pt-BR')} m</>}.</small>;
}
