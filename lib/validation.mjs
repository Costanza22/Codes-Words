export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function validateObject(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) {
    throw new HttpError(400, 'Dados inválidos.');
  }
}
export function credentials(input, register = false) {
  validateObject(input, register ? ['name', 'email', 'password'] : ['email', 'password']);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (typeof input.password !== 'string' || input.password.length > 128 || input.password.length < (register ? 12 : 1)) {
    throw new HttpError(400, register ? 'Use uma senha de 12 a 128 caracteres.' : 'Informe sua senha.');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (register && (name.length < 2 || name.length > 80 || /[\u0000-\u001f]/.test(name))) throw new HttpError(400, 'Informe um nome entre 2 e 80 caracteres.');
  return { name, email, password: input.password };
}
