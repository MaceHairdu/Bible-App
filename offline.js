(()=>{
  const CACHE='bible-text-v1';
  const VERSION='offline-bible-v1';
  const DONE_KEY='bible-offline-version';
  const statusEl=document.getElementById('status');

  function showStatus(text){
    if(!statusEl) return;
    statusEl.hidden=false;
    statusEl.textContent=text;
  }
  function hideStatus(){
    if(statusEl) statusEl.hidden=true;
  }

  async function registerWorker(){
    if(!('serviceWorker' in navigator)) return;
    try{await navigator.serviceWorker.register('./service-worker.js');}catch{}
  }

  async function downloadBible(){
    if(!('caches' in window) || !Array.isArray(window.books||books)) return;
    if(localStorage.getItem(DONE_KEY)===VERSION){hideStatus();return;}
    if(!navigator.onLine){showStatus('Offline · downloaded books remain available');return;}

    const allBooks=window.books||books;
    const urls=[];
    for(const b of allBooks){
      for(let ch=1;ch<=b.chapters;ch++) urls.push(`${DATA_ROOT}/${b.id}/${ch}.json`);
    }
    const cache=await caches.open(CACHE);
    let done=0;
    let failed=0;
    let next=0;
    showStatus('Preparing Bible for offline reading…');

    async function worker(){
      while(next<urls.length){
        const i=next++;
        const url=urls[i];
        try{
          const already=await cache.match(url);
          if(!already){
            const r=await fetch(url,{cache:'no-store'});
            if(!r.ok) throw new Error(String(r.status));
            await cache.put(url,r.clone());
          }
        }catch{failed++;}
        done++;
        if(done===1 || done%25===0 || done===urls.length){
          showStatus(`Preparing offline Bible · ${Math.round(done/urls.length*100)}%`);
        }
      }
    }

    await Promise.all(Array.from({length:6},worker));
    if(failed===0){
      localStorage.setItem(DONE_KEY,VERSION);
      showStatus('Offline Bible ready');
      setTimeout(hideStatus,1800);
    }else{
      showStatus('Offline download paused · it will continue next time you are online');
    }
  }

  // Translation convention: Hebrew יהוה (Strong's H3068) is displayed as YHWH.
  // This is keyed to the underlying Hebrew alignment, not a blind replacement of English "LORD".
  function applyYHWH(root=document){
    const lordWords=[...root.querySelectorAll?.('.word[data-strong="H3068"]')||[]]
      .filter(el=>/^LORD[.,;:!?]?$/i.test(el.dataset.raw||''));
    for(const el of lordWords){
      const punctuation=(el.dataset.raw||'').match(/[.,;:!?]+$/)?.[0]||'';
      el.dataset.raw='YHWH'+punctuation;
      el.textContent='YHWH'+punctuation;

      // BSB often supplies the English article "the" inside the same H3068-aligned phrase
      // (for example "Then the LORD"). YHWH is a proper name, so remove that supplied article.
      let prev=el.previousElementSibling;
      if(prev?.classList.contains('word') && prev.dataset.strong==='H3068' && /^the$/i.test(prev.dataset.raw||'')){
        const between=prev.nextSibling;
        prev.remove();
        if(between?.nodeType===Node.TEXT_NODE && /^\s+$/.test(between.nodeValue||'')) between.remove();
      }
    }
  }

  const reader=document.getElementById('reader');
  if(reader){
    applyYHWH(reader);
    new MutationObserver(()=>applyYHWH(reader)).observe(reader,{childList:true,subtree:true});
  }

  window.addEventListener('online',downloadBible);
  registerWorker().finally(()=>setTimeout(downloadBible,600));
})();