import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('../local-admin/',import.meta.url),target=new URL('../public/admin/',import.meta.url);
await mkdir(target,{recursive:true});
const html=(await readFile(new URL('admin.html',source),'utf8')).replace('href="/editor.css"','href="./editor.css"').replace('src="/editor.js"','src="./editor.js"').replaceAll('href="/DE-Cinema/','href="../').replaceAll('src="/DE-Cinema/','src="../');
await writeFile(new URL('index.html',target),html);
await Promise.all(['editor.css','editor.js'].map(name=>copyFile(fileURLToPath(new URL(name,source)),fileURLToPath(new URL(name,target)))));
