import {categories,fields} from './config.js';
export function validateNpc(n,locations){
 if(!n||typeof n!=='object'||Array.isArray(n)||!categories[n.category])throw new Error('Некорректная карточка персонажа');
 const c=categories[n.category];
 if(n.gender!==c.gender||!Number.isInteger(n.age)||n.age<c.min||n.age>c.max)throw new Error('Возраст или пол не соответствует категории');
 if(typeof n.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(n.id))throw new Error('Некорректный идентификатор персонажа');
 for(const key of Object.keys(fields)){
  if(key==='age')continue;
  if(key==='awareness'){if(!Number.isInteger(n[key])||n[key]<0||n[key]>4)throw new Error('Неверный уровень осведомлённости');}
  else if(typeof n[key]!=='string'||!n[key].trim()||n[key].length>600)throw new Error('Заполните поле «'+fields[key]+'» (не более 600 символов)');
 }
 if(!locations.some(x=>x.text===n.birthplace))throw new Error('Место рождения отсутствует в каноническом списке');
 if(!n.constraints||typeof n.constraints!=='object'||Array.isArray(n.constraints))throw new Error('Отсутствуют правила совместимости');
 const clean={id:n.id,category:n.category,gender:n.gender,constraints:{}};
 for(const k of Object.keys(fields))clean[k]=n[k];
 for(const [k,v] of Object.entries(n.constraints)){
  if(!Object.hasOwn(fields,k)||!v||typeof v!=='object')throw new Error('Некорректные правила совместимости');
  const min=v.min??6,max=v.max??80;
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<6||max>80||min>max||n.age<min||n.age>max||(v.gender&&v.gender!==n.gender))throw new Error('Поле не совместимо с возрастом или полом');
  clean.constraints[k]={min,max,...(v.gender?{gender:v.gender}:{})};
 }
 return clean;
}
export function validateData(d){
 const unique=xs=>new Set(xs).size===xs.length;
 for(const g of ['male','female'])if(d.names[g].length<150||!unique(d.names[g].map(x=>x.text)))throw new Error('Ошибка базы имён');
 if(d.surnames.length<200||!unique(d.surnames.map(x=>x.male))||!unique(d.surnames.map(x=>x.female))||d.surnames.some(x=>!x.male||!x.female))throw new Error('Ошибка базы фамилий');
 for(const [group,sizes] of [[d.appearance,{face:60,hair:40,body:35,clothing:60}],[d.speech,{voice:50,verbal:50}]])for(const [k,min] of Object.entries(sizes))if(group[k].length<min||!unique(group[k].map(x=>x.text)))throw new Error('Ошибка справочника описаний');
 if(d.habits.length<70||!unique(d.habits.map(x=>x.text)))throw new Error('Ошибка справочника привычек');
 return d;
}
