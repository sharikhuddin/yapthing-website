'use strict';
(()=>{
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co',KEY='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 const $=id=>document.getElementById(id);
 let session=window.YapSession.get(),quotaCache=null;
 const note=s=>{$('account-state').textContent=s;};
 const current=()=>window.YapSession.get();
 const uid=()=>current()?.user?.id||null;
 async function request(path,method='GET',body,authorization){
  const isAuth=path.startsWith('auth/');
  const headers={'apikey':KEY,'content-type':'application/json'};
  const options={method,headers,body:body?JSON.stringify(body):undefined};
  let response;
  if(isAuth){
   response=await fetch(BASE+'/'+path,{...options,headers});
  }else{
   response=await window.YapSession.authFetch(BASE+'/'+path,options);
  }
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.msg||json.message||json.error_description||json.error||'Request failed');
  return json;
 }
 function setSession(s){window.YapSession.set(s);session=current();render();}
 function render(){
  session=current();
  const signed=!!session?.access_token;
  const trigger=$('account-toggle');
  const identity=trigger.querySelector('.yap-account-name');
  const meta=trigger.querySelector('.yap-account-meta');
  if(identity){
   identity.textContent=signed?String(session?.user?.email||'My account').slice(0,100):'Sign in';
   if(meta)meta.textContent=signed?'Manage your account':'Use YapThing across devices';
  }else trigger.textContent=signed?'My account':'Sign in';
  $('account-email').hidden=signed;
  $('account-password').hidden=signed;
  $('account-form').querySelector('[type=submit]').hidden=signed;
  $('account-signup').hidden=signed;
  $('account-forgot-password').hidden=signed;
  $('account-signout').hidden=!signed;
  $('cloud-save').disabled=!signed;
  $('account-panel').querySelector('.account-sync-controls').hidden=!signed;
  const legacy=(()=>{try{
   const chats=JSON.parse(localStorage.getItem('yapthing.web.preview.v1')||'[]');
   return Array.isArray(chats)&&chats.some(c=>Array.isArray(c.messages)&&c.messages.some(m=>m.role==='user'));
  }catch{return false}})();
  $('cloud-load').hidden=!signed||!legacy;
  if(!signed){
   $('cloud-quota').textContent='';
   $('chat-sync-status').textContent='Signed out — previous conversations are hidden.';
  }
  note(signed?'Signed in as '+String(session?.user?.email||'your account').slice(0,100):
    'Sign in to restore your chats and projects.');
 }
 $('account-toggle').onclick=()=>{
  $('account-panel').hidden=!$('account-panel').hidden;
  $('account-toggle').setAttribute('aria-expanded',String(!$('account-panel').hidden));
  if(!$('account-panel').hidden&&uid())status();
 };
 document.addEventListener('click',event=>{
  if(!$('account-panel').hidden&&!$('account-panel').contains(event.target)&&
     !$('account-toggle').contains(event.target)){
   $('account-panel').hidden=true;
   $('account-toggle').setAttribute('aria-expanded','false');
  }
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){$('account-panel').hidden=true;$('account-toggle').setAttribute('aria-expanded','false');}
 });
 $('account-form').onsubmit=async e=>{
  e.preventDefault();note('Signing in…');
  try{
   const session=await request('auth/v1/token?grant_type=password','POST',{
    email:$('account-email').value.trim(),password:$('account-password').value
   });
   $('account-password').value='';
   setSession(session);
   await status();
  }catch(e){note(e.message)}
 };
 const forgotButton=$('account-forgot-password');
 if(forgotButton)forgotButton.onclick=async()=>{
  const email=$('account-email').value.trim().slice(0,254);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
   note('Enter your account email above, then select Forgot password.');
   $('account-email').focus();return;
  }
  forgotButton.disabled=true;
  note('Requesting a password reset link…');
  try{
   const response=await fetch(BASE+'/auth/v1/recover?redirect_to='+encodeURIComponent('https://yapthing.com/reset-password/'),{
    method:'POST',headers:{apikey:KEY,'content-type':'application/json'},
    body:JSON.stringify({email}),signal:AbortSignal.timeout(15000),cache:'no-store'
   });
   // Do not reveal whether an email is registered. Supabase also applies email rate limits.
   if(response.status===429){note('Too many requests. Please try again later.');return;}
   if(!response.ok){note('Unable to request a reset link right now. Please try again.');return;}
   note('If an account uses that email, a password reset link is on its way. Check your inbox and spam folder.');
  }catch{note('Connection unavailable. Please try again.');}
  finally{forgotButton.disabled=false;}
 };
 $('account-signup').onclick=async()=>{
  note('Creating account…');
  try{await request('auth/v1/signup','POST',{
   email:$('account-email').value.trim(),password:$('account-password').value
  });note('Check your email for verification, then sign in.');}
  catch(e){note(e.message)}
 };
 $('account-signout').onclick=()=>{
  // Synchronously switch the visible UI and account storage before any network call.
  const token=current()?.access_token;
  setSession(null);
  $('account-password').value='';
  $('cloud-quota').textContent='';
  $('account-panel').hidden=true;
  if(token){
   // Best effort server revocation; never wait to hide private content.
   fetch(BASE+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,authorization:'Bearer '+token}})
    .catch(()=>{});
  }
 };
 function publishQuota(q){
  const f=q?.features?.cloud_chat;
  if(!f)return;
  quotaCache=f;
  window.dispatchEvent(new CustomEvent('yap:quota',{detail:{
   remaining:Math.max(0,Number(f.remaining)||0),limit:Number(f.limit)||20
  }}));
 }
 async function status(){
  const actor=uid();
  if(!actor){quotaCache=null;return}
  try{
   const q=await request('functions/v1/yap-quota-status');
   if(actor!==uid())return;
   publishQuota(q);
   $('cloud-quota').textContent='Cloud AI: '+q.features.cloud_chat.remaining+'/'+q.features.cloud_chat.limit+
    ' requests left today · Yap Credits: '+Number(q.prepaid?.credits||0);
  }catch(e){
   if(actor===uid())$('cloud-quota').textContent=e.message;
  }
 }
 async function memoryName(){
  const rows=await request('rest/v1/yap_user_memory?select=memory_value&memory_key=eq.preferred_name&limit=1');
  return Array.isArray(rows)?rows[0]?.memory_value||'':'';
 }
 async function saveName(value){
  const name=String(value||'').trim().slice(0,80);
  if(!name||!uid())return;
  const res=await window.YapSession.authFetch(BASE+'/rest/v1/yap_user_memory?on_conflict=user_id,memory_key',{
   method:'POST',headers:{prefer:'resolution=merge-duplicates','content-type':'application/json'},
   body:JSON.stringify({user_id:uid(),memory_key:'preferred_name',memory_value:name})
  });
  if(!res.ok)throw Error('Could not sync preferred name');
 }
 async function deleteName(){await request('rest/v1/yap_user_memory?memory_key=eq.preferred_name','DELETE')}
 $('cloud-save').onclick=()=>window.YapChatCloud?.syncNow({manual:true});
 $('cloud-load').onclick=()=>{
  if(!uid())return note('Sign in before importing older browser history.');
  if(!confirm('Import browser-only conversations into this signed-in YapThing account? Only continue if the chats belong to you. On a shared computer, do not import another person’s history.'))return;
  const count=window.YapWebChat?.importLegacy?.()||0;
  if(count){
   try{
    localStorage.removeItem('yapthing.web.preview.v1');
    localStorage.removeItem('yapthing.web.preview.v1.active');
   }catch{}
   note('Imported '+count+' chats into your account. Syncing them securely.');
   window.YapChatCloud?.syncNow({manual:true});
  }else note('No older browser chats to import.');
  render();
 };
 window.addEventListener('yap:session-change',()=>{
  const before=session?.user?.id||null,after=uid();
  session=current();render();
  if(before!==after){quotaCache=null;if(after)status()}
 });
 render();
 if(uid())status();
 window.YapWebAccount={
  getToken:()=>window.YapSession.token(),
  getUserId:uid,
  authFetch:window.YapSession.authFetch,
  status,getQuota:()=>quotaCache,memoryName,saveName,deleteName
 };
})();
