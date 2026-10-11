export function validCpf(value:string){
 if(!/^\d{11}$/.test(value)||/^(\d)\1{10}$/.test(value))return false;
 const digit=(length:number)=>{let sum=0;for(let i=0;i<length;i++)sum+=Number(value[i])*(length+1-i);const remainder=(sum*10)%11;return remainder===10?0:remainder;};
 return digit(9)===Number(value[9])&&digit(10)===Number(value[10]);
}
