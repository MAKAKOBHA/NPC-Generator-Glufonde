import {fields,awareness} from './config.js';
export const docxMime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const encoder=new TextEncoder();
export function xmlText(value){
 return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
// Минимальный ZIP STORE по спецификации PKWARE: настоящий DOCX без CDN и библиотек.
function zip(entries){
 const chunks=[],directory=[];let offset=0;
 for(const [path,text] of Object.entries(entries)){
  const name=encoder.encode(path),data=encoder.encode(text),crc=crc32(data);
  const header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
  view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,0x21,true);
  view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);
  c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
  chunks.push(header,data);directory.push(central);offset+=header.length+data.length;
 }
 const dirSize=directory.reduce((sum,x)=>sum+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,directory.length,true);e.setUint16(10,directory.length,true);e.setUint32(12,dirSize,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...directory,end],{type:docxMime});
}
const run=(text,bold=false)=>`<w:r>${bold?'<w:rPr><w:b/></w:rPr>':''}${String(text).split(/\r?\n/).map((line,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${xmlText(line)}</w:t>`).join('')}</w:r>`;
const paragraph=(content,style='',pageBreak=false)=>`<w:p><w:pPr>${style?`<w:pStyle w:val="${style}"/>`:''}${pageBreak?'<w:pageBreakBefore/>':''}</w:pPr>${content}</w:p>`;
export function createDocx(npcs,{hideGm=false}={}){
 if(!Array.isArray(npcs)||!npcs.length)throw new Error('Сначала сгенерируйте хотя бы одного NPC.');
 let body=paragraph(run('Генератор NPC | Glufonde Fracture'),'Title')+paragraph(run(`Персонажей: ${npcs.length}. ${hideGm?'Без информации мастера.':'С информацией мастера.'}`));
 for(const [i,n] of npcs.entries()){
  body+=paragraph(run(`${i+1}. ${n.name}`),'Heading1',i>0);
  for(const key of Object.keys(fields)){
   if(key==='name'||key==='awareness')continue;
   body+=paragraph(run(fields[key]+': ',true)+run(n[key]));
  }
  if(!hideGm){body+=paragraph(run('Информация мастера'),'Heading2');body+=paragraph(run(`Осведомлённость: ${n.awareness} — ${awareness[n.awareness][0]}`,true));body+=paragraph(run(awareness[n.awareness][1]));}
 }
 const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 return zip({
  '[Content_Types].xml':declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':declaration+`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  'word/_rels/document.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/styles.xml':declaration+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="22"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Обычный"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Название"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Заголовок 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Заголовок 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>'
 });
}
