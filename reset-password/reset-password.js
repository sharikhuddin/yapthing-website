'use strict';
/* Recovery tokens are accepted only from Supabase email links, kept in memory and
 * removed from the browser address before the UI is displayed. */
(()=>{
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co';
 const KEY='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 const $=id=>document.getElementById(id);
 let recoveryToken=null,verified=false,consumed=false;
 const message=(text,state='')=>{$('reset-status').textContent=text;$('reset-status').dataset.state=state;};
 const fail=(text)=>{verified=false;recoveryToken=null;$('reset-form').hidden=true;message(text,'error');};
 const hash=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):'');
 const query=new URLSearchParams(location.search);
 const token=hash.get('access_token'),tokenHash=query.get('token_hash');
 const type=hash.get('type')||query.get('type');
 const linkError=hash.get('error')||query.get('error');
 // Strip token, token_hash, and provider error details immediately, before any fetch.
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 const secureHeaders={'apikey':KEY,'content-type':'application/json'};
 const request=async(path,options={})=>{
  const response=await fetch(BASE+path,{cache:'no-store',signal:AbortSignal.timeout(15000),...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('The recovery link is invalid, expired, or has already been used. Request a new link from YapThing Chat.');
  return data;
 };
 const initialize=async()=>{
  if(linkError)return fail('The recovery link expired or could not be verified. Request a new link from YapThing Chat.');
  if(type!=='recovery'||(!token&&!tokenHash))return fail('Open the password reset link from your email. If it has expired, request another link from YapThing Chat.');
  try{
   if(tokenHash){
    const session=await request('/auth/v1/verify',{method:'POST',headers:secureHeaders,body:JSON.stringify({token_hash:tokenHash,type:'recovery'})});
    recoveryToken=session.access_token;
   }else recoveryToken=token;
   if(!recoveryToken||!/^[A-Za-z0-9_\-.]+$/.test(recoveryToken))throw Error('invalid');
   const user=await request('/auth/v1/user',{headers:{apikey:KEY,authorization:'Bearer '+recoveryToken}});
   if(typeof user.id!=='string'||!user.id)throw Error('invalid');
   verified=true;$('reset-form').hidden=false;
   message('Your reset link is verified. Choose a new password with at least 12 characters.');
   $('new-password').focus();
  }catch{fail('The recovery link is invalid or expired. Request a new link from YapThing Chat.');}
 };
 $('reset-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!verified||consumed||!recoveryToken)return fail('Your recovery link is no longer valid. Request a new link.');
  const password=$('new-password').value,confirmation=$('confirm-password').value;
  if(password.length<12||password.length>128){message('Use a password between 12 and 128 characters.','error');return;}
  if(password!==confirmation){message('The passwords do not match.','error');return;}
  const button=$('reset-submit');button.disabled=true;
  message('Updating your password securely…');
  try{
   await request('/auth/v1/user',{method:'PUT',headers:{...secureHeaders,authorization:'Bearer '+recoveryToken},body:JSON.stringify({password})});
   consumed=true;verified=false;
   // Do not place the recovery session in YapThing's normal session storage.
   const usedToken=recoveryToken;recoveryToken=null;
   $('new-password').value='';$('confirm-password').value='';
   $('reset-form').hidden=true;
   message('Password updated. Return to YapThing and sign in with your new password.','success');
   // Best-effort signout of the short-lived recovery session.
   fetch(BASE+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,authorization:'Bearer '+usedToken},keepalive:true}).catch(()=>{});
  }catch{message('Unable to update the password. Your link may have expired or your new password may not meet account security requirements.','error');}
  finally{button.disabled=false;}
 });
 initialize();
})();
