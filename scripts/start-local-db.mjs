import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {access} from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
if(process.platform!=='win32'||process.env.DB_HOST!=='127.0.0.1'||process.env.DB_PORT!=='3308')throw new Error('Este comando inicia somente a instância local de desenvolvimento deste computador.');
const config={host:process.env.DB_HOST,port:3308,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:1500};
async function ready(){try{const db=await mysql.createConnection(config);await db.ping();await db.end();return true;}catch{return false;}}
if(await ready()){console.log('Development database already running.');process.exit(0);}
const executable='C:/Program Files/MariaDB 11.2/bin/mysqld.exe';
const configPath=fileURLToPath(new URL('../../../work/database/data/my.ini',import.meta.url));
await access(executable);await access(configPath);
const child=spawn(executable,[`--defaults-file=${configPath}`,'--bind-address=127.0.0.1','--innodb-buffer-pool-size=64M','--max-connections=20'],{detached:true,stdio:'ignore',windowsHide:true});
child.on('error',()=>{console.error('Could not start the development database.');process.exitCode=1;});child.unref();
for(let attempt=0;attempt<12;attempt++){if(await ready()){console.log('Development database ready on localhost:3308.');process.exit(0);}await new Promise(resolve=>setTimeout(resolve,500));}
throw new Error('Banco não respondeu. Confira o arquivo de log na pasta work/database/data.');
