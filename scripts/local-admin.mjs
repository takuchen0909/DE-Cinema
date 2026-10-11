import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
export async function ensureLocalAdmin(){
  const endpoint='http://127.0.0.1:5180';
  async function ready(){try{const r=await fetch(endpoint+'/api/session',{signal:AbortSignal.timeout(600)});return r.ok&&typeof (await r.json()).configured==='boolean';}catch{return false;}}
  if(await ready())return{stop(){}};
  const site=fileURLToPath(new URL(existsSync(fileURLToPath(new URL('dist/index.html',root)))?'dist/':'public/',root));
  const child=spawn(process.execPath,[fileURLToPath(new URL('local-admin/server.mjs',root))],{cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,CMS_SITE_DIR:site}});
  let exited=false;child.on('exit',()=>{exited=true;});
  child.on('error',()=>{exited=true;});
  const stop=()=>{if(!exited)child.kill();};
  for(let attempt=0;attempt<50;attempt++){
    if(await ready())return{stop};
    if(exited)throw new Error('Local archive editor could not start. Check port 5180.');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  stop();throw new Error('Local archive editor did not respond.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const localAdmin=await ensureLocalAdmin();
  console.log('Archive CMS: http://127.0.0.1:5180/#admin');
  process.on('SIGINT',()=>{localAdmin.stop();process.exit(0);});
  process.on('SIGTERM',()=>{localAdmin.stop();process.exit(0);});
}
