'use strict';
/* One guest preview, then a visible opt-in account invitation. API quotas remain server-enforced. */
(()=>{
 const messages=document.getElementById('messages'),form=document.getElementById('form'),prompt=document.getElementById('prompt');
 if(!messages||!form||!prompt)return;
 const GUEST_LIMIT=1,FREE_CHAT=5,FREE_SEARCH=2;
 const actor=()=>window.YapWebAccount?.getUserId?.()||window.YapSession?.get?.()?.user?.id||null;
 const day=()=>new Date().toISOString().slice(0,10);
 const previewKey='yapthing.guest.preview.v1';
 function savedPreview(){
  try{const x=JSON.parse(localStorage.getItem(previewKey)||'null');return x?.day===day()?Math.min(1,Math.max(0,Number(x.used)||0)):0;}catch{return 0}
 }
 let visitorUsed=savedPreview(),pendingPrompt='';
 const currentUserMessages=()=>messages.querySelectorAll('.message.user').length;
 function openAccount(){
  const panel=document.getElementById('account-panel'),trigger=document.getElementById('account-toggle');
  if(panel){const menu=panel.closest('#yap-desktop-menu');if(menu)menu.open=true;panel.hidden=false;trigger?.setAttribute('aria-expanded','true');}
  document.getElementById('account-email')?.focus();
 }
 const button=(title,primary,action)=>{
  const el=document.createElement('button');el.type='button';el.textContent=title;el.className='yap-join-action'+(primary?' yap-join-primary':'');el.addEventListener('click',event=>{event.stopPropagation();action();});return el;
 };
 const card=document.createElement('section');
 card.id='yap-guest-join';card.className='yap-join-card';card.setAttribute('role','region');card.setAttribute('aria-label','Create a free YapThing account');
 const top=document.createElement('div');top.className='yap-join-top';
 const icon=document.createElement('img');icon.src='yapthing-icon.svg';icon.alt='';icon.width=32;icon.height=32;
 const title=document.createElement('div');
 const eyebrow=document.createElement('span');eyebrow.className='yap-join-eyebrow';eyebrow.textContent='YOUR YAPTHING SPACE';
 const heading=document.createElement('h3');heading.textContent='Make this your YapSpace.';
 title.append(eyebrow,heading);top.append(icon,title);
 const intro=document.createElement('p');intro.textContent='Your free account unlocks cloud answers, saved chats across your devices, and access to research tools.';
 const limits=document.createElement('p');limits.className='yap-join-limits';limits.textContent='Free: '+FREE_CHAT+' cloud replies + '+FREE_SEARCH+' web searches per day. No payment card needed.';
 const controls=document.createElement('div');controls.className='yap-join-actions';
 const create=button('Claim my free YapSpace',true,openAccount),signin=button('I have an account',false,openAccount);
 controls.append(create,signin);
 const foot=document.createElement('small');foot.textContent='Explore with Yapper first. Upgrade later for larger allowances; prices and limits are shown before purchase.';
 card.append(top,intro,limits,controls,foot);
 const upgrade=document.createElement('section');upgrade.id='yap-free-upgrade-nudge';upgrade.className='yap-join-card yap-upgrade-card';
 upgrade.setAttribute('aria-label','Free plan usage');
 const upTitle=document.createElement('h3');upTitle.textContent='Keep Yapper going when you need it.';
 const upInfo=document.createElement('p');
 const upButton=button('See Plus & Pro',true,()=>window.location.assign('../plans/'));
 const upDismiss=button('Not now',false,()=>{upgrade.remove();dismissUpgrade=true;});
 let dismissUpgrade=false,quota=null;
 upgrade.append(upTitle,upInfo);
 const upActions=document.createElement('div');upActions.className='yap-join-actions';upActions.append(upButton,upDismiss);upgrade.append(upActions);
 function renderUpgrade(){
  if(!actor()||dismissUpgrade){upgrade.remove();return;}
  const q=quota||window.YapWebAccount?.getQuota?.(),remaining=Number(q?.remaining),limit=Number(q?.limit);
  if(limit!==FREE_CHAT||!Number.isFinite(remaining)||remaining>1){upgrade.remove();return;}
  upInfo.textContent=remaining<=0?'You have used your '+FREE_CHAT+' free cloud replies today. You can return after the UTC reset or explore a paid plan.':
    'You have '+remaining+' free cloud reply left today. Upgrade only when you want more capacity.';
  if(!messages.contains(upgrade))messages.append(upgrade);
 }
 function render(){
  if(actor()){card.remove();renderUpgrade();return;}
  upgrade.remove();
  if(currentUserMessages()>0||visitorUsed>0){
   if(!messages.contains(card))messages.append(card);
   // Don't force the user to the bottom while the answer is still generating.
  }else card.remove();
 }
 const observer=new MutationObserver(()=>render());
 observer.observe(messages,{childList:true});
 function block(){
  if(!actor()&&Math.max(visitorUsed,savedPreview(),currentUserMessages())>=GUEST_LIMIT){
   pendingPrompt=prompt.value.trim().slice(0,1800);
   foot.textContent='Your unsent question will remain ready in this tab when you sign in.';
   render();
   card.classList.add('yap-join-attention');
   window.setTimeout(()=>card.classList.remove('yap-join-attention'),700);
   card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
   return true;
  }
  return false;
 }
 form.addEventListener('submit',event=>{
  if(actor())return;
  const text=prompt.value.trim();
  if(!text&&!window.YapPhotoVision?.hasPhoto?.())return;
  if(block()){
   event.preventDefault();event.stopImmediatePropagation();
   return;
  }
  visitorUsed=1;
  try{localStorage.setItem(previewKey,JSON.stringify({day:day(),used:1}));}catch{}
  // The existing guest route does not authorize paid cloud AI requests.
  queueMicrotask(render);
 },true);
 window.addEventListener('yap:session-change',()=>{
  if(actor()){card.remove();visitorUsed=0;dismissUpgrade=false;quota=null;renderUpgrade();if(pendingPrompt&&!prompt.value.trim()){prompt.value=pendingPrompt;prompt.dispatchEvent(new Event('input'));}pendingPrompt='';}
  else {visitorUsed=savedPreview();card.remove();upgrade.remove();dismissUpgrade=false;quota=null;pendingPrompt='';}
 });
 window.addEventListener('yap:quota',event=>{quota=event.detail||null;renderUpgrade();});
 // Never show a marketing banner inside an account's conversations.
 render();
 window.YapGuestConversion=Object.freeze({openAccount,previewUsed:()=>Math.max(visitorUsed,savedPreview()),guestLimit:GUEST_LIMIT,freeChatLimit:FREE_CHAT,freeSearchLimit:FREE_SEARCH});
})();
