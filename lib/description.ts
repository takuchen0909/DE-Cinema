export type DescriptionPart = {text:string;href?:string};
export function descriptionParts(text:string):DescriptionPart[]{
  const parts:DescriptionPart[]=[];
  const pattern=/\[([^\]\n]+)\]\(([^\s)]*)\)|https?:\/\/[^\s<>"\[\]]+/gi;
  let end=0;
  for(const match of text.matchAll(pattern)){
    const index=match.index!;
    if(index>end)parts.push({text:text.slice(end,index)});
    const raw=match[2]??match[0].replace(/[.,!?;:，。！？；：]+$/u,'');
    let href:string|undefined;
    try{const url=new URL(raw);if(['http:','https:'].includes(url.protocol)&&url.hostname)href=url.href;}catch{}
    if(href){parts.push({text:match[1]??raw,href});if(!match[1]&&raw.length<match[0].length)parts.push({text:match[0].slice(raw.length)});}
    else parts.push({text:match[0]});
    end=index+match[0].length;
  }
  if(end<text.length)parts.push({text:text.slice(end)});
  return parts;
}
