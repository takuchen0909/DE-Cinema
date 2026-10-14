import {descriptionParts} from "./description";
export type Media = { type: "image" | "video"; src: string };
export type Entry = { id: string; section: "news" | "past"; title: string; category: string; date: string; description: string; image: string; coverCrop?: {zoom:number;x:number;y:number}; summary?: string; media?: Media[] };
export const initialEntries: Entry[] = [
{id:"news-shore",section:"news",title:"Notes from the shore",category:"",date:"",description:"",image:"/assets/sea.jpg"},
{id:"news-invitation",section:"news",title:"An open invitation",category:"",date:"",description:"",image:""},
{id:"news-untitled",section:"news",title:"Untitled",category:"",date:"",description:"",image:""},
{id:"past-midnight",section:"past",title:"Midnight Ambiguous Zone",category:"SCREENING",date:"19 July – 8 September 2026",description:"Blue Gate Crossing, The Last Year of Darkness and Pride Shorts Collection.",image:"/assets/screening.jpg"},
{id:"past-water",section:"past",title:"Across the water",category:"",date:"",description:"",image:"/assets/sea.jpg"},
{id:"past-listening",section:"past",title:"Listening together",category:"",date:"",description:"",image:""}
];

export function assetSrc(src:string){const path=src==="/assets/screening.jpg"?"/assets/screening.webp":src;return path.startsWith("/")?import.meta.env.BASE_URL+path.slice(1):path;}

export function entrySummary(entry:Entry){
  const text=(entry.summary?.trim()||(entry.section==="past"?descriptionParts(entry.description).map(part=>part.text).join(""):entry.description)).replace(/\s+/g," ").trim();
  return Array.from(text).length>140?Array.from(text).slice(0,137).join("").trimEnd()+"…":text;
}

export type AboutImage = {src:string;zoom:number;x:number;y:number};
export const defaultAboutImage:AboutImage={src:"/assets/screening.webp",zoom:1,x:50,y:50};

export function coverStyle(entry:Entry){const crop=entry.coverCrop||{zoom:1,x:50,y:50};return {objectPosition:`${crop.x}% ${crop.y}%`,transform:`scale(${crop.zoom})`,transformOrigin:`${crop.x}% ${crop.y}%`};}
