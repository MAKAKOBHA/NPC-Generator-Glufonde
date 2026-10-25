import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Generator} from '../js/generator.js';
import {Library,storageKey} from '../js/storage.js';
import {validateData,validateNpc} from '../js/validation.js';
import {categories,presets,fields,dataFiles} from '../js/config.js';
import {weighted} from '../js/random.js';
const data=Object.fromEntries(await Promise.all(dataFiles.map(async n=>[n,JSON.parse(await readFile(new URL(`../data/${n}.json`,import.meta.url)))])));
const generator=new Generator(data);
const sample=()=>generator.generate();
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('Размеры справочников, уникальность, формы фамилий',()=>{validateData(data);for(const group of Object.values(data.names))assert.equal(new Set(group.map(x=>x.text)).size,group.length);assert.ok(data.professions.length>=50);assert.ok(data.moods.length>=10);});
test('Ошибки справочников обнаруживаются',()=>{for(const mutate of [d=>d.names.male.push(d.names.male[0]),d=>delete d.surnames[0].female,d=>d.surnames.push(d.surnames[0]),d=>d.habits.splice(0,30)]){const d=structuredClone(data);mutate(d);assert.throws(()=>validateData(d));}});
test('Точный канонический перечень мест',()=>assert.deepEqual(data.locations.map(x=>x.text).sort(),'Зровер|Дул|Разкол|Горка|Нова Горка|Барташа|Врелей|Бедо|Шанс|Далёко|Тополица|Сосна|Пшенинца|Шавмер|Торбуттон|Стаб|Королевство Карбанто|Бигла'.split('|').sort()));
test('4000 NPC: возраст, род, канон и совместимость описаний',()=>{
 for(const category of Object.keys(categories))for(let i=0;i<1000;i++){
  const n=generator.generate({category}),c=categories[category];validateNpc(n,data.locations);assert.ok(n.age>=c.min&&n.age<=c.max);assert.equal(n.gender,c.gender);
  assert.ok(data.surnames.some(x=>n.name.endsWith(' '+x[c.gender])));assert.ok(data.names[c.gender].some(x=>n.name.startsWith(x.text+' ')));
  assert.ok(data.moods.some(x=>x[c.gender]===n.mood));assert.ok(data.professions.some(x=>x[c.gender]===n.profession&&x.minAge<=n.age&&x.maxAge>=n.age));
  for(const c of Object.values(n.constraints)){assert.ok(n.age>=c.min&&n.age<=c.max);if(c.gender)assert.equal(c.gender,n.gender);}
  assert.ok(data.appearance.hair.some(x=>n.appearance.startsWith(x.text+'.')));
 }
});
test('Весовые пресеты совпадают со спецификацией и границами интервалов',()=>{
 assert.deepEqual(Object.values(presets).map(x=>x.weights),[[45,20,20,10,5],[15,15,25,30,15],[20,20,20,20,20]]);
 for(const p of Object.values(presets)){assert.equal(p.weights.reduce((a,b)=>a+b),100);let lower=0;for(let i=0;i<5;i++){assert.equal(weighted([0,1,2,3,4],j=>p.weights[j],()=>(lower+.001)/100),i);assert.equal(weighted([0,1,2,3,4],j=>p.weights[j],()=>(lower+p.weights[i]-.001)/100),i);lower+=p.weights[i];}}
 assert.throws(()=>weighted([]));assert.throws(()=>weighted([1],()=>-1));
});
test('Каждое отдельное поле обновляется, независимые поля сохраняются',()=>{
 const previous=sample();for(const field of Object.keys(fields)){const n=generator.generate({previous,field});validateNpc(n,data.locations);for(const k of Object.keys(fields))if(k!==field&&k!=='age'&&!['appearance','voice','profession','distinctive','habit'].includes(k))assert.equal(n[k],previous[k]);assert.equal(n.id,previous.id);}
});
test('Все закрепления сохраняются побайтно',()=>{const previous=sample(),all=Object.keys(fields);for(let i=0;i<100;i++){const n=generator.generate({previous,locks:all});assert.deepEqual(n,previous);}});
test('Закреплённая профессия ограничивает возраст; пол несовместимого закрепления отклоняется',()=>{
 const previous=generator.generate({category:'boy'});assert.throws(()=>generator.generate({previous,category:'woman',locks:['name']}));assert.throws(()=>generator.generate({previous,category:'man',locks:['profession']}));
 for(let i=0;i<100;i++){const n=generator.generate({previous,category:'boy',locks:['profession']});assert.equal(n.profession,previous.profession);assert.ok(n.age<=17);}
});
test('Смена пола и категории согласует незакреплённые значения',()=>{let previous=sample();for(const category of ['girl','woman','boy','man']){previous=generator.generate({previous,category});validateNpc(previous,data.locations);assert.equal(previous.constraints.name.gender,categories[category].gender);}});
test('Хранилище переживает пересоздание, заменяет только явно',()=>{const storage=memory(),lib=new Library(storage,data.locations),n=sample();lib.save(n);assert.equal(new Library(storage,data.locations).read()[0].name,n.name);lib.save(n);assert.equal(lib.read().length,2);lib.save({...n,name:'Ян Новак'},{replace:true});assert.equal(lib.read().length,2);assert.equal(lib.read()[0].name,'Ян Новак');lib.remove(n.id);assert.equal(lib.read().length,1);});
test('Экспорт/импорт: без потерь, с новыми ID при совпадениях',()=>{const lib=new Library(memory(),data.locations);lib.save(sample());const raw=lib.export();lib.import(raw);assert.equal(lib.read().length,2);assert.equal(new Set(lib.read().map(x=>x.id)).size,2);const other=new Library(memory(),data.locations);other.import(raw);assert.equal(other.export(),raw);});
test('Повреждённые файлы, повторяющиеся ID и несовместимые поля отклоняются атомарно',()=>{
 const lib=new Library(memory(),data.locations);const n=lib.save(sample()),before=lib.export();
 const bad=[null,{version:2,npcs:[]},{version:1,npcs:[n,n]},{version:1,npcs:[{...n,birthplace:'Несуществующий город'}]},{version:1,npcs:[{...n,age:-1}]},{version:1,npcs:[{...n,name:''}]},{version:1,npcs:[{...n,awareness:9}]},{version:1,npcs:[{...n,constraints:{name:{min:81}}}]}];
 for(const x of ['{broken',...bad.map(x=>JSON.stringify(x))]){assert.throws(()=>lib.import(x));assert.equal(lib.export(),before);}
 assert.throws(()=>lib.import('x'.repeat(5_000_001)));
});
test('Ошибка localStorage не теряет библиотеку молча',()=>{const storage=memory();storage.setItem(storageKey,'bad');assert.throws(()=>new Library(storage,data.locations).read());const blocked={getItem(){throw Error();},setItem(){throw Error();}};assert.throws(()=>new Library(blocked,data.locations).read());assert.throws(()=>new Library(blocked,data.locations).write([]));});
test('Недавние имена, внешность и привычки не повторяются сразу',()=>{const gen=new Generator(data);let last=gen.generate();for(let i=0;i<100;i++){const next=gen.generate();for(const k of ['name','appearance','habit'])assert.notEqual(next[k],last[k]);last=next;}assert.ok(gen.history.name.length<=30);});
test('Повторы при исчерпанном наборе завершаются с ограниченным числом попыток',()=>{const gen=new Generator(data);let calls=0;gen.fresh('name',()=>{calls++;return {text:'Одно имя'};});gen.fresh('name',()=>{calls++;return {text:'Одно имя'};});assert.equal(calls,17);});
