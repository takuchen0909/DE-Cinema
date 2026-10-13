export const IMAGE_LIMIT=10*1024*1024;
export const VIDEO_LIMIT=25*1024*1024;
export const MEDIA_LIMIT=30;
const imagePath=/^\/(assets|uploads)\/[\w.-]+\.(jpe?g|png|webp|gif)$/i;
const videoPath=/^\/(assets|uploads)\/[\w.-]+\.(mp4|webm)$/i;
export function validEntryMedia(entry){
  return (entry.image===''||imagePath.test(entry.image))&&
    (entry.summary===undefined||(typeof entry.summary==='string'&&entry.summary.length<=140))&&
    (entry.media===undefined||(Array.isArray(entry.media)&&entry.media.length<=MEDIA_LIMIT&&entry.media.every(item=>item&&typeof item.src==='string'&&((item.type==='image'&&imagePath.test(item.src))||(item.type==='video'&&videoPath.test(item.src))))));
}
export function uploadPaths(entries){return [...new Set(entries.flatMap(entry=>[entry.image,...(entry.media||[]).map(item=>item.src)]).filter(src=>src.startsWith('/uploads/')))];}
export function inspectUpload(bytes,type){
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'}[type];
  const video=ext==='mp4'||ext==='webm';
  const valid=(ext==='jpg'&&bytes[0]===255&&bytes[1]===216)||(ext==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(ext==='gif'&&/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()))||(ext==='webp'&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')||(ext==='mp4'&&bytes.length>=16&&bytes.subarray(4,8).toString()==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |dash)$/.test(bytes.subarray(8,12).toString()))||(ext==='webm'&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&bytes.subarray(4,4096).includes(Buffer.from('webm')));
  if(!valid||bytes.length>(video?VIDEO_LIMIT:IMAGE_LIMIT))return null;
  return {ext,type:video?'video':'image'};
}
