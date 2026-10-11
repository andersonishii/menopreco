import assert from 'node:assert/strict';
import {validCpf} from './lib/cpf.ts';
assert.equal(validCpf('52998224725'),true);
assert.equal(validCpf('11144477735'),true);
for(const value of ['52998224724','52998224715','11111111111','00000000000','1234567890','123456789012','529.982.247-25','5299822472x',''])assert.equal(validCpf(value),false,value);
console.log('OK: CPF valida ambos os dígitos, rejeita repetidos, tamanho incorreto e caracteres.');
