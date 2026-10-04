// Somente para a instância de desenvolvimento isolada na porta 3308.
import mysql from 'mysql2/promise';
import {randomBytes} from 'node:crypto';
import {writeFile,access} from 'node:fs/promises';
const envPath=new URL('../.env.local',import.meta.url);
try {await access(envPath);throw new Error('Configuração já existe. Use a migração existente.');}catch(error){if(error.code!=='ENOENT')throw error;}
const db=await mysql.createConnection({host:'127.0.0.1',port:3308,user:'root',password:''});
try{
  const password=randomBytes(32).toString('hex');
  await db.query('CREATE DATABASE code_words CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await db.query("CREATE USER 'code_words_app'@'127.0.0.1' IDENTIFIED BY ?",[password]);
  await db.query("GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES ON code_words.* TO 'code_words_app'@'127.0.0.1'");
  // A conta administrativa da instância local também recebe senha aleatória.
  const rootPassword=randomBytes(32).toString('hex');
  await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[rootPassword]);
  await writeFile(new URL('../../../work/database/admin.env',import.meta.url),`DB_ADMIN_PASSWORD=${rootPassword}\n`,{mode:0o600});
  await writeFile(envPath,`DB_HOST=127.0.0.1\nDB_PORT=3308\nDB_NAME=code_words\nDB_USER=code_words_app\nDB_PASSWORD=${password}\nAPP_ORIGIN=http://127.0.0.1:3000\n`,{mode:0o600});
  console.log('Isolated development database configured. Credentials stored outside public files.');
}finally{await db.end();}
