import {validateNpc} from './validation.js';
import {uid} from './random.js';
export const historyKey='glufonde-npc-history-v1';
// История независима от библиотеки: несохранённые NPC тоже доступны для экспорта.
export class GenerationHistory {
 constructor(storage,locations){
  this.storage=storage;this.locations=locations;this.items=[];this.warning='';this.canPersist=true;
  try{this.items=this.load();}catch{this.canPersist=false;this.warning='История доступна только до закрытия вкладки: хранилище недоступно или повреждено. Экспортируйте DOCX.';}
 }
 load(){
  const raw=this.storage.getItem(historyKey);if(!raw)return [];
  const value=JSON.parse(raw);
  if(value?.version!==1||!Array.isArray(value.npcs))throw new Error('Неверная история');
  const result=value.npcs.map(n=>validateNpc(n,this.locations));
  if(new Set(result.map(n=>n.id)).size!==result.length)throw new Error('Повторяющиеся записи истории');
  return result;
 }
 record(npc,id=null){
  const value=validateNpc({...npc,id:id??uid()},this.locations);
  // Сначала сохраняем в памяти: переполнение localStorage не теряет текущую запись.
  const index=this.items.findIndex(n=>n.id===value.id);
  if(index<0)this.items.push(value);else this.items[index]=value;
  if(this.canPersist){try{
   const latest=this.load(),merged=new Map(latest.map(n=>[n.id,n]));
   for(const item of this.items)merged.set(item.id,item);
   this.items=[...merged.values()];
   this.storage.setItem(historyKey,JSON.stringify({version:1,npcs:this.items}));this.warning='';
  }catch{this.canPersist=false;this.warning='Не удалось записать историю в браузер. Она доступна в этой вкладке; экспортируйте DOCX перед закрытием.';}}
  return value.id;
 }
 read(){return structuredClone(this.items);}
 clear(){
  // Если браузер запретил запись, старые сохранения нельзя считать удалёнными.
  try{this.storage.removeItem(historyKey);}catch{throw new Error('Браузер не разрешил очистить историю.');}
  this.items=[];this.canPersist=true;this.warning='';
 }
}
