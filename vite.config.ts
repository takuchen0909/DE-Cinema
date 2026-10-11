import {defineConfig,type Plugin,type ProxyOptions} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";
import {ensureLocalAdmin} from "./scripts/local-admin.mjs";
function localArchive():Plugin{
  return{name:"local-archive-editor",async configureServer(server){
    const editor=await ensureLocalAdmin();
    server.httpServer?.once("close",()=>editor.stop());
  }};
}
const localProxy:ProxyOptions={target:"http://127.0.0.1:5180",changeOrigin:true,configure(proxy){
  proxy.on("proxyReq",(outgoing,request)=>{
    const origin=request.headers.origin;
    if(!origin)return;
    try{const parsed=new URL(origin);if(parsed.host===request.headers.host&&["127.0.0.1","localhost","[::1]"].includes(parsed.hostname))outgoing.setHeader("Origin","http://127.0.0.1:5180");}catch{}
  });
}};
export default defineConfig(({command})=>({base:command==="serve"?"/DE-Cinema/":"./",plugins:[react(),localArchive()],resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},server:{host:"127.0.0.1",port:5174,proxy:{"/api/":localProxy,"/local-image/":localProxy,"/DE-Cinema/uploads/":localProxy,"/DE-Cinema/archive.json":localProxy}}}));
