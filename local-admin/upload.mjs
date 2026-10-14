import {open,rename,unlink} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {inspectUpload,uploadLimit} from './media.mjs';
function failure(message,status=400){return Object.assign(new Error(message),{status});}
// Write directly to disk: at most one request chunk and a 4 KB signature in memory.
export async function receiveUpload(req,directory,section){
 const type=(req.headers['content-type']||'').split(';')[0];
 if(!['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'].includes(type))throw failure('Choose JPG, PNG, WebP, GIF, MP4 or WebM.');
 const limit=uploadLimit(type,section),declared=Number(req.headers['content-length']);
 if(Number.isFinite(declared)&&declared>limit)throw failure(`This file exceeds the ${limit/1024/1024} MB limit.`,413);
 const temp=path.join(directory,randomBytes(16).toString('hex')+'.part');
 let handle,length=0,signature=Buffer.alloc(0),finalized=false;
 try{
  handle=await open(temp,'wx',0o600);
  for await(const chunk of req){
   length+=chunk.length;if(length>limit)throw failure(`This file exceeds the ${limit/1024/1024} MB limit.`,413);
   if(signature.length<4096)signature=Buffer.concat([signature,chunk.subarray(0,4096-signature.length)]);
   let offset=0;while(offset<chunk.length){const result=await handle.write(chunk,offset,chunk.length-offset);offset+=result.bytesWritten;}
  }
  const media=inspectUpload(signature,type,section,length);if(!media)throw failure('The file contents do not match a supported image or video format.');
  await handle.close();handle=null;
  const name=path.basename(temp,'.part')+'.'+media.ext;await rename(temp,path.join(directory,name));finalized=true;
  return {url:'/uploads/'+name,type:media.type,size:length};
 }finally{if(handle)await handle.close();if(!finalized)await unlink(temp).catch(()=>{});}
}
