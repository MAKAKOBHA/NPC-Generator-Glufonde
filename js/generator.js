import {categories,presets,fields,historyLimit,retryLimit} from './config.js';
import {integer,weighted,uid} from './random.js';
export class Generator {
 constructor(data){this.data=data;this.history={name:[],appearance:[],habit:[]};}
 remember(key,text){const h=this.history[key];if(h){h.push(text);if(h.length>historyLimit)h.shift();}}
 fresh(key,generate){let value;for(let i=0;i<retryLimit;i++){value=generate();if(!this.history[key]?.includes(value.text))break;}this.remember(key,value.text);return value;}
 generate({category='man',preset='normal',previous=null,locks=[],field=null}={}){
  const cat=categories[category];if(!cat||!presets[preset])throw new Error('Неизвестные настройки генерации');
  if(field&&!Object.hasOwn(fields,field))throw new Error('Неизвестное поле');
  const old=previous, locked=new Set(locks);
  const changingCategory=old&&old.category!==category;
  if(changingCategory&&[...locked].some(k=>old.constraints[k]?.gender&&old.constraints[k].gender!==cat.gender))throw new Error('Закреплённые поля несовместимы с выбранной категорией. Снимите закрепление или верните категорию.');
  const result=old?structuredClone(old):{id:uid(),constraints:{}};
  result.category=category;result.gender=cat.gender;
  const should=k=>!locked.has(k)&&(!old||!field||field===k);
  let min=cat.min,max=cat.max;
  for(const k of locked){const c=old?.constraints[k];if(c){min=Math.max(min,c.min??6);max=Math.min(max,c.max??80);}}
  if(min>max)throw new Error('Закреплённые поля несовместимы с возрастом категории. Снимите их закрепление.');
  if(should('age'))result.age=min+integer(max-min+1);
  if(!Number.isInteger(result.age)||result.age<min||result.age>max){
   if(locked.has('age'))throw new Error('Закреплённый возраст не подходит категории. Снимите закрепление возраста.');
   result.age=min+integer(max-min+1);
  }
  for(const key of Object.keys(fields)){
   if(key==='age')continue;
   const c=result.constraints[key];
   const invalid=c&&(result.age<(c.min??6)||result.age>(c.max??80)||(c.gender&&c.gender!==cat.gender));
   if(!should(key)&&!invalid)continue;
   if(locked.has(key))throw new Error('Закреплённое поле несовместимо с возрастом или полом.');
   const item=this.make(key,result,preset);
   result[key]=item.text;result.constraints[key]={min:item.minAge??6,max:item.maxAge??80,...(item.gender?{gender:item.gender}:{})};
  }
  // Изменение категории также согласует род у незакреплённых полей.
  return result;
 }
 make(key,npc,preset){
  const d=this.data,g=npc.gender,a=npc.age, fits=x=>(x.minAge??6)<=a&&(x.maxAge??80)>=a;
  const pick=xs=>weighted(xs.filter(fits));
  if(key==='name')return this.fresh(key,()=>({text:`${weighted(d.names[g]).text} ${weighted(d.surnames)[g]}`,gender:g}));
  if(key==='birthplace')return weighted(d.locations);
  if(key==='appearance')return this.fresh(key,()=>{
   const hair=pick(d.appearance.hair),other=pick(integer(2)?d.appearance.face:d.appearance.body);
   return {text:hair.text+'. '+other.text+'.',minAge:Math.max(hair.minAge,other.minAge)};
  });
  if(key==='distinctive')return pick(d.appearance.clothing);
  if(key==='voice'||key==='verbal')return pick(d.speech[key]);
  if(key==='habit')return this.fresh(key,()=>pick(d.habits));
  if(key==='profession'){const x=weighted(d.professions.filter(fits),x=>x.weight*(x.affinity===npc.birthplace?3:1));return {...x,text:x[g],gender:g};}
  if(key==='mood')return {text:weighted(d.moods)[g],gender:g};
  if(key==='awareness')return {text:weighted([0,1,2,3,4],i=>presets[preset].weights[i])};
  throw new Error('Неизвестное поле');
 }
}
