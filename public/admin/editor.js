const $=s=>document.querySelector(s);let configured=false,doc=null,section='past',selected='',dirty=false,busy=false,connected=false,version=0,commit='',timer=null,publicationStatus='';const newImages=new Set();
async function api(path,options={}){const response=await fetch('/api/'+path,{cache:'no-store',...options,headers:{...(options.body instanceof File?{}:{'Content-Type':'application/json'}),...options.headers}});const data=await response.json();if(response.status===401&&path!=='session'){showLogin();throw new Error('Your session expired. Please sign in again.');}if(!response.ok)throw new Error(data.error||'This action could not be completed. Please try again.');return data;}
function uploadFile(file,targetSection,onProgress){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload?section='+encodeURIComponent(targetSection));xhr.setRequestHeader('Content-Type',file.type||(/\.webm$/i.test(file.name)?'video/webm':'video/mp4'));xhr.timeout=2*60*60*1000;
 xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(Math.round(event.loaded/event.total*100));};
 xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{reject(new Error('Upload failed. Please try again.'));return;}if(xhr.status>=200&&xhr.status<300)resolve(data);else{if(xhr.status===401)showLogin();reject(new Error(data.error||'Upload failed.'));}};
 xhr.onerror=()=>reject(new Error('Connection interrupted. Please retry the upload.'));xhr.ontimeout=()=>reject(new Error('Upload timed out. Please retry.'));xhr.send(file);
});}
function error(message){$('#error').textContent=message;$('#error').hidden=!message;}
function showLogin(){clearInterval(timer);$('#workspace').hidden=true;$('#login').hidden=false;$('#password').value='';$('#confirmation').value='';}
async function session(){try{const status=await api('session');configured=status.configured;if(status.authenticated)return enter();$('#login-title').textContent=configured?'Archive CMS':'Set your CMS password';$('#login-form').hidden=false;$('#confirm-label').hidden=configured;$('#confirmation').required=!configured;$('#password').autocomplete=configured?'current-password':'new-password';$('#login-copy').textContent=configured?'Enter your CMS password to continue.':'Choose a password to protect your archive editor.';$('#login-button').textContent=configured?'Sign in':'Set password and enter';}catch(e){$('#login-error').textContent=e.message;}}
async function connection(){try{connected=(await api('connection')).connected;$('#connect').hidden=connected;}catch(e){connected=false;error(e.message);}buttons();}
async function enter(){showLogin();$('#login').hidden=true;$('#workspace').hidden=false;await connection();if(connected)await load();}
async function load(){try{doc=await api('archive');selected=doc.entries.find(e=>e.section===section)?.id||'';dirty=false;render();}catch(e){error(e.message);}}
function unpublished(){return JSON.stringify(doc.entries)!==JSON.stringify(doc.published)||JSON.stringify(doc.aboutImage)!==JSON.stringify(doc.publishedAboutImage);}
function buttons(){for(const id of ['save','publish','sync','add','up','down','delete','upload','remove-cover','media-upload','about-upload','about-reset','cover-reset','add-description-link'])$('#'+id).disabled=busy||!doc;$('#publish').disabled=busy||!doc||!connected||(!dirty&&!unpublished());$('#save').disabled=busy||!dirty;for(const field of document.querySelectorAll('[data-field], [data-about-field], [data-cover-field], #media-list button'))field.disabled=busy;if(doc){const list=doc.entries.filter(e=>e.section===section);$('#up').disabled=busy||list[0]?.id===selected;$('#down').disabled=busy||list.at(-1)?.id===selected;}$('#save-state').textContent=!doc?'Loading archive…':dirty?'Unsaved changes':unpublished()?'Draft saved — not yet published':publicationStatus||'All changes published';}
function changed(){dirty=true;version++;buttons();}
function render(){if(!doc)return buttons();const isAbout=section==='about';$('#about-editor').hidden=!isAbout;$('#add').hidden=isAbout;$('#entries').hidden=isAbout;const listing=doc.entries.filter(e=>e.section===section);if(!listing.some(e=>e.id===selected))selected=listing[0]?.id||'';$('#entries').replaceChildren(...listing.map(e=>{const b=document.createElement('button');b.textContent=e.title||'Untitled';b.className=e.id===selected?'active':'';b.onclick=()=>{selected=e.id;render();};return b;}));for(const b of document.querySelectorAll('[data-section]'))b.classList.toggle('active',b.dataset.section===section);const entry=doc.entries.find(e=>e.id===selected);$('#editor').hidden=isAbout||!entry;$('#empty').hidden=isAbout||!!entry;if(isAbout)renderAbout();$('#description-tools').hidden=section!=='past';if(entry){for(const input of document.querySelectorAll('[data-field]'))input.value=entry[input.dataset.field]||'';$('#cover').hidden=!entry.image;$('#remove-cover').hidden=!entry.image;if(entry.image)$('#cover').src=newImages.has(entry.image)?'/local-image/'+entry.image.slice('/uploads/'.length):'/DE-Cinema'+entry.image;renderCover(entry);renderMedia(entry);$('#up').disabled=busy||listing[0]?.id===selected;$('#down').disabled=busy||listing.at(-1)?.id===selected;}buttons();}
$('#login-form').onsubmit=async e=>{e.preventDefault();$('#login-error').textContent='';if(!configured&&$('#password').value!==$('#confirmation').value){$('#login-error').textContent='The passwords do not match.';return;}$('#login-button').disabled=true;try{await api('session',{method:'POST',body:JSON.stringify({action:configured?'login':'setup',password:$('#password').value})});configured=true;await enter();}catch(e){$('#login-error').textContent=e.message;}finally{$('#login-button').disabled=false;}};
$('#logout').onclick=async()=>{if(dirty&&!confirm('You have unsaved changes. Sign out without saving?'))return;await api('session',{method:'POST',body:JSON.stringify({action:'logout'})});showLogin();await session();};
for(const b of document.querySelectorAll('[data-section]'))b.onclick=()=>{section=b.dataset.section;selected='';render();};
for(const input of document.querySelectorAll('[data-field]'))input.oninput=()=>{doc.entries.find(e=>e.id===selected)[input.dataset.field]=input.value;changed();if(input.dataset.field==='title'){const button=[...$('#entries').children].find(b=>b.classList.contains('active'));if(button)button.textContent=input.value||'Untitled';}};
$('#add').onclick=()=>{const entry={id:crypto.randomUUID(),section,title:'Untitled',category:'',date:'',description:'',summary:'',image:'',media:[]};doc.entries.push(entry);selected=entry.id;changed();render();};
function move(direction){const list=doc.entries.filter(e=>e.section===section),i=list.findIndex(e=>e.id===selected),target=list[i+direction];if(!target)return;const a=doc.entries.findIndex(e=>e.id===selected),b=doc.entries.findIndex(e=>e.id===target.id);[doc.entries[a],doc.entries[b]]=[doc.entries[b],doc.entries[a]];changed();render();}
$('#up').onclick=()=>move(-1);$('#down').onclick=()=>move(1);
$('#delete').onclick=()=>$('#delete-dialog').showModal();$('#delete-confirm').onclick=()=>{doc.entries=doc.entries.filter(e=>e.id!==selected);selected='';changed();render();};
$('#remove-cover').onclick=()=>{const entry=doc.entries.find(e=>e.id===selected);entry.image='';delete entry.coverCrop;changed();render();};
$('#upload').onchange=async()=>{if(busy)return;const file=$('#upload').files[0];if(!file)return;if(file.size>(section==='past'?20:10)*1024*1024){error(`Choose a cover image up to ${section==='past'?20:10} MB.`);$('#upload').value='';return;}const id=selected;busy=true;buttons();$('#upload-state').textContent='Uploading…';try{const data=await uploadFile(file,section,percent=>{$('#upload-state').textContent=`Uploading… ${percent}%`;});newImages.add(data.url);const entry=doc.entries.find(e=>e.id===id);entry.image=data.url;delete entry.coverCrop;changed();$('#upload-state').textContent='Cover uploaded. Save or publish to keep it.';}catch(e){error(e.message);$('#upload-state').textContent='';}finally{busy=false;$('#upload').value='';render();}};
function renderCover(entry){
  $('#cover-settings').hidden=!entry.image;
  $('#cover-limit').textContent=`JPG, PNG, WebP or GIF, up to ${entry.section==='past'?20:10} MB.`;
  $('#media-limits').textContent=`Select several files. Images: up to ${entry.section==='past'?20:10} MB each. MP4 / WebM videos: up to ${entry.section==='past'?900:25} MB each. H.264 MP4 recommended. Up to 30 items.`;
  const crop=entry.coverCrop||{zoom:1,x:50,y:50},img=$('#cover');
  img.style.objectPosition=`${crop.x}% ${crop.y}%`;img.style.transform=`scale(${crop.zoom})`;img.style.transformOrigin=`${crop.x}% ${crop.y}%`;
  for(const key of ['zoom','x','y']){$('#cover-'+key).value=crop[key];$('#cover-'+key+'-value').textContent=Math.round(crop[key]*(key==='zoom'?100:1))+'%';}
}
function selectedEntry(){return doc?.entries.find(entry=>entry.id===selected);}
for(const input of document.querySelectorAll('[data-cover-field]'))input.oninput=()=>{const entry=selectedEntry();if(busy||!entry)return;entry.coverCrop||={zoom:1,x:50,y:50};entry.coverCrop[input.dataset.coverField]=Number(input.value);changed();renderCover(entry);};
$('#cover-reset').onclick=()=>{const entry=selectedEntry();if(busy||!entry)return;delete entry.coverCrop;changed();renderCover(entry);};
let coverDrag=null;
$('#cover-crop').onpointerdown=event=>{const entry=selectedEntry(),img=$('#cover');if(busy||!entry?.image||!img.naturalWidth||event.button!==0)return;const frame=$('#cover-crop').getBoundingClientRect(),crop=entry.coverCrop||{zoom:1,x:50,y:50},fit=Math.max(frame.width/img.naturalWidth,frame.height/img.naturalHeight);coverDrag={entry:entry.id,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:crop.x,y:crop.y,zoom:crop.zoom,overflowX:img.naturalWidth*fit*crop.zoom-frame.width,overflowY:img.naturalHeight*fit*crop.zoom-frame.height};$('#cover-crop').setPointerCapture(event.pointerId);};
$('#cover-crop').onpointermove=event=>{const entry=selectedEntry();if(!coverDrag||busy||coverDrag.pointer!==event.pointerId||coverDrag.entry!==entry?.id)return;const clamp=value=>Math.max(0,Math.min(100,value));entry.coverCrop={zoom:coverDrag.zoom,x:coverDrag.overflowX>1?clamp(coverDrag.x-(event.clientX-coverDrag.startX)/coverDrag.overflowX*100):coverDrag.x,y:coverDrag.overflowY>1?clamp(coverDrag.y-(event.clientY-coverDrag.startY)/coverDrag.overflowY*100):coverDrag.y};changed();renderCover(entry);};
for(const name of ['onpointerup','onpointercancel','onlostpointercapture'])$('#cover-crop')[name]=()=>{coverDrag=null;};
function renderMedia(entry){
  $('#media-list').replaceChildren(...(entry.media||[]).map((media,index)=>{
    const row=document.createElement('div');row.className='media-item';
    const preview=document.createElement(media.type==='video'?'video':'img');
    preview.src=media.src.startsWith('https://')?media.src:newImages.has(media.src)?'/local-image/'+media.src.slice('/uploads/'.length):'/DE-Cinema'+media.src;
    if(media.type==='video'){preview.controls=true;preview.preload='metadata';preview.playsInline=true;}else preview.alt='Event photo '+(index+1);
    const actions=document.createElement('div');actions.className='media-actions';
    const label=document.createElement('span');label.textContent=(index+1)+'. '+(media.type==='video'?'Video':'Photo');actions.append(label);
    function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',text+' '+(media.type==='video'?'video':'photo')+' '+(index+1));b.onclick=()=>{if(busy)return;handler();changed();render();};actions.append(b);}
    if(index>0)button('Move earlier',()=>{[entry.media[index-1],entry.media[index]]=[entry.media[index],entry.media[index-1]];});
    if(index<entry.media.length-1)button('Move later',()=>{[entry.media[index+1],entry.media[index]]=[entry.media[index],entry.media[index+1]];});
    if(media.type==='image')button('Use as cover',()=>{const old=entry.image;entry.image=media.src;delete entry.coverCrop;entry.media.splice(index,1);if(old&&old!==media.src&&!entry.media.some(item=>item.src===old))entry.media.unshift({type:'image',src:old});});
    button('Remove',()=>entry.media.splice(index,1));row.append(preview,actions);return row;
  }));
}
$('#media-upload').onchange=async()=>{
  if(busy)return;const files=[...$('#media-upload').files];if(!files.length)return;
  const entry=doc.entries.find(item=>item.id===selected);const existing=entry.media||[];
  if(existing.length+files.length>30){error('Each entry can contain up to 30 photos and videos.');$('#media-upload').value='';return;}
  const contentType=file=>file.type||(/\.mp4$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':'');
  for(const file of files){const type=contentType(file);if(!['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'].includes(type)||file.size>(type.startsWith('video/')?(entry.section==='past'?900:25):(entry.section==='past'?20:10))*1024*1024){error(`Choose images up to ${entry.section==='past'?20:10} MB or MP4 / WebM videos up to ${entry.section==='past'?900:25} MB.`);$('#media-upload').value='';return;}}
  busy=true;buttons();error('');let uploaded=0;
  try{for(const file of files){$('#media-upload-state').textContent=`Uploading ${uploaded+1} of ${files.length}…`;const data=await uploadFile(file,entry.section,percent=>{$('#media-upload-state').textContent=`Uploading ${uploaded+1} of ${files.length}… ${percent}%`;});newImages.add(data.url);if(data.type==='image'&&!entry.image)entry.image=data.url;else{entry.media||=[];entry.media.push({type:data.type,src:data.url});}uploaded++;changed();}}
  catch(e){error(e.message);}
  finally{busy=false;$('#media-upload').value='';$('#media-upload-state').textContent=`${uploaded} of ${files.length} uploaded. Save draft or publish to keep your changes.`;render();}
};
function renderAbout(){
  const image=doc.aboutImage,preview=$('#about-preview');
  const src='/DE-Cinema'+image.src;
  if(preview.getAttribute('src')!==src)preview.src=src;
  preview.style.objectPosition=`${image.x}% ${image.y}%`;
  preview.style.transform=`scale(${image.zoom})`;
  preview.style.transformOrigin=`${image.x}% ${image.y}%`;
  for(const key of ['zoom','x','y']){$('#about-'+key).value=image[key];$('#about-'+key+'-value').textContent=key==='zoom'?Math.round(image.zoom*100)+'%':Math.round(image[key])+'%';}
}
for(const input of document.querySelectorAll('[data-about-field]'))input.oninput=()=>{if(busy||!doc)return;doc.aboutImage[input.dataset.aboutField]=Number(input.value);changed();renderAbout();};
for(const button of document.querySelectorAll('[data-crop-mode]'))button.onclick=()=>{$('#about-crop').classList.toggle('mobile',button.dataset.cropMode==='mobile');for(const item of document.querySelectorAll('[data-crop-mode]'))item.setAttribute('aria-pressed',String(item===button));};
$('#about-reset').onclick=()=>{if(busy||!doc)return;Object.assign(doc.aboutImage,{zoom:1,x:50,y:50});changed();renderAbout();};
let cropDrag=null;
$('#about-crop').onpointerdown=event=>{if(busy||!doc||event.button!==0)return;const img=$('#about-preview');if(!img.naturalWidth)return;const frame=$('#about-crop').getBoundingClientRect(),fit=Math.max(frame.width/img.naturalWidth,frame.height/img.naturalHeight);cropDrag={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:doc.aboutImage.x,y:doc.aboutImage.y,overflowX:img.naturalWidth*fit*doc.aboutImage.zoom-frame.width,overflowY:img.naturalHeight*fit*doc.aboutImage.zoom-frame.height};$('#about-crop').setPointerCapture(event.pointerId);};
$('#about-crop').onpointermove=event=>{if(!cropDrag||cropDrag.pointer!==event.pointerId||busy)return;const clamp=value=>Math.max(0,Math.min(100,value));if(cropDrag.overflowX>1)doc.aboutImage.x=clamp(cropDrag.x-(event.clientX-cropDrag.startX)/cropDrag.overflowX*100);if(cropDrag.overflowY>1)doc.aboutImage.y=clamp(cropDrag.y-(event.clientY-cropDrag.startY)/cropDrag.overflowY*100);changed();renderAbout();};
for(const name of ['onpointerup','onpointercancel','onlostpointercapture'])$('#about-crop')[name]=()=>{cropDrag=null;};
$('#about-upload').onchange=async()=>{
  if(busy||!doc)return;const file=$('#about-upload').files[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>10*1024*1024){error('Choose a JPG, PNG, WebP or GIF up to 10 MB.');$('#about-upload').value='';return;}
  busy=true;buttons();error('');$('#about-upload-state').textContent='Uploading…';
  try{const data=await api('upload',{method:'POST',headers:{'Content-Type':file.type},body:file});doc.aboutImage={src:data.url,zoom:1,x:50,y:50};changed();$('#about-upload-state').textContent='Image ready. Adjust the crop, then save or publish.';}
  catch(e){error(e.message);$('#about-upload-state').textContent='';}
  finally{busy=false;$('#about-upload').value='';render();}
};
async function save(action){if(busy)return;busy=true;let progressTimer;if(action==='publish'){publicationStatus='Publishing…';progressTimer=setInterval(async()=>{try{const status=await api('publication');if(status.active&&status.message)$('#save-state').textContent=status.message+(status.percent===null?'':` ${status.percent}%`);}catch{}},1500);}const editVersion=version,snapshot=structuredClone(doc.entries),aboutSnapshot=structuredClone(doc.aboutImage);buttons();error('');try{const data=await api('archive',{method:'PUT',body:JSON.stringify({entries:snapshot,aboutImage:aboutSnapshot,revision:doc.revision,action})});doc.revision=data.revision;doc.published=data.published;doc.publishedAboutImage=data.publishedAboutImage;if(version===editVersion){doc.entries=data.entries;dirty=false;}if(data.commit){commit=data.commit;publicationStatus='Changes submitted. The website is updating…';clearInterval(timer);void deployment();timer=setInterval(deployment,12000);}else publicationStatus='';}catch(e){error(e.message);}finally{clearInterval(progressTimer);busy=false;render();}}
$('#save').onclick=()=>save('draft');$('#publish').onclick=()=>save('publish');
async function deployment(){try{const data=await api('deployment?sha='+commit);publicationStatus=data.status!=='completed'?'Website update in progress…':data.conclusion==='success'?'Website update complete':'Website update failed. Please check or publish again.';if(data.status==='completed')clearInterval(timer);buttons();}catch(e){publicationStatus='Changes submitted. Publication status is temporarily unavailable.';buttons();}}
$('#sync').onclick=()=>$('#sync-dialog').showModal();$('#sync-confirm').onclick=async()=>{busy=true;buttons();try{doc=await api('sync',{method:'POST',body:'{}'});dirty=false;error('');render();}catch(e){error(e.message);}finally{busy=false;buttons();}};
$('#connect').onclick=()=>$('#connection-dialog').showModal();$('#connection-cancel').onclick=()=>$('#connection-dialog').close();$('#connection-form').onsubmit=async e=>{e.preventDefault();$('#connection-error').textContent='';try{await api('connection',{method:'POST',body:JSON.stringify({token:$('#token').value.trim()})});$('#token').value='';$('#connection-dialog').close();await connection();await load();}catch(e){$('#connection-error').textContent=e.message;}};
window.addEventListener('beforeunload',e=>{if(dirty)e.preventDefault();});if(['127.0.0.1','localhost','[::1]'].includes(location.hostname)){void session();}else{
  $('#login-title').textContent='Archive CMS';
  $('#login-copy').textContent='Start the local editor on your computer to manage and publish the archive.';
  const localLink=document.createElement('a');localLink.href='http://127.0.0.1:5180/#admin';localLink.className='signin-button';localLink.textContent='Open local editor';$('#login-form').before(localLink);
}

let descriptionSelection=null;
$('#add-description-link').onclick=()=>{
 const entry=selectedEntry();if(busy||!entry||entry.section!=='past')return;
 const input=$('[data-field="description"]');
 descriptionSelection={id:entry.id,start:input.selectionStart,end:input.selectionEnd};
 $('#description-link-text').value=input.value.slice(input.selectionStart,input.selectionEnd);
 $('#description-link-url').value='';$('#description-link-error').textContent='';
 $('#description-link-dialog').showModal();
};
$('#description-link-cancel').onclick=()=>$('#description-link-dialog').close();
$('#description-link-form').onsubmit=event=>{
 event.preventDefault();const entry=selectedEntry();if(busy||!entry||entry.id!==descriptionSelection?.id)return;
 const label=$('#description-link-text').value.trim(),raw=$('#description-link-url').value.trim();
 try{
  const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||!url.hostname)throw new Error('Use a complete http:// or https:// web address.');
  if(!label||/[\[\]\r\n]/.test(label))throw new Error('Enter link text without square brackets or line breaks.');
  const link='['+label+']('+url.href.replaceAll('(','%28').replaceAll(')','%29')+')';
  const input=$('[data-field="description"]'),{start,end}=descriptionSelection;
  if(input.value.length-(end-start)+link.length>30000)throw new Error('Description must be 30,000 characters or fewer.');
  input.setRangeText(link,start,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));
  $('#description-link-dialog').close();input.focus();
 }catch(e){$('#description-link-error').textContent=e.message;}
};
