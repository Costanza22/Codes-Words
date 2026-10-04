import { database } from '../../../../lib/db.mjs';
import { sessionToken, digest, setSessionCookie } from '../../../../lib/auth.mjs';
import { handle, json } from '../../../../lib/http.mjs';
export const runtime='nodejs';
export async function POST(request) {
  return handle(request,async()=>{
    const token=sessionToken(request);
    if(token)await database().execute('DELETE FROM sessions WHERE token_hash=?',[digest(token)]);
    return setSessionCookie(json({ok:true}),null);
  },true);
}
