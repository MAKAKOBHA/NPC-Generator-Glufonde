// Без смещения при переводе криптографического случайного числа в диапазон.
export function integer(max) {
 if (!Number.isSafeInteger(max)||max<1||max>0x100000000) throw new Error('Некорректный случайный диапазон');
 if(globalThis.crypto?.getRandomValues){
  const buffer=new Uint32Array(1), limit=Math.floor(0x100000000/max)*max;
  do { crypto.getRandomValues(buffer); } while(buffer[0]>=limit);
  return buffer[0]%max;
 }
 return Math.floor(Math.random()*max);
}
export function weighted(items, weight=x=>x.weight??1, random=()=>integer(0x100000000)/0x100000000){
 const weights=items.map(weight);
 if(!items.length||weights.some(x=>!Number.isFinite(x)||x<0)) throw new Error('Неверные веса справочника');
 const total=weights.reduce((a,b)=>a+b,0);
 if(total<=0) throw new Error('Нет доступных вариантов');
 let point=random()*total;
 for(let i=0;i<items.length;i++){point-=weights[i];if(point<0)return items[i];}
 return items.at(-1);
}
export const uid=()=>globalThis.crypto?.randomUUID?.()??`npc-${Date.now()}-${integer(0x100000000).toString(16)}`;
