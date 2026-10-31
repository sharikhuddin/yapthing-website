'use strict';
(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/rest/v1/rpc/yap_storage_status';
 const box=document.getElementById('storage-usage');
 if(!box)return;
 const login=()=>window.YapSession?.get?.()?.user?.id;
 const unit=1024*1024;
 const human=n=>n>=1024*unit?(n/(1024*unit)).toFixed(2)+' GB':(n/unit).toFixed(1)+' MB';
 async function refresh(){
  const actor=login();
  if(!actor){box.textContent='Sign in to see private storage usage.';return;}
  try{
   const r=await window.YapSession.authFetch(base,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
   if(!r.ok)throw Error('Storage usage unavailable');
   const data=await r.json();
   if(login()!==actor)return;
   const included={free:20,plus:200,pro:1000}[data.plan]||20;
   const limit=included*unit+Number(data.addonBytes||0);
   const used=Number(data.usedBytes||0);
   box.replaceChildren();
   const text=document.createElement('p');
   text.textContent=human(used)+' used of '+human(limit)+' private cloud space · '+Number(data.imageCount||0)+' images';
   const progress=document.createElement('progress');
   progress.value=Math.min(100,limit?used/limit*100:0);progress.max=100;
   progress.style.cssText='width:100%;height:10px;accent-color:#24553c';
   progress.setAttribute('aria-label','Private storage used');
   const note=document.createElement('small');
   note.textContent=Number(data.addonBytes||0)>0?'Paid storage add-on active.':'Cloud images are private to your account. Mobile stores require in-app billing.';
   box.append(text,progress,note);
  }catch(e){if(login()===actor)box.textContent='Private storage usage temporarily unavailable.'}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('yap:session-change',refresh);
 refresh();
})();
