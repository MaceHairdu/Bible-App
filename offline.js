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

  window.addEventListener('online',downloadBible);
  registerWorker().finally(()=>setTimeout(downloadBible,600));
})();