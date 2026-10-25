// Отдельный статический артефакт; хэш охватывает каждый файл приложения.
import {mkdir,readFile,writeFile,cp,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const roots=['index.html','css','js','data'];
async function files(path){const stat=await readdir(path,{withFileTypes:true});return (await Promise.all(stat.map(e=>e.isDirectory()?files(`${path}/${e.name}`):`${path}/${e.name}`))).flat();}
const assets=['index.html',...(await Promise.all(roots.slice(1).map(files))).flat()].sort();
const hash=createHash('sha256');for(const path of assets)hash.update(path).update(await readFile(path));
const version=hash.digest('hex').slice(0,16);
const template=await readFile('tools/sw-template.js','utf8');
await writeFile('sw.js',template.replace('__VERSION__',version).replace('__ASSETS__',JSON.stringify(['./',...assets.map(x=>'./'+x)])));
await rm('_site',{recursive:true,force:true});await mkdir('_site');for(const path of [...roots,'sw.js'])await cp(path,`_site/${path}`,{recursive:true});
console.log(`Подготовлен сайт: ${assets.length} файлов; кэш ${version}`);
