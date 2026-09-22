const APP_CACHE='bible-app-v4';
const BIBLE_CACHE='bible-text-v1';
const APP_SHELL=['./','./index.html','./modern.css','./manifest.webmanifest','./offline.js','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(APP_CACHE);
    await Promise.all(APP_SHELL.map(async path=>{
      try{await cache.add(path);}catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keep=new Set([APP_CACHE,BIBLE_CACHE]);
    const names=await caches.keys();
    await Promise.all(names.filter(n=>!keep.has(n)).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  const isBible=url.hostname==='raw.githubusercontent.com' && url.pathname.includes('/BSB-publishing/bsb-data-output/main/base/helloao/');
  const isEdits=url.origin===self.location.origin && url.pathname.endsWith('/edits.json');

  if(isBible){
    event.respondWith((async()=>{
      const cache=await caches.open(BIBLE_CACHE);
      const cached=await cache.match(req);
      if(cached) return cached;
      const fresh=await fetch(req);
      if(fresh.ok) await cache.put(req,fresh.clone());
      return fresh;
    })());
    return;
  }

  if(isEdits){
    event.respondWith((async()=>{
      const cache=await caches.open(APP_CACHE);
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh.ok){
          await cache.put('./edits.json',fresh.clone());
          return fresh;
        }
        throw new Error('edits.json network response was not OK');
      }catch(err){
        const cached=await cache.match('./edits.json');
        if(cached) return cached;
        throw err;
      }
    })());
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(APP_CACHE);
      const cached=await cache.match(req,{ignoreSearch:true});
      if(cached){
        event.waitUntil(fetch(req).then(async r=>{if(r.ok) await cache.put(req,r.clone())}).catch(()=>{}));
        return cached;
      }
      try{
        const fresh=await fetch(req);
        if(fresh.ok) await cache.put(req,fresh.clone());
        return fresh;
      }catch(err){
        if(req.mode==='navigate'){
          const fallback=await cache.match('./index.html');
          if(fallback) return fallback;
        }
        throw err;
      }
    })());
  }
});