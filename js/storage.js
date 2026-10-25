import {validateNpc} from './validation.js';
import {uid} from './random.js';
export const storageKey='glufonde-npc-library-v1';
export class Library {
 constructor(storage,locations){this.storage=storage;this.locations=locations;}
 read(){
  let raw;try{raw=this.storage.getItem(storageKey);}catch{throw new Error('Браузер запретил доступ к хранилищу. Используйте экспорт для сохранения.');}
  if(!raw)return [];
  return this.parse(raw);
 }
 parse(raw){
  if(raw.length>5_000_000)throw new Error('Файл слишком большой (максимум 5 МБ)');
  let data;try{data=JSON.parse(raw);}catch{throw new Error('Не удалось прочитать JSON. Исходная библиотека не изменена.');}
  if(data?.version!==1||!Array.isArray(data.npcs)||data.npcs.length>2000)throw new Error('Неподдерживаемый формат библиотеки');
  const result=data.npcs.map(n=>validateNpc(n,this.locations));
  if(new Set(result.map(x=>x.id)).size!==result.length)throw new Error('В файле повторяются идентификаторы');
  return result;
 }
 write(npcs){try{this.storage.setItem(storageKey,this.export(npcs));}catch{throw new Error('Не удалось сохранить: хранилище недоступно или заполнено. Экспортируйте карточку.');}}
 export(npcs=this.read()){return JSON.stringify({version:1,npcs},null,2);}
 save(npc,{replace=false}={}){
  const valid=validateNpc(npc,this.locations),all=this.read(),index=all.findIndex(x=>x.id===valid.id);
  if(index>=0&&!replace){valid.id=uid();all.push(valid);}else if(index>=0)all[index]=valid;else all.push(valid);
  if(all.length>2000)throw new Error('В библиотеке уже 2000 персонажей. Экспортируйте архив и освободите место.');
  this.write(all);return valid;
 }
 remove(id){this.write(this.read().filter(x=>x.id!==id));}
 import(raw){const incoming=this.parse(raw),existing=this.read(),ids=new Set(existing.map(x=>x.id));for(const n of incoming){while(ids.has(n.id))n.id=uid();ids.add(n.id);existing.push(n);}if(existing.length>2000)throw new Error('После импорта будет больше 2000 персонажей');this.write(existing);return incoming.length;}
}
