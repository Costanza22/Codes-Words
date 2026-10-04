import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
const secret=await readFile(new URL('../../../work/database/admin.env',import.meta.url),'utf8');
const password=secret.trim().split('=')[1];
const db=await mysql.createConnection({host:'127.0.0.1',port:3308,user:'root',password});
try{
 await db.query("REVOKE CREATE, INDEX, REFERENCES ON code_words.* FROM 'code_words_app'@'127.0.0.1'");
 console.log('Application database user restricted to reading and writing its own database.');
}finally{await db.end();}
