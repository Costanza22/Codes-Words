import 'server-only';
import { HttpError } from './validation.mjs';
export function origin() {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error('APP_ORIGIN missing');
  const parsed = new URL(value);
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)) throw new Error('HTTPS required');
  return parsed.origin;
}
export function assertOrigin(request) {
  if (request.headers.get('origin') !== origin()) throw new HttpError(403, 'Origem da solicitação não permitida.');
}
export async function jsonBody(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) throw new HttpError(415, 'Envie dados em JSON.');
  if (!request.body) throw new HttpError(400, 'Dados inválidos.');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 32768) { await reader.cancel(); throw new HttpError(413, 'Solicitação muito grande.'); }
    chunks.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Dados inválidos.'); }
}
export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function handle(request, action, mutation = false) {
  try { if (mutation) assertOrigin(request); return await action(); }
  catch (error) {
    if (error instanceof HttpError) {
      const response = json({error:error.message}, error.status);
      if (error.status === 429) response.headers.set('Retry-After','900');
      return response;
    }
    // Não registra senhas, cookies, SQL ou credenciais do banco.
    console.error('API operation failed', error.code || error.name || 'Error');
    return json({error:'Não foi possível concluir agora. Tente novamente.'},503);
  }
}
