export const IMAGE_LIMIT=10*1024*1024;
export const VIDEO_LIMIT=25*1024*1024;
export const ARCHIVE_IMAGE_LIMIT=20*1024*1024;
export const ARCHIVE_VIDEO_LIMIT=900*1024*1024;
export const MEDIA_LIMIT=30;
export const defaultCoverCrop={zoom:1,x:50,y:50};
export function validCrop(crop){return !!crop&&Number.isFinite(crop.zoom)&&crop.zoom>=1&&crop.zoom<=3&&['x','y'].every(key=>Number.isFinite(crop[key])&&crop[key]>=0&&crop[key]<=100);}
export function uploadLimit(type,section){return type.startsWith('video/')?(section==='past'?ARCHIVE_VIDEO_LIMIT:VIDEO_LIMIT):(section==='past'?ARCHIVE_IMAGE_LIMIT:IMAGE_LIMIT);}
export function releaseVideoPath(src){return /^https:\/\/github\.com\/takuchen0909\/DE-Cinema\/releases\/download\/archive-media\/[a-f0-9]{32}\.(mp4|webm)$/.test(src);}

const imagePath=/^\/(assets|uploads)\/[\w.-]+\.(jpe?g|png|webp|gif)$/i;
const videoPath=/^\/(assets|uploads)\/[\w.-]+\.(mp4|webm)$/i;
export function validEntryMedia(entry){
  return (entry.coverCrop===undefined||validCrop(entry.coverCrop))&&(entry.image===''||imagePath.test(entry.image))&&
    (entry.summary===undefined||(typeof entry.summary==='string'&&entry.summary.length<=140))&&
    (entry.media===undefined||(Array.isArray(entry.media)&&entry.media.length<=MEDIA_LIMIT&&entry.media.every(item=>item&&typeof item.src==='string'&&((item.type==='image'&&imagePath.test(item.src))||(item.type==='video'&&(videoPath.test(item.src)||releaseVideoPath(item.src)))))));
}
export function uploadPaths(entries,aboutImage){return [...new Set([...entries.flatMap(entry=>[entry.image,...(entry.media||[]).map(item=>item.src)]),...(aboutImage?[aboutImage.src]:[])].filter(src=>src.startsWith('/uploads/')))];}
export function inspectUpload(bytes,type,section,length=bytes.length){
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'}[type];
  const video=ext==='mp4'||ext==='webm';
  const valid=(ext==='jpg'&&bytes[0]===255&&bytes[1]===216)||(ext==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(ext==='gif'&&/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()))||(ext==='webp'&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')||(ext==='mp4'&&bytes.length>=16&&bytes.subarray(4,8).toString()==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |dash)$/.test(bytes.subarray(8,12).toString()))||(ext==='webm'&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&bytes.subarray(4,4096).includes(Buffer.from('webm')));
  if(!valid||length>uploadLimit(type,section))return null;
  return {ext,type:video?'video':'image'};
}

export const defaultAboutImage={src:'/assets/screening.webp',zoom:1,x:50,y:50};
export function validAboutImage(image){return !!image&&typeof image.src==='string'&&imagePath.test(image.src)&&Number.isFinite(image.zoom)&&image.zoom>=1&&image.zoom<=3&&['x','y'].every(key=>Number.isFinite(image[key])&&image[key]>=0&&image[key]<=100);}
export function withAboutImage(doc){return {...doc,aboutImage:doc.aboutImage??{...defaultAboutImage},publishedAboutImage:doc.publishedAboutImage??{...defaultAboutImage}};}
