import { database } from '../../../../lib/db.mjs';
import { credentials, HttpError } from '../../../../lib/validation.mjs';
import { verifyPassword } from '../../../../lib/password.mjs';
import { createSession, setSessionCookie, throttle } from '../../../../lib/auth.mjs';
import { handle, json, jsonBody } from '../../../../lib/http.mjs';
export const runtime='nodejs';
export async function POST(request) {
  return handle(request,async()=>{
    const {email,password}=credentials(await jsonBody(request));
    await throttle('login:global',1000);await throttle('login:'+email);
    const [rows]=await database().execute('SELECT id,name,email,password_hash FROM users WHERE email=?',[email]);
    const user=rows[0];
    if(!await verifyPassword(password,user?.password_hash))throw new HttpError(401,'E-mail ou senha incorretos.');
    const connection=await database().getConnection();
    try {
      await connection.beginTransaction();const token=await createSession(connection,user.id,request);await connection.commit();
      return setSessionCookie(json({user:{id:user.id,name:user.name,email:user.email}}),token);
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },true);
}
