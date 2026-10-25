const CACHE='glufonde-npc-__VERSION__';
const ASSETS=__ASSETS__;
const ROOT=new URL('./',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Без skipWaiting: старая вкладка получает только совместимые файлы своей версии.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('glufonde-npc-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(ROOT))return;
 const url=new URL(event.request.url);url.search='';
 if(!ASSETS.some(path=>new URL(path,ROOT).href===url.href)&&event.request.mode!=='navigate')return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request.mode==='navigate'?ROOT:url.href);return cached||fetch(event.request);})());
});
