import http from 'node:http';
import {validEntryMedia,uploadPaths,inspectUpload,VIDEO_LIMIT,defaultAboutImage,validAboutImage,withAboutImage} from './media.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),root=path.dirname(fileURLToPath(import.meta.url));
const siteRoot=process.env.CMS_SITE_DIR||path.join(root,'site');
const state=process.env.CMS_STATE_DIR||path.join(root,'.private'),port=Number(process.env.CMS_PORT||5180);
const origin=`http://127.0.0.1:${port}`,repo='takuchen0909/DE-Cinema',apiRoot=`/repos/${repo}`,live='https://takuchen0909.github.io/DE-Cinema/';
await mkdir(state,{recursive:true,mode:0o700});await mkdir(path.join(state,'uploads'),{recursive:true,mode:0o700});
const sessions=new Map(),failures=new Map();let saving=false,tokenCache='';
class Failure extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function readJson(name,fallback=null){try{return JSON.parse(await readFile(path.join(state,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function storeJson(name,value){const target=path.join(state,name),temp=target+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(temp,target);}
function hash(password,salt){return scryptSync(password,salt,32).toString('hex');}
function same(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function session(req){const id=/\bcms_session=([a-f0-9]{64})\b/.exec(req.headers.cookie||'')?.[1],record=sessions.get(id);if(record&&record>Date.now())return true;if(id)sessions.delete(id);return false;}
function issueSession(res){const id=randomBytes(32).toString('hex');sessions.set(id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`cms_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);}
async function body(req,limit=1000000){const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>limit)throw new Failure('This file or content is too large.',413);chunks.push(c);}return Buffer.concat(chunks);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function token(){const saved=await readJson('github.json');if(saved?.token)return saved.token;if(tokenCache)return tokenCache;try{const result=await exec(process.env.GH_PATH||path.join(root,'../.local-tools/gh'),['auth','token','--hostname','github.com'],{timeout:10000,maxBuffer:4096});tokenCache=result.stdout.trim();return tokenCache;}catch{throw new Failure('Connect GitHub before publishing.',428);}}
async function github(endpoint,method='GET',data,access){const r=await fetch('https://api.github.com'+endpoint,{method,signal:AbortSignal.timeout(endpoint.endsWith('/git/blobs')?120000:30000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'DECinema-Local-Editor',Authorization:'Bearer '+(access||await token()),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});if(!r.ok){if(r.status===409||r.status===422)throw new Failure('The website changed. Reload and check your draft before publishing.',409);if(r.status===401||r.status===403)throw new Failure('GitHub authorization is invalid or lacks permission. Please reconnect.',403);throw new Failure('GitHub could not complete the request. Check your connection and try again.',502);}return r.json();}
async function remoteArchive(){const file=await github(apiRoot+'/contents/public/archive.json?ref=main');const data=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));return {data,sha:file.sha};}
function validate(entries,publishing=false){if(!Array.isArray(entries)||entries.length>200)throw new Failure('Invalid archive format.');const ids=new Set();for(const e of entries){if(!e||typeof e.id!=='string'||ids.has(e.id)||!['news','past'].includes(e.section)||['title','category','date','description','image'].some(k=>typeof e[k]!=='string')||e.title.length>300||e.description.length>30000||!validEntryMedia(e))throw new Failure('Invalid entry fields or image path.');ids.add(e.id);if(publishing&&!e.title.trim())throw new Failure('Every entry needs a title before publishing.');}return entries;}
async function current(){let doc=await readJson('draft.json');if(doc)return withAboutImage(doc);const remote=await remoteArchive();doc={entries:remote.data.entries,published:remote.data.entries,aboutImage:remote.data.aboutImage??{...defaultAboutImage},publishedAboutImage:remote.data.aboutImage??{...defaultAboutImage},revision:0,baseSha:remote.sha};await storeJson('draft.json',doc);return doc;}
async function publish(doc){const remote=await remoteArchive();if(remote.sha!==doc.baseSha)throw new Failure('The published website has changed. Sync from the website before publishing to avoid overwriting another editor.',409);const ref=await github(apiRoot+'/git/ref/heads/main'),head=await github(apiRoot+'/git/commits/'+ref.object.sha);const tree=[];for(const src of uploadPaths(doc.entries,doc.aboutImage)){const name=path.basename(src),file=path.join(state,'uploads',name);try{const bytes=await readFile(file);const blob=await github(apiRoot+'/git/blobs','POST',{content:bytes.toString('base64'),encoding:'base64'});tree.push({path:'public'+src,mode:'100644',type:'blob',sha:blob.sha});}catch(err){if(err.code!=='ENOENT')throw err;await github(apiRoot+'/contents/public'+src+'?ref='+ref.object.sha);}}

const publicData={aboutImage:doc.aboutImage,entries:doc.entries,published:doc.entries,revision:Date.now()};const blob=await github(apiRoot+'/git/blobs','POST',{content:JSON.stringify(publicData,null,2)+'\n',encoding:'utf-8'});tree.push({path:'public/archive.json',mode:'100644',type:'blob',sha:blob.sha});const nextTree=await github(apiRoot+'/git/trees','POST',{base_tree:head.tree.sha,tree}),commit=await github(apiRoot+'/git/commits','POST',{message:'Update cinema archive',tree:nextTree.sha,parents:[ref.object.sha]});await github(apiRoot+'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return {sha:commit.sha,baseSha:blob.sha};}
async function api(req,res,url){const pathname=url.pathname;
if(pathname==='/api/session'){
 const settings=await readJson('password.json');if(req.method==='GET')return json(res,200,{configured:!!settings,authenticated:session(req)});
 const data=JSON.parse((await body(req,4096)).toString());
 if(data.action==='logout'){sessions.clear();res.setHeader('Set-Cookie','cms_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
 if(!['setup','login','change'].includes(data.action)||typeof data.password!=='string'||data.password.length<10||data.password.length>256)throw new Failure('Use a password between 10 and 256 characters.');
 const blocked=failures.get('local')||{count:0,until:0};if(blocked.until>Date.now())throw new Failure('Too many attempts. Try again in 15 minutes.',429);
 if(data.action==='setup'){if(settings)throw new Failure('A CMS password is already set. Sign in with it.',409);const salt=randomBytes(16).toString('hex');await storeJson('password.json',{salt,hash:hash(data.password,salt)});}
 else if(data.action==='change'){if(!session(req))throw new Failure('Please sign in first.',401);const salt=randomBytes(16).toString('hex');await storeJson('password.json',{salt,hash:hash(data.password,salt)});sessions.clear();}
 else {if(!settings||!same(hash(data.password,settings.salt),settings.hash)){blocked.count++;if(blocked.count>=5){blocked.until=Date.now()+900000;blocked.count=0;}failures.set('local',blocked);throw new Failure('Incorrect CMS password.',401);}}
 failures.delete('local');issueSession(res);return json(res,200,{ok:true});
}
if(!session(req))throw new Failure('Sign in to edit the archive.',401);
if(pathname==='/api/connection'&&req.method==='GET'){try{const info=await github(apiRoot);return json(res,200,{connected:!!info.permissions?.push,publicUrl:live});}catch{return json(res,200,{connected:false,publicUrl:live});}}
if(pathname==='/api/connection'&&req.method==='POST'){const data=JSON.parse((await body(req,4096)).toString());if(typeof data.token!=='string'||data.token.length<20||data.token.length>1000)throw new Failure('Enter a valid GitHub access token.');const info=await github(apiRoot,'GET',null,data.token);if(!info.permissions?.push)throw new Failure('This authorization does not have write access to the DE-Cinema repository.',403);await storeJson('github.json',{token:data.token});return json(res,200,{connected:true});}
if(pathname==='/api/archive'&&req.method==='GET')return json(res,200,await current());
if(pathname==='/api/sync'&&req.method==='POST'){if(saving)throw new Failure('A save or publication is in progress. Please try again shortly.',409);saving=true;try{const remote=await remoteArchive(),doc=await readJson('draft.json');const next={entries:remote.data.entries,published:remote.data.entries,aboutImage:remote.data.aboutImage??{...defaultAboutImage},publishedAboutImage:remote.data.aboutImage??{...defaultAboutImage},revision:(doc?.revision||0)+1,baseSha:remote.sha};await storeJson('draft.json',next);return json(res,200,next);}finally{saving=false;}}
if(pathname==='/api/archive'&&req.method==='PUT'){if(saving)throw new Failure('A save or publication is in progress. Please try again shortly.',409);saving=true;try{const data=JSON.parse((await body(req)).toString());if(!['draft','publish'].includes(data.action))throw new Failure('Invalid action.');validate(data.entries,data.action==='publish');const doc=await current();if(data.revision!==doc.revision)throw new Failure('The archive changed in another window. Reload before saving.',409);const aboutImage=data.aboutImage===undefined?doc.aboutImage:data.aboutImage;if(!validAboutImage(aboutImage))throw new Failure('Invalid About image or crop settings.');const next={...doc,aboutImage,entries:data.entries,revision:doc.revision+1};let result=null;if(data.action==='publish'){result=await publish(next);next.published=data.entries;next.publishedAboutImage=aboutImage;next.baseSha=result.baseSha;next.lastCommit=result.sha;}await storeJson('draft.json',next);return json(res,200,{...next,commit:result?.sha});}finally{saving=false;}}
if(pathname==='/api/upload'&&req.method==='POST'){const bytes=await body(req,VIDEO_LIMIT),type=(req.headers['content-type']||'').split(';')[0];const media=inspectUpload(bytes,type);if(!media)throw new Failure('Choose a JPG, PNG, WebP or GIF up to 10 MB, or an MP4 / WebM video up to 25 MB.');const name=randomBytes(16).toString('hex')+'.'+media.ext;await writeFile(path.join(state,'uploads',name),bytes,{mode:0o600});return json(res,200,{url:'/uploads/'+name,type:media.type});}
if(pathname==='/api/deployment'&&req.method==='GET'){const sha=url.searchParams.get('sha');if(sha&&!/^[a-f0-9]{40}$/.test(sha))throw new Failure('Invalid publication reference.');const data=await github(apiRoot+'/actions/workflows/pages.yml/runs?per_page=5'+(sha?'&head_sha='+sha:''));const run=data.workflow_runs?.[0];return json(res,200,{status:run?.status||'waiting',conclusion:run?.conclusion||null,url:live});}
throw new Failure('Endpoint not found.',404);
}
const mime={'.webm':'video/webm','.mp4':'video/mp4','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg'};
async function staticFile(res,base,name,range){
const safe=path.resolve(base,name);if(!safe.startsWith(path.resolve(base)+path.sep))throw new Failure('File not found.',404);
let bytes;try{bytes=await readFile(safe);}catch{throw new Failure('File not found.',404);}
const headers={'Content-Type':mime[path.extname(safe)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Accept-Ranges':'bytes'};
if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});return res.end();}
const start=match[1]?Number(match[1]):Math.max(0,bytes.length-Number(match[2]));const end=match[1]&&match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
if(start>end||start>=bytes.length){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});return res.end();}
res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});return res.end(bytes.subarray(start,end+1));}
res.writeHead(200,{...headers,'Content-Length':bytes.length});res.end(bytes);
}
const server=http.createServer(async(req,res)=>{try{
if(req.headers.host!==`127.0.0.1:${port}`)throw new Failure('Open the editor using its localhost address.',403);
if(!['GET','POST','PUT'].includes(req.method))throw new Failure('Method not allowed.',405);
const url=new URL(req.url,origin);if(url.pathname.startsWith('/api/')){if(req.method!=='GET'&&req.headers.origin!==origin)throw new Failure('Invalid request origin.',403);return await api(req,res,url);}
if(url.pathname==='/')return await staticFile(res,root,'admin.html');
if(url.pathname==='/editor.js'||url.pathname==='/editor.css')return await staticFile(res,root,url.pathname.slice(1));
if(url.pathname.startsWith('/local-image/')){if(!session(req))throw new Failure('Please sign in first.',401);return await staticFile(res,path.join(state,'uploads'),decodeURIComponent(url.pathname.slice(13)),req.headers.range);}
if(url.pathname==='/DE-Cinema/archive.json'){const doc=await readJson('draft.json');return doc?json(res,200,{entries:doc.entries,aboutImage:doc.aboutImage??defaultAboutImage}):await staticFile(res,siteRoot,'archive.json');}
if(url.pathname.startsWith('/DE-Cinema/uploads/')){const name=decodeURIComponent(url.pathname.slice('/DE-Cinema/uploads/'.length));try{return await staticFile(res,path.join(state,'uploads'),name,req.headers.range);}catch{const response=await fetch(live+'uploads/'+encodeURIComponent(name),{headers:req.headers.range?{Range:req.headers.range}:{},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Failure('Image not found.',404);res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream','X-Content-Type-Options':'nosniff',...(response.headers.has('content-range')?{'Content-Range':response.headers.get('content-range')}:{}),'Accept-Ranges':'bytes'});return res.end(Buffer.from(await response.arrayBuffer()));}}
if(url.pathname.startsWith('/DE-Cinema/'))return await staticFile(res,siteRoot,decodeURIComponent(url.pathname.slice('/DE-Cinema/'.length))||'index.html',req.headers.range);
throw new Failure('Page not found.',404);
}catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'This action could not be completed. Your draft is still saved on this computer.'});else res.end();}});
server.listen(port,'127.0.0.1',()=>{console.log(`Local CMS: ${origin}/#admin`);console.log('Keep this window open. Closing it stops the local CMS.');});
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?'The local CMS is already running. Open the existing editor or close its window.':'The local CMS could not start.');process.exit(1);});
