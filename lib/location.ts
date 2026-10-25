import {isRegionalProvider} from './search-provider';
export type SearchLocation={name:string;geohash:string;uf?:string;latitude?:number;longitude?:number;device?:boolean};
export function geohash(latitude:number,longitude:number){const alphabet='0123456789bcdefghjkmnpqrstuvwxyz';let lat=[-90,90],lon=[-180,180],even=true,bits=0,value=0,result='';for(let i=0;i<45;i++){const range=even?lon:lat,coordinate=even?longitude:latitude,mid=(range[0]+range[1])/2;value*=2;if(coordinate>=mid){value++;range[0]=mid;}else range[1]=mid;even=!even;if(++bits===5){result+=alphabet[value];bits=0;value=0;}}return result;}
export function locationParams(location:SearchLocation):Record<string,string>{return location.uf==='PE'?{uf:'PE'}:!isRegionalProvider(location.uf)?{uf:location.uf!,latitude:String(location.latitude),longitude:String(location.longitude)}:{};}
export function productEndpoint(location:SearchLocation){return location.uf==='BA'?'/api/bahia/produtos':!isRegionalProvider(location.uf)?'/api/brasil/produtos':'/api/produtos';}

export function hasDeviceLocation(location?:SearchLocation){return location?.device===true&&typeof location.latitude==='number'&&Number.isFinite(location.latitude)&&Math.abs(location.latitude)<=90&&typeof location.longitude==='number'&&Number.isFinite(location.longitude)&&Math.abs(location.longitude)<=180;}
