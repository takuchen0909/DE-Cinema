import {useRef,useState} from "react";
import {assetSrc,type Entry,type Media} from "../lib/archive";

export function EventGallery({entry}:{entry:Entry}) {
  const media:Media[]=[...(entry.image?[{type:"image" as const,src:entry.image}]:[]),...(entry.media||[]).filter(item=>item.src!==entry.image)];
  const [index,setIndex]=useState(0);
  const touchStart=useRef<number|null>(null);
  if(!media.length)return null;
  const current=media[index%media.length];
  const change=(step:number)=>setIndex(value=>(value+step+media.length)%media.length);
  return <section className="event-gallery" aria-label={`${entry.title} photos and videos`} aria-roledescription="carousel" onKeyDown={event=>{if((event.target as HTMLElement).tagName==="VIDEO")return;if(event.key==="ArrowLeft"){event.preventDefault();change(-1);}if(event.key==="ArrowRight"){event.preventDefault();change(1);}}}>
    <div className="gallery-stage" onTouchStart={event=>{touchStart.current=current.type==="image"?event.touches[0].clientX:null;}} onTouchEnd={event=>{if(touchStart.current!==null){const distance=event.changedTouches[0].clientX-touchStart.current;if(Math.abs(distance)>50)change(distance<0?1:-1);}touchStart.current=null;}}>
      {current.type==="video"?<video key={current.src} src={assetSrc(current.src)} controls playsInline preload="metadata" aria-label={`${entry.title} video ${index+1}`}/>:<img src={assetSrc(current.src)} alt={`${entry.title} — photo ${index+1}`} decoding="async"/>}
    </div>
    {media.length>1&&<div className="gallery-controls"><button type="button" onClick={()=>change(-1)} aria-label="Previous photo or video">←</button><span aria-live="polite" aria-atomic="true">{index+1} / {media.length}</span><button type="button" onClick={()=>change(1)} aria-label="Next photo or video">→</button></div>}
  </section>;
}
