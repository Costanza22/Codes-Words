import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { database } from './db.mjs';
import { HttpError } from './validation.mjs';
import { origin } from './http.mjs';
const cookieName = 'cw_session';
const lifespan = 7 * 24 * 60 * 60;
export const digest = value => createHash('sha256').update(value).digest('hex');
export function sessionToken(request) {
  const raw = (request.headers.get('cookie') || '').split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
export async function userFromRequest(request) {
  const token=sessionToken(request); if(!token) return null;
  const [rows]=await database().execute(`SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3)`,[digest(token)]);
  return rows[0] || null;
}
export async function requireUser(request) {
  const user=await userFromRequest(request);if(!user)throw new HttpError(401,'Entre na sua conta para continuar.');return user;
}
export async function createSession(connection, userId, request) {
  const token=randomBytes(32).toString('hex'); const previous=sessionToken(request);
  if(previous) await connection.execute('DELETE FROM sessions WHERE token_hash=?',[digest(previous)]);
  await connection.execute('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 7 DAY))',[digest(token),userId]);
  return token;
}
export function setSessionCookie(response, token) {
  const secure = new URL(origin()).protocol==='https:' ? '; Secure' : '';
  response.headers.set('Set-Cookie',`${cookieName}=${token || ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token?lifespan:0}${secure}`);
  return response;
}
export async function throttle(key, limit = 8) {
  const db=database(), bucket=digest(key);
  await db.execute(`INSERT INTO rate_limits (bucket,attempts,resets_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(resets_at<=UTC_TIMESTAMP(3),1,attempts+1), resets_at=IF(resets_at<=UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 15 MINUTE),resets_at)`,[bucket]);
  const [rows]=await db.execute('SELECT attempts FROM rate_limits WHERE bucket=?',[bucket]);
  if(rows[0].attempts>limit)throw new HttpError(429,'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
}
