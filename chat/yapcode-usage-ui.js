'use strict';
(()=>{
 function init(){
  const dialog=document.getElementById('yap-work-hub'),balance=dialog?.querySelector('#work-balance');if(!dialog||!balance)return;
  const section=document.createElement('section');section.className='work-card';
  const title=document.createElement('h3');title.textContent='Your Work allowance';
  const status=document.createElement('p');status.setAttribute('role','status');
  const bar=document.createElement('progress');bar.max=100;bar.style.width='100%';
  const clock=document.createElement('p');clock.className='work-note';
  const resume=document.createElement('button');resume.type='button';resume.textContent='Check credits and resume';resume.hidden=true;
  const topup=document.createElement('a');topup.textContent='Plans and top-up options';topup.href='https://yapthing.com/plans/';topup.rel='noopener';topup.target='_blank';
  const details=document.createElement('p');details.className='work-note';
  details.textContent='Work tasks are quoted by the server before approval. Paid cloud coding is separate. A countdown does not spend credits, and purchase availability is shown on the Plans page.';
  section.append(title,status,bar,clock,resume,topup,details);balance.parentElement.append(section);
  function update(){
   const b=window.YapWorkClient?.balance?.(),s=window.YapWorkReset?.state?.(b);
   if(!s||s.status==='unavailable'){status.textContent='Sign in to check your server-confirmed credits.';bar.removeAttribute('value');clock.textContent='Reset time unavailable';resume.hidden=true;return;}
   bar.value=Math.round((s.limit-s.remaining)/s.limit*100);
   status.textContent=(s.limit-s.remaining)+' of '+s.limit+' credits used. '+s.remaining+' remaining.'+(s.status==='paused'?' New credit-consuming Work tasks are paused.':'');
   clock.textContent=s.reset?'Allowance reset in '+s.reset.label+(s.reset.seconds===0?' — refresh to verify renewal':''):'Renewal date not available';
   resume.hidden=s.status!=='paused';
  }
  resume.onclick=async()=>{resume.disabled=true;try{await window.YapWorkClient?.refresh?.(true);update();if(window.YapWorkReset?.state?.(window.YapWorkClient?.balance?.()).status==='available')status.textContent+=' Credits confirmed. You can request a fresh quote to restart.';}catch{status.textContent='Unable to confirm renewed credits. No task was restarted.';}finally{resume.disabled=false;}};
  new MutationObserver(update).observe(balance,{childList:true,characterData:true,subtree:true});
  window.addEventListener('yap:usage-updated',update);
  window.addEventListener('focus',update);
  // Timer only updates display. Authority remains with server; no local credit deductions.
  window.setInterval(update,60000);
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();