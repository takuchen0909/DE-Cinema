"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {initialEntries,assetSrc,entrySummary,coverStyle,defaultAboutImage,type AboutImage,type Entry} from "../lib/archive";

import {EventGallery} from "../components/event-gallery";

const aboutParagraphs = [
  "Diaspora East Cinema is an Amsterdam-based curatorial collective and exchange platform active across the Netherlands. We focus on Sinophone, Southeast Asian, and broader Asian images. Our practices include curated screenings, workshops, Q&As, film reviews, filmmaker interviews, and ongoing coverage of international film festivals.",
  "For us, “diaspora” carries two meanings. First, it refers to the independent films we present that exist outside mainstream systems; as they travel across borders, they navigate different regions, histories, and political realities. Our mission is to let them be seen.",
  "“Diaspora” also speaks to the communities we aim to connect. Our team is shaped by diverse migration paths, and our work is rooted in the lived experience of navigating complex cultural contexts in Europe. Beyond the screen, we envision Diaspora East Cinema as a space for gathering and reflection - a place where people find resonance through the moving image."
];
const sections = [["about","ABOUT US"],["news","NEWS"],["past","ARCHIVE"],["contact","CONTACT"]];
const contactEmail = "info@decinema.nl";

function Typewriter({text}:{text:string}) {
  const element=useRef<HTMLSpanElement>(null);
  const [count,setCount]=useState(text.length);
  useEffect(()=>{
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(motion.matches){setCount(text.length);return;}
    setCount(0);
    let frame=0,start:number|null=null;
    const duration=Math.min(2600,Math.max(500,text.length*7));
    const tick=(time:number)=>{
      if(start===null)start=time;
      const progress=Math.min(1,(time-start)/duration);
      setCount(Math.floor(progress*text.length));
      if(progress<1)frame=requestAnimationFrame(tick);
    };
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){observer.disconnect();frame=requestAnimationFrame(tick);}
    },{threshold:.1});
    if(element.current)observer.observe(element.current);
    const finish=()=>{if(motion.matches){cancelAnimationFrame(frame);observer.disconnect();setCount(text.length);}};
    motion.addEventListener("change",finish);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);motion.removeEventListener("change",finish);};
  },[text]);
  return <span ref={element} className="typewriter"><span className="typewriter-reserve" aria-hidden="true">{text}</span><span className="sr-only">{text}</span><span className="typewriter-ink" aria-hidden="true">{text.slice(0,count)}</span></span>;
}

export default function Archive() {
  const [aboutImage,setAboutImage]=useState<AboutImage>(defaultAboutImage);
  const [published,setPublished]=useState<Entry[]>(initialEntries);
  const [detail,setDetail]=useState<string|null>(null);
  const [adminRequested,setAdminRequested]=useState(false);
  const [active,setActive]=useState("home");
  const [logoReady,setLogoReady]=useState(false);
  const [headerVisible,setHeaderVisible]=useState(false);
  const [logoFinished,setLogoFinished]=useState(false);
  const [videoFailed,setVideoFailed]=useState(false);
  const [email,setEmail]=useState("");
  const [showEmail,setShowEmail]=useState(false);
  const [mailStatus,setMailStatus]=useState("");
  const [error,setError]=useState("");
  const videoRef=useRef<HTMLVideoElement>(null);
  const scrollFrame=useRef(0);
  const enteringAbout=useRef(false);
  const heroRef=useRef<HTMLElement>(null);
  const aboutRef=useRef<HTMLElement>(null);
  const liveEntries=useRef(published);liveEntries.current=published;

  useEffect(()=>{
    const cancel=()=>{cancelAnimationFrame(scrollFrame.current);enteringAbout.current=false;};
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||event.deltaY===0)return;
      const hero=heroRef.current;
      if(event.deltaY>0&&(enteringAbout.current||(!detail&&!adminRequested&&hero&&hero.getBoundingClientRect().bottom>0))){
        event.preventDefault();
        if(!enteringAbout.current)enterAbout();
        return;
      }
      cancel();
    };
    window.addEventListener("wheel",wheel,{passive:false});
    window.addEventListener("touchstart",cancel,{passive:true});
    window.addEventListener("keydown",cancel);
    return()=>{cancel();window.removeEventListener("wheel",wheel);window.removeEventListener("touchstart",cancel);window.removeEventListener("keydown",cancel);};
  },[detail,adminRequested]);

  useEffect(()=>{
    if(!logoReady)return;
    const timer=window.setTimeout(()=>setLogoFinished(true),4530);
    return()=>window.clearTimeout(timer);
  },[logoReady]);

  useEffect(()=>{
    if(adminRequested){setHeaderVisible(false);return;}
    if(detail){setHeaderVisible(true);return;}
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame=0;
    const update=()=>{
      frame=0;
      const hero=heroRef.current,about=aboutRef.current;
      setHeaderVisible(Boolean(about&&about.getBoundingClientRect().top<=100));
      if(hero){
        const progress=Math.max(0,Math.min(window.scrollY,hero.offsetHeight));
        hero.style.setProperty("--hero-shift",`${reducedMotion.matches?0:progress*.3}px`);
        hero.style.setProperty("--logo-shift",`${reducedMotion.matches?0:progress*.12}px`);
      }

    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule);
    reducedMotion.addEventListener("change",schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);reducedMotion.removeEventListener("change",schedule);};
  },[detail,adminRequested]);

  useEffect(()=>{
    fetch(import.meta.env.BASE_URL+"archive.json",{cache:"no-store"})
      .then(async response=>{if(!response.ok)throw new Error("Could not refresh the archive.");const data=await response.json();if(!Array.isArray(data.entries))throw new Error("Could not refresh the archive.");setPublished(data.entries);setAboutImage(data.aboutImage||defaultAboutImage);})
      .catch(()=>setError("Showing the saved archive. The latest entries could not be loaded."));
  },[]);

  useEffect(()=>{
    const sync=()=>{
      cancelAnimationFrame(scrollFrame.current);
      enteringAbout.current=false;
      const hash=decodeURIComponent(location.hash.slice(1))||"home";
      if(hash==="admin"){
        setAdminRequested(true);setDetail(null);setActive("admin");window.scrollTo({top:0,behavior:"instant"});return;
      }
      setAdminRequested(false);
      if(hash.startsWith("entry/")){setDetail(hash.slice(6));setActive("entry");window.scrollTo({top:0,behavior:"instant"});}
      else {if(sections.some(([id])=>id===hash)||hash==="home")history.replaceState(null,"",location.pathname+location.search);setDetail(null);setActive(hash);requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));}
    };
    sync();window.addEventListener("hashchange",sync);
    return()=>window.removeEventListener("hashchange",sync);
  },[]);

  useEffect(()=>{
    if(detail||adminRequested)return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting)setActive(entry.target.id);
    },{rootMargin:"-15% 0px -55% 0px",threshold:0});
    document.querySelectorAll("main > section[id]").forEach(section=>observer.observe(section));
    return()=>observer.disconnect();
  },[detail,adminRequested]);

  useEffect(()=>{
    if(detail||adminRequested||!videoRef.current)return;
    const video=videoRef.current;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches)void video.play().catch(()=>{});
      else video.pause();
    });
    observer.observe(video);return()=>observer.disconnect();
  },[detail,adminRequested]);

  useEffect(()=>{
    const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const registered=[{name:"read_archive_entries",description:"Read the published News and ARCHIVE entries.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({entries:liveEntries.current})},{name:"open_archive_section",description:"Navigate the visible archive to News or ARCHIVE.",inputSchema:{type:"object",properties:{section:{type:"string",enum:["news","past"]}},required:["section"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input:unknown)=>{const value=input as {section?:string};if(!value||!["news","past"].includes(value.section||""))throw new Error("Choose news or past.");location.hash=value.section!;return{section:value.section};}}];
    for(const tool of registered){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(console.error);}catch(error){console.error(error);}}
    return()=>lifecycle.abort();
  },[]);

  function enterAbout(){
    const about=aboutRef.current;
    if(!about||enteringAbout.current)return;
    enteringAbout.current=true;
    cancelAnimationFrame(scrollFrame.current);
    history.replaceState(null,"",location.pathname+location.search);
    setActive("about");
    const startY=window.scrollY;
    const targetY=about.getBoundingClientRect().top+startY;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){window.scrollTo({top:targetY,behavior:"instant"});enteringAbout.current=false;return;}
    const startTime=performance.now();
    const tick=(time:number)=>{
      const progress=Math.min(1,(time-startTime)/1800);
      const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
      window.scrollTo({top:startY+(targetY-startY)*eased,behavior:"instant"});
      if(progress<1)scrollFrame.current=requestAnimationFrame(tick);
      else enteringAbout.current=false;
    };
    scrollFrame.current=requestAnimationFrame(tick);
  }

  function goTo(id:string){
    setAdminRequested(false);
    cancelAnimationFrame(scrollFrame.current);
    enteringAbout.current=false;
    setDetail(null);
    setActive(id);
    history.replaceState(null,"",location.pathname+location.search);
    requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));
  }
  function enquire(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const body=`Hello Diaspora East Cinema,\n\nI would like to hear more about your screenings, newsletter and upcoming events.\n\nMy email: ${email}\n\nThank you!`;
    window.location.href=`mailto:${contactEmail}?subject=${encodeURIComponent("Newsletter & events enquiry")}&body=${encodeURIComponent(body)}`;
    setMailStatus("Please send the enquiry in your email app.");
  }
  function archiveSection(section:"news"|"past",title:string){
    const entries=published.filter(entry=>entry.section===section);
    return <section className="archive-section page-section" id={section}><div className="section-heading"><h2><Typewriter text={title}/></h2></div><div className="card-grid">{entries.map(entry=><a key={entry.id} className="card" href={"#entry/"+entry.id}><div className="cover">{entry.image?<img src={assetSrc(entry.image)} style={coverStyle(entry)} decoding="async" loading="lazy" alt={entry.title}/>:<div className="placeholder"><img src={assetSrc("/assets/logo.webp")} alt=""/></div>}{(entry.date||entrySummary(entry))&&<div className="card-overlay">{entrySummary(entry)&&<p className="card-summary">{entrySummary(entry)}</p>}{entry.date&&<p>{entry.date}</p>}</div>}</div><div className="card-body"><h3><Typewriter text={entry.title}/><span aria-hidden="true">↗</span></h3>{entry.category&&<p className="category">{entry.category}</p>}</div></a>)}</div>{entries.length===0&&<p>No entries published yet.</p>}{section==="news"&&error&&<p className="public-error" role="status">{error}</p>}</section>;
  }
  const item=published.find(entry=>entry.id===detail);
  return <>
    <header className={"site-header"+(headerVisible?" is-visible":"")} aria-hidden={!headerVisible} inert={!headerVisible}><nav aria-label="Main navigation">{sections.map(([id,label])=><button type="button" key={id} onClick={()=>goTo(id)} className={active===id?"active":""} aria-current={active===id?"location":undefined}>{label}</button>)}</nav></header>
    <main>{adminRequested?<iframe className="admin-frame" title="Archive CMS" src={assetSrc("/admin/index.html")}/>:detail?<article className="article"><button type="button" className="back" onClick={()=>goTo(item?.section==="past"?"past":"news")}>← Back to {item?.section==="past"?"ARCHIVE":"News"}</button>{item?<div className="detail-frame"><EventGallery key={item.id} entry={item}/><div className="detail-body">{item.category&&<p className="category">{item.category}</p>}<h1><Typewriter text={item.title}/></h1>{item.date&&<p>{item.date}</p>}{item.description&&<p className="description"><Typewriter text={item.description}/></p>}</div></div>:<h1>Entry not found</h1>}</article>:<>
      <section ref={heroRef} className="hero" id="home" aria-label="Diaspora East Cinema introduction">
        {!videoFailed&&<video ref={videoRef} className="hero-video" src={assetSrc("/assets/home-video.mp4")} poster={assetSrc("/assets/home-poster.jpg")} muted loop playsInline preload="metadata" onError={()=>setVideoFailed(true)}/>}
        {videoFailed&&<img className="hero-video" src={assetSrc("/assets/home-poster.jpg")} alt=""/>}
        <div className="hero-shade"/>
        <div className="hero-logo-wrap"><img className="hero-logo" src={assetSrc(logoFinished?"/assets/bird-logo-final.png":"/assets/bird_logo_animated.gif")} onLoad={()=>setLogoReady(true)} alt="" fetchPriority="high"/></div>
        <button className="hero-enter" type="button" onClick={enterAbout} aria-label="Scroll to About us"/>
      </section>
      <section ref={aboutRef} className="about-section page-section" id="about"><div className="about-grid"><div className="about-copy"><a href={import.meta.env.BASE_URL} onClick={event=>{event.preventDefault();goTo("home");}} className="brand about-brand" aria-label="Diaspora East Cinema home"><img src={assetSrc("/assets/logo.webp")} alt="Diaspora East Cinema"/></a><div className="about-text">{aboutParagraphs.map((paragraph,index)=><p key={paragraph} className={index===0?"about-lead":undefined}><Typewriter text={paragraph}/></p>)}</div><h1><Typewriter text="ABOUT US"/></h1></div><figure className="about-photo"><img src={assetSrc(aboutImage.src)} style={{objectPosition:`${aboutImage.x}% ${aboutImage.y}%`,transform:`scale(${aboutImage.zoom})`,transformOrigin:`${aboutImage.x}% ${aboutImage.y}%`}} alt="Diaspora East Cinema screening event" loading="lazy"/></figure></div></section>
      {archiveSection("news","News")}{archiveSection("past","ARCHIVE")}
      <section className="contact-section page-section" id="contact"><div className="contact-intro"><h2><Typewriter text="Newsletter"/></h2><form className="enquiry-form" onSubmit={enquire}><label className="sr-only" htmlFor="enquiry-email">Your email address</label><input id="enquiry-email" type="email" placeholder="Your email address" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/><button type="submit">Email us <span aria-hidden="true">↗</span></button></form>{mailStatus&&<p className="form-note" role="status">{mailStatus}</p>}</div><div className="contact-links"><h2><Typewriter text="Social media"/></h2><div className="social-icons"><a className="social-link" aria-label="Instagram — Diaspora East Cinema" title="Instagram — Diaspora East Cinema" href="https://www.instagram.com/diaspora_east_cinema/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg></a><a className="social-link social-link-xiaohongshu" aria-label="小红书 — @浮游Diaspora East Cinema" title="小红书 — @浮游Diaspora East Cinema" href="https://www.xiaohongshu.com/user/profile/6674c3130000000003031ba4?xsec_token=ABrMvV2t-uM5yowpWPM9vMrkPh8dri6Lh0DS2o_qyMIQA%3D&amp;xsec_source=pc_search" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"/></svg></a><button type="button" className="social-link" aria-label="Show email address" aria-expanded={showEmail} aria-controls="social-email" onClick={()=>setShowEmail(value=>!value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></svg></button></div><p id="social-email" className="social-email" hidden={!showEmail}><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p></div></section>
    </>}</main>
  </>;
}
