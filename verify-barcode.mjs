import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(new URL('./render-app/package.json',import.meta.url));
const {MultiFormatOneDReader,RGBLuminanceSource,HybridBinarizer,BinaryBitmap}=require('@zxing/library');
// A synthetic EAN-13 frame, including quiet zones, exercises the camera decoder.
const code='7898024394938';
const left=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const invert=s=>[...s].map(b=>b==='1'?'0':'1').join('');
let bits='0'.repeat(12)+'101';
for(let i=1;i<=6;i++){let pattern=left[Number(code[i])];if(parity[Number(code[0])][i-1]==='G')pattern=[...invert(pattern)].reverse().join('');bits+=pattern;}
bits+='01010';for(let i=7;i<13;i++)bits+=invert(left[Number(code[i])]);bits+='101'+'0'.repeat(12);
const width=bits.length*4,height=160,pixels=new Uint8ClampedArray(width*height).fill(255);
for(let y=10;y<150;y++)for(let x=0;x<width;x++)if(bits[Math.floor(x/4)]==='1')pixels[y*width+x]=0;
const image=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height)));
assert.equal(new MultiFormatOneDReader().decode(image).getText(),code);
console.log('OK: leitor usado na câmera reconhece EAN-13 em quadro de imagem.');
