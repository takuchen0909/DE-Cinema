import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {releaseVideoPath} from './media.mjs';
const root='/repos/takuchen0909/DE-Cinema';
function failure(message){return Object.assign(new Error(message),{status:502});}
export async function publishReleaseVideo(file,{github,token,onProgress=()=>{}}){
 const name=path.basename(file),info=await stat(file);
 let release;
 try{release=await github(root+'/releases/tags/archive-media');}
 catch(error){if(error.githubStatus!==404)throw error;release=await github(root+'/releases','POST',{tag_name:'archive-media',target_commitish:'main',name:'Archive media',body:'Video files used by the DE Cinema website. Keep these assets available while they are referenced by the archive.',draft:false,prerelease:false,make_latest:'false'});}
 const endpoint=root+'/releases/'+release.id+'/assets';let existing;
 for(let page=1;;page++){const assets=await github(endpoint+'?per_page=100&page='+page);existing=assets.find(asset=>asset.name===name);if(existing||assets.length<100)break;}
 if(existing?.state==='uploaded'&&existing.size===info.size&&releaseVideoPath(existing.browser_download_url))return existing.browser_download_url;
 if(existing)await github(root+'/releases/assets/'+existing.id,'DELETE');
 const uploadUrl=new URL(release.upload_url.replace(/\{.*$/,''));
 if(uploadUrl.origin!=='https://uploads.github.com'||uploadUrl.pathname!==endpoint)throw failure('Unexpected GitHub upload destination.');
 uploadUrl.searchParams.set('name',name);
 const access=await token();let sent=0;const stream=createReadStream(file);async function* chunks(){for await(const chunk of stream){sent+=chunk.length;onProgress(sent,info.size);yield chunk;}}
 try{
  const response=await fetch(uploadUrl,{method:'POST',duplex:'half',signal:AbortSignal.timeout(2*60*60*1000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+access,'X-GitHub-Api-Version':'2022-11-28','Content-Type':name.endsWith('.webm')?'video/webm':'video/mp4','Content-Length':String(info.size)},body:chunks()});
  if(!response.ok)throw failure('Video publication failed. Your local draft is kept; retry Publish changes.');
  const asset=await response.json();
  if(asset.state!=='uploaded'||asset.size!==info.size||!releaseVideoPath(asset.browser_download_url))throw failure('GitHub could not verify the uploaded video. Please retry publishing.');
  return asset.browser_download_url;
 }finally{stream.destroy();}
}
