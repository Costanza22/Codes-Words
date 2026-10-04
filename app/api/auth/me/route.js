import { userFromRequest } from '../../../../lib/auth.mjs';
import { handle, json } from '../../../../lib/http.mjs';
export const runtime='nodejs';
export async function GET(request){return handle(request,async()=>json({user:await userFromRequest(request)}));}
