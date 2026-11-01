'use strict';
/* YapThing guest funnel: never make chat input unusable or spend paid AI calls anonymously. */
(()=>{
 const $=id=>document.getElementById(id);
 const messages=$('messages'),form=$('form'),prompt=$('prompt');
 if(!messages||!form||!prompt)return;
 const FREE_CHAT=5,FREE_SEARCH=2;
 const actor=()=>window.YapWebAccount?.getUserId?.()||window.YapSession?.get?.()?.user?.id||null;
 const day=()=>new Date().toISOString().slice(0,10);
 const key='yapthing.guest.preview.v1';
 function savedPreview(){
  try{const state=JSON.parse(localStorage.getItem(key)||'null');return state?.day===day()&&state?.used?1:0;}catch{return 0}
 }
 let previewUsed=savedPreview(),showInvite=previewUsed>0,pendingPrompt='',quota=null,upgradeDismissed=false;
 // A simple greeting is a zero-cost product preview. Substantive anonymous AI requests
 // open the account flow instead of beginning a large model download or getting stuck.
 const quickGreeting=/^(?:hi|hello|hey|hey there|hello there|good morning|good afternoon|good evening|hiya|yo|what's up|sup)[!?.\s]*$/i;
 const button=(label,primary,callback)=>{
  const el=document.createElement('button');el.type='button';el.textContent=label;
  el.className='yap-join-action'+(primary?' yap-join-primary':'');
  el.addEventListener('click',event=>{event.stopPropagation();callback();});
  return el;
 };
 const card=document.createElement('section');card.id='yap-guest-join';card.className='yap-join-card';
 card.setAttribute('role','region');card.setAttribute('aria-label','Create a free YapThing account');
 const header=document.createElement('div');header.className='yap-join-top';
 const image=document.createElement('img');image.src='yapthing-icon.svg';image.width=32;image.height=32;image.alt='';
 const headingBox=document.createElement('div'),eyebrow=document.createElement('span'),heading=document.createElement('h3');
 eyebrow.className='yap-join-eyebrow';eyebrow.textContent='YOUR YAPTHING SPACE';
 heading.textContent='Unlock your next Yapper reply';
 headingBox.append(eyebrow,heading);header.append(image,headingBox);
 const description=document.createElement('p');
 description.textContent='Create a free account to continue your question and use cloud AI and research. No payment card needed.';
 const limits=document.createElement('p');limits.className='yap-join-limits';
 limits.textContent='Free: '+FREE_CHAT+' cloud replies + '+FREE_SEARCH+' web searches per day.';
 const choices=document.createElement('div');choices.className='yap-join-actions';
 const fields=document.createElement('form');fields.id='yap-inline-auth';fields.hidden=true;fields.noValidate=false;
 const email=document.createElement('input');email.type='email';email.placeholder='Email address';email.required=true;
 email.autocomplete='email';email.maxLength=254;email.setAttribute('aria-label','Your YapThing email address');
 const password=document.createElement('input');password.type='password';password.placeholder='Password (8+ characters)';
 password.minLength=8;password.maxLength=128;password.required=true;password.autocomplete='new-password';
 password.setAttribute('aria-label','YapThing password');
 const submit=document.createElement('button');submit.type='submit';submit.className='yap-join-action yap-join-primary';
 const back=button('Back',false,()=>{fields.hidden=true;choices.hidden=false;feedback.textContent='';});
 const feedback=document.createElement('p');feedback.id='yap-inline-auth-status';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const fieldActions=document.createElement('div');fieldActions.className='yap-join-actions';
 const reset=button('Forgot password?',false,()=>{
  const master=$('account-email'),forgot=$('account-forgot-password');
  if(master)master.value=email.value.trim();
  if(forgot){forgot.click();mirrorStatus();}
 });
 fieldActions.append(submit,back,reset);
 fields.append(email,password,fieldActions,feedback);
 const foot=document.createElement('small');foot.textContent='Your question stays in the chat box while you sign in.';
 let mode='signup';
 function showFields(next){
  mode=next;fields.hidden=false;choices.hidden=true;
  submit.textContent=mode==='signup'?'Create my free account':'Sign in to YapThing';
  password.autocomplete=mode==='signup'?'new-password':'current-password';
  password.placeholder=mode==='signup'?'Choose a password (8+ characters)':'Your password';
  feedback.textContent='';
  email.focus();
 }
 choices.append(
  button('Create free account',true,()=>showFields('signup')),
  button('I have an account',false,()=>showFields('signin'))
 );
 card.append(header,description,limits,choices,fields,foot);
 const upgrade=document.createElement('section');upgrade.id='yap-free-upgrade-nudge';upgrade.className='yap-join-card yap-upgrade-card';
 upgrade.setAttribute('aria-label','Free plan remaining replies');
 const upTitle=document.createElement('h3');upTitle.textContent='Keep Yapper going when you need it.';
 const upInfo=document.createElement('p');
 const upActions=document.createElement('div');upActions.className='yap-join-actions';
 upActions.append(button('View Plus & Pro',true,()=>location.assign('../plans/')),button('Not now',false,()=>{upgradeDismissed=true;upgrade.remove()}));
 upgrade.append(upTitle,upInfo,upActions);
 function mirrorStatus(){const state=$('account-state')?.textContent||'';feedback.textContent=state;if(!/Creating account|Signing in/i.test(state)){const existing=$('account-password');if(existing)existing.value='';}}
 if($('account-state'))new MutationObserver(mirrorStatus).observe($('account-state'),{childList:true,subtree:true,characterData:true});
 fields.addEventListener('submit',event=>{
  event.preventDefault();event.stopPropagation();
  if(!fields.reportValidity())return;
  const accountEmail=$('account-email'),accountPassword=$('account-password');
  if(!accountEmail||!accountPassword)return;
  accountEmail.value=email.value.trim();accountPassword.value=password.value;
  feedback.textContent=mode==='signup'?'Creating your account…':'Signing you in…';
  if(mode==='signup')$('account-signup')?.click();
  else $('account-form')?.requestSubmit();
  password.value='';
 });
 function renderUpgrade(){
  if(!actor()||upgradeDismissed){upgrade.remove();return}
  const q=quota||window.YapWebAccount?.getQuota?.();
  const remaining=Number(q?.remaining),limit=Number(q?.limit);
  if(limit!==FREE_CHAT||!Number.isFinite(remaining)||remaining>1){upgrade.remove();return}
  upInfo.textContent=remaining<=0?
    'Your free cloud allowance is used for today. It resets at midnight UTC. Plans offer more.':
    'You have one free cloud reply left today. Upgrade for a larger allowance.';
  if(!messages.contains(upgrade))messages.append(upgrade);
 }
 function render(){
  if(actor()){card.remove();renderUpgrade();return}
  upgrade.remove();
  if(showInvite||previewUsed||messages.querySelector('.message.user')){
   if(!card.isConnected)form.before(card);
  }else card.remove();
 }
 const observer=new MutationObserver(render);observer.observe(messages,{childList:true});
 function invite(text){
  showInvite=true;pendingPrompt=String(text||prompt.value||'').trim().slice(0,1800);
  description.textContent=pendingPrompt?
    'Ready to answer your question. Create your free YapSpace to send it with cloud AI—your text stays in the chat box.':
    'Create your free YapSpace to unlock cloud AI and research. No payment card needed.';
  render();
  if(!fields.hidden)email.focus();
  else card.scrollIntoView({behavior:'auto',block:'nearest'});
 }
 form.addEventListener('submit',event=>{
  if(actor())return;
  const text=prompt.value.trim(),attachment=!!window.YapPhotoVision?.hasPhoto?.()||!!window.YapAttachments?.getDocument?.();
  if(!text&&!attachment)return;
  if(!attachment&&quickGreeting.test(text)){
   previewUsed=1;showInvite=true;
   // Guest preview count is informational, not a disabling API gate.
   try{localStorage.setItem(key,JSON.stringify({day:day(),used:1}))}catch{}
   queueMicrotask(render);
   return;
  }
  event.preventDefault();event.stopImmediatePropagation();
  invite(text);
 },true);
 window.addEventListener('yap:session-change',()=>{
  if(actor()){
   card.remove();previewUsed=0;showInvite=false;quota=null;upgradeDismissed=false;
   renderUpgrade();
   if(pendingPrompt&&!prompt.value.trim()){prompt.value=pendingPrompt;prompt.dispatchEvent(new Event('input'))}
   pendingPrompt='';password.value='';
  }else{
   previewUsed=savedPreview();showInvite=previewUsed>0;
   upgrade.remove();quota=null;upgradeDismissed=false;pendingPrompt='';password.value='';render();
  }
 });
 window.addEventListener('yap:quota',event=>{quota=event.detail||null;renderUpgrade()});
 render();
 window.YapGuestConversion=Object.freeze({openAccount:()=>{invite(prompt.value);showFields('signup')},guestLimit:1,freeChatLimit:FREE_CHAT,freeSearchLimit:FREE_SEARCH,previewUsed:()=>previewUsed});
})();
