import {awareness,fields} from './config.js';
export const $=id=>document.getElementById(id);
export function node(tag,text,attrs={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
export function ageText(age){const a=age%100,b=age%10;return `${age} ${a>=11&&a<=14?'лет':b===1?'год':b>=2&&b<=4?'года':'лет'}`;}
export function description(n,hideGm){return [`${n.name}, ${ageText(n.age)}`,`Место рождения: ${n.birthplace}`,...Object.entries(fields).filter(([k])=>!['name','age','birthplace','awareness'].includes(k)).map(([k,label])=>`${label}: ${n[k]}`),...(!hideGm?[`Информация мастера: ${n.awareness} — ${awareness[n.awareness][0]}. ${awareness[n.awareness][1]}`]:[])].join('\n');}
export function renderCard(n,locks,hideGm,onRegenerate,onLock){
 const card=$('npc-card');card.replaceChildren();
 card.append(node('h2',n.name,{class:'npc-name'}));
 const meta=node('div',undefined,{class:'npc-meta'});meta.append(node('span',ageText(n.age)),node('span',`Место рождения: ${n.birthplace}`));card.append(meta);
 const sections=[['Основа',['name','age','birthplace']],['Внешность',['appearance','distinctive']],['Манера речи',['voice','verbal']],['Поведение',['habit','profession','mood']]];
 if(!hideGm)sections.push(['Информация мастера',['awareness']]);
 for(const [title,keys] of sections){const section=node('section',undefined,{class:title==='Информация мастера'?'gm-section':''});section.append(node('h3',title,{class:'section-title'}));
 for(const key of keys){const row=node('div',undefined,{class:'field'+(locks.has(key)?' locked':'')});const content=node('div');content.append(node('span',fields[key],{class:'field-label'}),node('p',key==='awareness'?`${n.awareness} — ${awareness[n.awareness][0]}`:key==='age'?ageText(n.age):n[key],{class:'field-value'}));
 const tools=node('div',undefined,{class:'field-tools'}),regen=node('button','Ещё',{'aria-label':`Заново: ${fields[key]}`,type:'button'}),lock=node('button',locks.has(key)?'Закреплено':'Закрепить',{'aria-label':`Закрепить: ${fields[key]}`,'aria-pressed':String(locks.has(key)),type:'button'});
 regen.disabled=locks.has(key);regen.onclick=()=>onRegenerate(key);lock.onclick=()=>onLock(key);tools.append(regen,lock);row.append(content,tools);section.append(row);
 if(key==='awareness')section.append(node('p',awareness[n.awareness][1],{class:'gm-description'}));
 }card.append(section);}
 $('card-actions').hidden=false;
}
export async function copyText(text){
 try{await navigator.clipboard.writeText(text);}catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').select();return false;}return true;
}
export function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),link=node('a',undefined,{href:url,download:name});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function confirmAction(title,text){$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm').showModal();return new Promise(resolve=>{
 let settled=false;const done=value=>{if(settled)return;settled=true;$('confirm').close();resolve(value);};$('confirm-yes').onclick=()=>done(true);$('confirm-no').onclick=()=>done(false);$('confirm').oncancel=()=>done(false);
 });}
