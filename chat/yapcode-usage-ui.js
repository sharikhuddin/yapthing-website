'use strict';
(()=>{
 function init(){
  const dialog=document.getElementById('yap-work-hub');
  const balance=dialog?.querySelector('#work-balance');
  if(!dialog||!balance)return;
  const section=document.createElement('section');section.className='work-card';
  const title=document.createElement('h3');title.textContent='Work usage and spending limits';
  const status=document.createElement('p');status.setAttribute('role','status');
  const bar=document.createElement('progress');bar.max=100;bar.value=0;bar.style.width='100%';
  const details=document.createElement('p');details.className='work-note';
  details.textContent='Work actions are quoted before approval. Cloud coding limits are not enabled until enforced by the backend. Google Cloud billing is monitored separately.';
  section.append(title,status,bar,details);
  balance.parentElement.append(section);
  function update(){
   const b=window.YapWorkClient?.balance?.();
   if(!b||!Number.isFinite(Number(b.limit))||Number(b.limit)<=0){status.textContent='Sign in to see your current Work credit balance.';bar.removeAttribute('value');return;}
   const limit=Number(b.limit),remaining=Math.max(0,Math.min(limit,Number(b.remaining)||0));
   const used=limit-remaining,ratio=used/limit;
   bar.value=Math.round(ratio*100);
   const label=window.YapCodeUsagePolicy?.warning?.(remaining,limit)||'unknown';
   status.textContent=used+' of '+limit+' credits used. '+remaining+' remaining.'+(label==='critical'?' Nearly at your limit.':label==='exhausted'?' Allowance exhausted.':label==='high'?' Usage is high.':'');
  }
  new MutationObserver(update).observe(balance,{childList:true,characterData:true,subtree:true});
  window.addEventListener('yap:usage-updated',update);
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();