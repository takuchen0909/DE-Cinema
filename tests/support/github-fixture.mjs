import {readFile,appendFile} from 'node:fs/promises';
let releaseCreated=false;const releaseAssets=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
  const url=String(input);
  if(url.startsWith('https://uploads.github.com/')){
    let size=0;for await(const chunk of options.body)size+=chunk.length;
    const name=new URL(url).searchParams.get('name');
    await appendFile(process.env.CMS_TEST_LOG,JSON.stringify({endpoint:'/release-upload',size,contentType:options.headers['Content-Type']})+'\n');
    const asset={id:releaseAssets.length+1,name,size,state:'uploaded',browser_download_url:'https://github.com/takuchen0909/DE-Cinema/releases/download/archive-media/'+name};releaseAssets.push(asset);return Response.json(asset);
  }
  if(!url.startsWith('https://api.github.com/'))return originalFetch(input,options);
  const endpoint=url.slice('https://api.github.com'.length),method=options.method||'GET';
  await appendFile(process.env.CMS_TEST_LOG,JSON.stringify({endpoint,method,body:options.body?JSON.parse(options.body):null})+'\n');
  let data;
  if(endpoint.endsWith('/releases/tags/archive-media')&&!releaseCreated)return Response.json({message:'Not Found'},{status:404});
  if(endpoint.endsWith('/releases/tags/archive-media')||endpoint.endsWith('/releases')){releaseCreated=true;data={id:123,upload_url:'https://uploads.github.com/repos/takuchen0909/DE-Cinema/releases/123/assets{?name,label}'};}
  else if(endpoint.includes('/releases/123/assets'))data=releaseAssets;
  else if(endpoint.includes('/contents/public/archive.json'))data={sha:'archive-before',content:Buffer.from(await readFile(process.env.CMS_TEST_ARCHIVE,'utf8')).toString('base64')};
  else if(endpoint.endsWith('/git/ref/heads/main'))data={object:{sha:'head-before'}};
  else if(endpoint.endsWith('/git/commits/head-before'))data={tree:{sha:'tree-before'}};
  else if(endpoint.endsWith('/git/blobs'))data={sha:'blob-after'};
  else if(endpoint.endsWith('/git/trees'))data={sha:'tree-after'};
  else if(endpoint.endsWith('/git/commits'))data={sha:'a'.repeat(40)};
  else if(endpoint.endsWith('/git/refs/heads/main'))data={object:{sha:'a'.repeat(40)}};
  else if(endpoint.includes('/contents/'))data={sha:'existing-file'};
  else if(endpoint.includes('/actions/'))data={workflow_runs:[{status:'completed',conclusion:'success'}]};
  else data={permissions:{push:true}};
  return Response.json(data);
};
