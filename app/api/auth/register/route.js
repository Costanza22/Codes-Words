import { randomUUID } from 'node:crypto';
import { database } from '../../../../lib/db.mjs';
import { credentials, HttpError } from '../../../../lib/validation.mjs';
import { hashPassword } from '../../../../lib/password.mjs';
import { createSession, setSessionCookie, throttle } from '../../../../lib/auth.mjs';
import { handle, json, jsonBody } from '../../../../lib/http.mjs';
export const runtime='nodejs';
export async function POST(request) {
  return handle(request, async()=>{
    const {name,email,password}=credentials(await jsonBody(request),true);
    await throttle('register:global',100);await throttle('register:'+email,5);
    const hash=await hashPassword(password),id=randomUUID();
    const connection=await database().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)',[id,name,email,hash]);
      const token=await createSession(connection,id,request);
      await connection.commit();
      return setSessionCookie(json({user:{id,name,email}},201),token);
    } catch(error) {
      await connection.rollback();
      if(error.code==='ER_DUP_ENTRY')throw new HttpError(409,'Este e-mail já está cadastrado. Entre na sua conta.');
      throw error;
    } finally {connection.release();}
  },true);
}
