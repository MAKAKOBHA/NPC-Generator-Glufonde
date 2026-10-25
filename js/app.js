import {categories,presets,awareness,fields,dataFiles} from './config.js';
import {Generator} from './generator.js';
import {Library} from './storage.js';
import {GenerationHistory} from './history.js';
import {createDocx} from './docx.js';
import {validateData,validateNpc} from './validation.js';
import {$,node,renderCard,description,copyText,download,confirmAction} from './ui.js';
let history,historyId=null;
let data,generator,library,current=null,category='man',locks=new Set(),savedId=null,dirty=false;
const status=text=>$('status').textContent=text;
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(error){status(error.message||'Не удалось выполнить действие.');}};
function view(which){
 for(const key of ['generator','library','history']){$(key+'-view').hidden=which!==key;$(key+'-tab').setAttribute('aria-pressed',String(which===key));}
 if(which==='library')renderLibrary();if(which==='history')renderHistory();
}
function historyControls(){
 const count=history.items.length;$('history-count').textContent=count;
 $('export-history-docx').disabled=!count;$('export-history-docx-list').disabled=!count;
}
function recordHistory(){historyId=history.record(current,historyId);historyControls();}
function renderHistory(){
 const list=$('history-list');list.replaceChildren();const all=history.read();historyControls();
 if(!all.length){list.append(node('p','История пока пуста. Сгенерируйте персонажа.'));return;}
 for(const n of [...all].reverse()){
  const card=node('article',undefined,{class:'saved-card'});card.append(node('h3',n.name),node('p',`${n.age} лет · ${n.birthplace}`),node('p',n.profession));
  const open=node('button','Открыть');open.onclick=()=>{current=structuredClone(n);category=n.category;historyId=n.id;savedId=null;dirty=true;locks.clear();render();view('generator');$('workspace').focus();status('Открыт персонаж из истории.');};card.append(open);list.append(card);
 }
}

function render(){
 renderCard(current,locks,$('hide-gm').checked,key=>generate(key),key=>{const focusedLabel=`Закрепить: ${fields[key]}`;if(locks.has(key))locks.delete(key);else locks.add(key);render();document.querySelector(`[aria-label="${focusedLabel}"]`)?.focus();});
 $('card-state').textContent=savedId?(dirty?'Есть изменения':'Из библиотеки'):'Не сохранён';$('update').hidden=!savedId;
 for(const button of $('categories').children)button.setAttribute('aria-pressed',String(button.dataset.category===category));
}
function generate(field=null){
 try{current=generator.generate({category,preset:$('preset').value,previous:current,locks:[...locks],field});if(!field){savedId=null;historyId=null;}recordHistory();dirty=true;render();status(field?`Обновлено: ${fields[field]}`:'Персонаж создан.');if(history.warning)status(history.warning);if(field)document.querySelector(`[aria-label="Заново: ${fields[field]}"]`)?.focus();}catch(error){status(error.message);}
}
function renderLibrary(){
 const all=library.read();$('count').textContent=all.length;
 const q=$('search').value.trim().toLocaleLowerCase('ru'),shown=all.filter(n=>[n.name,n.birthplace,n.profession].some(x=>x.toLocaleLowerCase('ru').includes(q)));
 const list=$('library-list');list.replaceChildren();
 if(!shown.length){list.append(node('p',all.length?'Ничего не найдено.':'Библиотека пока пуста. Сохраните первого персонажа.'));return;}
 for(const n of shown){const card=node('article',undefined,{class:'saved-card'});card.append(node('h3',n.name),node('p',`${n.age} лет · ${n.birthplace}`),node('p',n.profession));const actions=node('div',undefined,{class:'actions'});
 const open=node('button','Открыть'),copy=node('button','Копировать'),remove=node('button','Удалить');
 open.onclick=()=>{current=structuredClone(n);category=n.category;historyId=null;savedId=n.id;dirty=false;locks.clear();render();view('generator');$('workspace').focus();status('Открыт сохранённый персонаж.');};
 copy.onclick=safe(async()=>{if(await copyText(description(n,$('hide-gm').checked)))status('Описание скопировано.');});
 remove.onclick=safe(async()=>{if(await confirmAction('Удалить персонажа?',`«${n.name}» будет удалён из этого браузера.`)){library.remove(n.id);if(savedId===n.id){savedId=null;render();}renderLibrary();status('Персонаж удалён.');}});
 actions.append(open,copy,remove);card.append(actions);list.append(card);
 }
}
function editor(){
 const container=$('edit-fields');container.replaceChildren();$('edit-error').textContent='';
 for(const [key,label] of Object.entries(fields)){
  // Скрытая информация мастера не должна случайно открыться игрокам.
  if(key==='awareness'&&$('hide-gm').checked)continue;
  const wrapper=node('label',label),input=node(key==='birthplace'||key==='awareness'?'select':key==='age'?'input':'textarea',undefined,{name:key});
  if(key==='birthplace')for(const loc of data.locations)input.append(node('option',loc.text,{value:loc.text}));
  else if(key==='awareness')awareness.forEach((x,i)=>input.append(node('option',`${i} — ${x[0]}`,{value:i})));
  else if(key==='age'){input.type='number';input.min=categories[current.category].min;input.max=categories[current.category].max;input.required=true;}
  else{input.rows=2;input.maxLength=600;input.required=true;}
  input.value=current[key];wrapper.append(input);container.append(wrapper);
 }
 $('editor').showModal();
}
function bind(){
 for(const [key,c] of Object.entries(categories)){const button=node('button',c.label,{'aria-pressed':String(key===category),'data-category':key});button.onclick=()=>{category=key;for(const b of $('categories').children)b.setAttribute('aria-pressed',String(b===button));};$('categories').append(button);}
 for(const [key,p] of Object.entries(presets))$('preset').append(node('option',p.label,{value:key}));
 const presetInfo=()=>$('preset-info').textContent='Уровни 0–4: '+presets[$('preset').value].weights.map(x=>x+'%').join(' / ');$('preset').onchange=presetInfo;presetInfo();
 $('generate').onclick=()=>generate();$('generate-next').onclick=()=>generate();$('generator-tab').onclick=()=>view('generator');$('library-tab').onclick=safe(()=>view('library'));$('history-tab').onclick=()=>view('history');$('help-button').onclick=()=>$('help').showModal();
 awareness.forEach((x,i)=>{$('awareness-help').append(node('h3',`${i} · ${x[0]}`),node('p',x[1]));});
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 $('hide-gm').onchange=()=>{if(current)render();status($('hide-gm').checked?'Информация мастера скрыта, в том числе при копировании.':'Информация мастера видна.');};
 $('save').onclick=safe(()=>{const saved=library.save(current);current=saved;savedId=saved.id;dirty=false;render();$('count').textContent=library.read().length;status('Персонаж сохранён в этом браузере.');});
 $('update').onclick=safe(async()=>{if(await confirmAction('Обновить сохранённого персонажа?','Сохранённая версия будет заменена текущей карточкой.')){current=library.save({...current,id:savedId},{replace:true});dirty=false;render();status('Сохранённая версия обновлена.');}});
 $('copy').onclick=safe(async()=>{if(await copyText(description(current,$('hide-gm').checked)))status('Описание скопировано.');});
 $('edit').onclick=editor;
 $('edit-form').onsubmit=event=>{event.preventDefault();try{
  const values=new FormData(event.target),draft=structuredClone(current);draft.age=Number(values.get('age'));
  if(draft.age<categories[draft.category].min||draft.age>categories[draft.category].max)throw new Error('Возраст не соответствует категории.');
  let next=generator.generate({category:draft.category,preset:$('preset').value,previous:draft,field:'age',locks:['age']});
  for(const [key,raw] of values){if(key==='age')continue;const value=key==='awareness'?Number(raw):String(raw).trim();if(value!==current[key]){next[key]=value;next.constraints[key]={min:categories[next.category].min,max:categories[next.category].max,...(['name','profession','mood'].includes(key)?{gender:next.gender}:{})};}}
  current=validateNpc(next,data.locations);recordHistory();dirty=true;category=current.category;render();$('editor').close();status(history.warning||'Изменения применены. Сохраните карточку в библиотеку.');
 }catch(error){$('edit-error').textContent=error.message;}};
 const exportHistory=safe(()=>{download(createDocx(history.read(),{hideGm:$('hide-gm').checked}),'glufonde-npc-history.docx');status(`Экспортировано в DOCX: ${history.items.length}.`);});
 $('export-history-docx').onclick=exportHistory;$('export-history-docx-list').onclick=exportHistory;
 $('clear-history').onclick=safe(async()=>{if(await confirmAction('Очистить историю генерации?','Все записи истории будут удалены. Сохранённая библиотека останется на месте. Сначала экспортируйте нужных NPC в DOCX.')){history.clear();historyId=null;renderHistory();status('История генерации очищена.');}});
 $('search').oninput=safe(renderLibrary);
 $('export-library-docx').onclick=safe(()=>{download(createDocx(library.read(),{hideGm:$('hide-gm').checked}),'glufonde-npc-library.docx');status('Библиотека экспортирована в DOCX.');});
 $('export').onclick=safe(()=>{download(library.export(),'glufonde-library.json');status('Библиотека экспортирована.');});
 $('export-current').onclick=()=>download(library.export([current]),'glufonde-npc.json');
 $('import').onchange=safe(async event=>{const file=event.target.files[0];try{if(!file)return;if(file.size>5_000_000)throw new Error('Файл слишком большой (максимум 5 МБ)');const count=library.import(await file.text());renderLibrary();status(`Импортировано персонажей: ${count}.`);}finally{event.target.value='';}});
 window.addEventListener('storage',safe(()=>{renderLibrary();status('Библиотека обновлена в другой вкладке.');}));
}
async function offline(){
 if(!('serviceWorker' in navigator)){ $('offline-status').textContent='Офлайн-кэш не поддерживается';return;}
 try{await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;$('offline-status').textContent='Готов к работе без сети';}catch{$('offline-status').textContent='Офлайн-кэш недоступен';}
}
async function init(){
 try{
  const loaded=await Promise.all(dataFiles.map(async name=>{const r=await fetch(new URL(`../data/${name}.json`,import.meta.url));if(!r.ok)throw new Error(`Не загружен справочник: ${name}`);return [name,await r.json()];}));
  data=validateData(Object.fromEntries(loaded));generator=new Generator(data);
  // Даже при запрете localStorage генерация и экспорт текущей карточки доступны.
  let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new Error();},setItem(){throw new Error();}};}
  library=new Library(storage,data.locations);history=new GenerationHistory(storage,data.locations);bind();historyControls();$('generate').disabled=false;
  let warning='';try{$('count').textContent=library.read().length;}catch(e){warning=e.message;}
  generate();if(warning)status(warning);offline();
 }catch(error){status('Не удалось запустить приложение: '+error.message+'. Проверьте подключение и обновите страницу.');}
}
init();
