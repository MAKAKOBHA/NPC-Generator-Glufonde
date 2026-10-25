import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDocx,crc32,docxMime} from '../js/docx.js';
import {GenerationHistory,historyKey} from '../js/history.js';
import {Generator} from '../js/generator.js';
import {dataFiles,fields} from '../js/config.js';
const data=Object.fromEntries(await Promise.all(dataFiles.map(async n=>[n,JSON.parse(await readFile(new URL(`../data/${n}.json`,import.meta.url)))])));
const generator=new Generator(data);
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function unzip(bytes){
 const entries={},view=new DataView(bytes.buffer);let p=0;
 while(view.getUint32(p,true)===0x04034b50){const size=view.getUint32(p+18,true),nameLength=view.getUint16(p+26,true),extra=view.getUint16(p+28,true),name=new TextDecoder().decode(bytes.slice(p+30,p+30+nameLength)),start=p+30+nameLength+extra,content=bytes.slice(start,start+size);assert.equal(crc32(content),view.getUint32(p+14,true));entries[name]=new TextDecoder().decode(content);p=start+size;}
 assert.equal(view.getUint32(p,true),0x02014b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-12,true),Object.keys(entries).length);return entries;
}
test('DOCX содержит валидный ZIP, связи, русские поля и каждого персонажа',async()=>{
 const npcs=[generator.generate(),generator.generate({category:'girl'})];
 const blob=createDocx(npcs);assert.equal(blob.type,docxMime);
 const entries=unzip(new Uint8Array(await blob.arrayBuffer()));
 for(const path of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/_rels/document.xml.rels'])assert.ok(entries[path]);
 for(const n of npcs){assert.ok(entries['word/document.xml'].includes(n.name));for(const k of Object.keys(fields))if(k!=='awareness')assert.ok(entries['word/document.xml'].includes(String(n[k])));}
 assert.ok(entries['word/document.xml'].includes('<w:pageBreakBefore/>'));assert.ok(entries['word/styles.xml'].includes('ru-RU'));
});
test('Экспорт скрывает сведения мастера и экранирует пользовательский текст',async()=>{
 const n={...generator.generate(),name:'Ян <Краузе> & "сын"',habit:'Строка 1\nСтрока 2\u0001'};
 const xml=unzip(new Uint8Array(await createDocx([n],{hideGm:true}).arrayBuffer()))['word/document.xml'];
 assert.ok(xml.includes('Ян &lt;Краузе&gt; &amp; &quot;сын&quot;'));assert.ok(!xml.includes('Информация мастера'));assert.ok(!xml.includes('Осведомлённость'));assert.ok(xml.includes('<w:br/>'));assert.ok(!xml.includes('\u0001'));assert.throws(()=>createDocx([]));
});
test('История сохраняет несохранённых NPC, правки не создают дубликаты, перезагрузка не теряет записи',()=>{
 const storage=memory(),history=new GenerationHistory(storage,data.locations),one=generator.generate(),two=generator.generate();
 const id=history.record(one);history.record(two);history.record({...one,name:'Ян Новак'},id);
 assert.equal(history.read().length,2);assert.equal(history.read()[0].name,'Ян Новак');assert.equal(new GenerationHistory(storage,data.locations).read().length,2);
 history.clear();assert.equal(new GenerationHistory(storage,data.locations).read().length,0);
});
test('Переполнение хранилища не теряет историю в памяти',()=>{
 const storage={getItem:()=>null,setItem(){throw Error('QuotaExceededError');}};
 const history=new GenerationHistory(storage,data.locations);history.record(generator.generate());history.record(generator.generate());assert.equal(history.read().length,2);assert.ok(history.warning);assert.ok(createDocx(history.read()).size>0);
});
test('Повреждённая история не перезаписывается молча и не блокирует новые NPC',()=>{
 const storage=memory();storage.setItem(historyKey,'{broken');const history=new GenerationHistory(storage,data.locations);history.record(generator.generate());assert.equal(history.read().length,1);assert.equal(storage.getItem(historyKey),'{broken');assert.ok(history.warning);
});
