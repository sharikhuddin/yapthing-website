'use strict';
/* Shared YapThing plugin status client. A connection is never inferred from opening a provider site. */
window.YapPluginConnections=(()=>{
 const endpoint='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-plugin-connections';
 const key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 async function token(){
  if(window.YapWebAccount?.getToken)return await window.YapWebAccount.getToken();
  try{const s=JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null');if(s?.access_token&&(!s.expires_at||Date.now()/1000<s.expires_at-30))return s.access_token}catch{}
  throw Error('Sign in to your YapThing account to manage connections.');
 }
 async function request(action,provider){
  const t=await token(),r=await fetch(endpoint,{method:action?'POST':'GET',headers:{authorization:'Bearer '+t,apikey:key,'content-type':'application/json'},body:action?JSON.stringify({action,provider}):undefined});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Connection request failed');
  return data;
 }
 return {getToken:token,list:()=>request(),connect:p=>request('connect',p),disconnect:p=>request('disconnect',p)};
})();
