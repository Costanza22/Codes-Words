import 'server-only';
import mysql from 'mysql2/promise';
export function database() {
  if (!process.env.DB_PASSWORD || !process.env.DB_NAME || !process.env.DB_USER) throw new Error('Database configuration missing');
  if (!globalThis.codeWordsPool) {
    globalThis.codeWordsPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      connectionLimit: 5, waitForConnections: true, queueLimit: 30, connectTimeout: 5000,
      charset: 'utf8mb4', timezone: 'Z', dateStrings: true,
      // Para banco remoto, habilite TLS e configure uma CA confiável.
      ...(process.env.DB_SSL_CA ? { ssl: { ca: process.env.DB_SSL_CA, rejectUnauthorized: true } } : {}),
    });
  }
  return globalThis.codeWordsPool;
}
