import test from 'node:test';
import assert from 'node:assert/strict';
import {credentials,validateObject} from '../lib/validation.mjs';
import {hashPassword,verifyPassword} from '../lib/password.mjs';
test('password hashes are salted and reject wrong passwords',async()=>{
 const first=await hashPassword('uma frase de teste longa');
 const second=await hashPassword('uma frase de teste longa');
 assert.notEqual(first,second);assert.ok(!first.includes('uma frase'));
 assert.equal(await verifyPassword('uma frase de teste longa',first),true);
 assert.equal(await verifyPassword('uma senha diferente',first),false);
 assert.equal(await verifyPassword('uma frase de teste longa',null),false);
});
test('credentials normalize email but preserve password spaces',()=>{
 const result=credentials({name:'  Aluno Teste  ',email:'  ALUNO@example.invalid ',password:' uma frase bem longa '},true);
 assert.equal(result.email,'aluno@example.invalid');assert.equal(result.name,'Aluno Teste');assert.equal(result.password,' uma frase bem longa ');
 assert.throws(()=>credentials({name:'A',email:'x@y.invalid',password:'short'},true));
 assert.throws(()=>credentials({email:'not-an-email',password:'x'}));
 assert.throws(()=>credentials({email:'x@y.invalid',password:'x'.repeat(129)}));
 assert.throws(()=>validateObject({lessonId:'html-hello',userId:'another-user'},['lessonId','answer']));
 assert.throws(()=>validateObject([],[]));
});
