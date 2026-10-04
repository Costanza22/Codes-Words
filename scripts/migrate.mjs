import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
let migrationUser=process.env.DB_MIGRATION_USER||process.env.DB_USER;
let migrationPassword=process.env.DB_MIGRATION_PASSWORD||process.env.DB_PASSWORD;
if(!process.env.DB_MIGRATION_USER&&process.env.DB_HOST==='127.0.0.1'&&process.env.DB_PORT==='3308'&&process.env.DB_NAME==='code_words'){
  try{const secret=await readFile(new URL('../../../work/database/admin.env',import.meta.url),'utf8');migrationUser='root';migrationPassword=secret.trim().split('=')[1];}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
const db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:migrationUser,password:migrationPassword,database:process.env.DB_NAME,...(process.env.DB_SSL_CA?{ssl:{ca:process.env.DB_SSL_CA,rejectUnauthorized:true}}:{})});
try {
  const source=await readFile(new URL('../database/001-initial.sql',import.meta.url),'utf8');
  for(const statement of source.split(';').map(sql=>sql.trim()).filter(Boolean))await db.query(statement);
  console.log('Schema ready: users, sessions, lesson_progress and rate_limits.');
} finally {await db.end();}
