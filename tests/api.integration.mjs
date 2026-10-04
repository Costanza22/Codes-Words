import assert from 'node:assert/strict';
import {lessons} from '../app/lessons.js';
import {randomUUID,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const base=process.env.TEST_ORIGIN||process.env.APP_ORIGIN;
const password='Uma frase de teste! '+randomUUID();
const emails=[`api-a-${randomUUID()}@example.invalid`,`api-b-${randomUUID()}@example.invalid`];
const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
async function call(path,{method='GET',body,cookie,origin=base,contentType='application/json'}={}){
 const response=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':contentType}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie'),cache:response.headers.get('cache-control')};
}
try{
 assert.equal((await call('/api/progress')).status,401);
 assert.equal((await call('/api/auth/register',{method:'POST',origin:'https://attacker.invalid',body:{}})).status,403);
 assert.equal((await call('/api/auth/register',{method:'POST',contentType:'text/plain',body:{}})).status,415);
 assert.equal((await call('/api/auth/register',{method:'POST',body:{name:'Teste',email:emails[0],password:'short'}})).status,400);
 const a=await call('/api/auth/register',{method:'POST',body:{name:'API Test A',email:emails[0].toUpperCase(),password}});
 assert.equal(a.status,201,JSON.stringify(a.body));assert.match(a.cookie,/HttpOnly/);assert.match(a.cookie,/SameSite=Lax/);assert.equal(a.cache,'no-store');
 const cookieA=a.cookie.split(';')[0];
 const b=await call('/api/auth/register',{method:'POST',body:{name:'API Test B',email:emails[1],password}});
 assert.equal(b.status,201);const cookieB=b.cookie.split(';')[0];
 assert.equal((await call('/api/auth/register',{method:'POST',body:{name:'Duplicate',email:emails[0],password}})).status,409);
 const [stored]=await db.execute('SELECT password_hash FROM users WHERE email=?',[emails[0]]);
 assert.match(stored[0].password_hash,/^scrypt\$/);assert.notEqual(stored[0].password_hash,password);
 const rawToken=cookieA.split('=')[1],hash=createHash('sha256').update(rawToken).digest('hex');
 const [sessions]=await db.execute('SELECT token_hash FROM sessions WHERE user_id=?',[a.body.user.id]);assert.equal(sessions[0].token_hash,hash);assert.notEqual(sessions[0].token_hash,rawToken);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:emails[0],password:'incorrect'}})).status,401);
 const draft='<h1>Saved draft</h1>';
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,body:{lessonId:'html-hello',code:draft}})).status,200);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:'html-hello',answer:1}})).body.correct,false);
 assert.deepEqual((await call('/api/progress',{cookie:cookieA})).body.completed,[]);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:'html-hello',answer:0}})).body.correct,true);
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,body:{lessonId:'js-counter',code:''}})).status,200);
 const saved=(await call('/api/progress',{cookie:cookieA})).body;
 assert.deepEqual(saved.completed,['html-hello']);assert.equal(saved.drafts['html-hello'],draft);assert.equal(saved.drafts['js-counter'],'');assert.equal(saved.lastLesson,'js-counter');
 const other=(await call('/api/progress',{cookie:cookieB})).body;assert.deepEqual(other.completed,[]);assert.deepEqual(other.drafts,{});
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieB,body:{lessonId:'html-hello',code:'bad',userId:a.body.user.id}})).status,400);
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,body:{lessonId:'unknown',code:'x'}})).status,400);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:'html-hello',answer:999}})).status,400);
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,body:{lessonId:'html-hello',code:'x'.repeat(17000)}})).status,400);
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,body:{lessonId:'html-hello',code:'x'.repeat(40000)}})).status,413);
 assert.equal((await call('/api/progress',{method:'PUT',cookie:cookieA,origin:'https://attacker.invalid',body:{lessonId:'html-hello',code:'bad'}})).status,403);
 assert.equal((await call('/api/practice',{method:'POST',body:{lessonId:'python-print',code:'print(1)'}})).status,401);
 const py=lessons.find(item=>item.id==='python-print');
 assert.equal((await call('/api/practice',{method:'POST',cookie:cookieA,body:{lessonId:py.id,code:py.code.replace('Hello, world!','Hello, Ana!')}})).body.correct,true);
 assert.equal((await call('/api/practice',{method:'POST',cookie:cookieA,body:{lessonId:py.id,code:''}})).body.correct,false);
 const sum=lessons.find(item=>item.topic==='Python'&&item.kind==='sum');
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:sum.id,answer:[4]}})).body.correct,false);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:sum.id,answer:sum.correct}})).body.correct,true);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:'python-functions',answer:'Não sei a resposta.'}})).body.correct,false);
 assert.equal((await call('/api/progress',{method:'POST',cookie:cookieA,body:{lessonId:'python-functions',answer:'print mostra o valor na tela; return devolve o resultado.'}})).body.correct,true);
 assert.ok((await call('/api/progress',{cookie:cookieA})).body.completed.includes(sum.id));
 const login=await call('/api/auth/login',{method:'POST',cookie:cookieA,body:{email:emails[0],password}});assert.equal(login.status,200);const newCookie=login.cookie.split(';')[0];assert.notEqual(cookieA,newCookie);
 assert.equal((await call('/api/progress',{cookie:cookieA})).status,401);
 assert.equal((await call('/api/progress',{cookie:newCookie})).body.drafts['html-hello'],draft);
 assert.equal((await call('/api/auth/logout',{method:'POST',cookie:newCookie})).status,200);
 assert.equal((await call('/api/progress',{cookie:newCookie})).status,401);
 const loginB=await call('/api/auth/login',{method:'POST',body:{email:emails[1],password}});const expired=loginB.cookie.split(';')[0];
 await db.execute('UPDATE sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY) WHERE user_id=?',[b.body.user.id]);
 assert.equal((await call('/api/progress',{cookie:expired})).status,401);
 let limited;
 for(let i=0;i<9;i++)limited=await call('/api/auth/login',{method:'POST',body:{email:emails[1],password:'incorrect'}});
 assert.equal(limited.status,429);
 console.log('PASS: registration, login, salted password hashes, session hashing/rotation/expiry/logout, saved progress and drafts, user isolation, server grading, input limits, origin protection and login throttling.');
}finally{
 // Limpeza somente das duas contas artificiais criadas por este teste.
 for(const email of emails){await db.execute('DELETE FROM users WHERE email=?',[email]);for(const prefix of ['login:','register:'])await db.execute('DELETE FROM rate_limits WHERE bucket=?',[createHash('sha256').update(prefix+email).digest('hex')]);}
 await db.end();
}
