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
 async function computer(action){
  const t=await token();const route=action==='start'?'yap-work-oauth':'yap-work';
  const r=await fetch(endpoint.replace('yap-plugin-connections',route),{method:'POST',headers:{authorization:'Bearer '+t,apikey:key,'content-type':'application/json'},body:JSON.stringify({action}),signal:AbortSignal.timeout(25000)});
  const data=await r.json().catch(()=>({}));if(await token()!==t)throw Error('Your account changed. Refresh connections.');
  if(!r.ok||data.error)throw Error(data.error||'Computer connection unavailable.');return data;
 }
 async function list(){const data=await request();try{const work=await computer('status');data.providers=(data.providers||[]).filter(p=>p.id!=='desktop-commander');data.providers.push({id:'desktop-commander',status:work.connected?'connected':'disconnected',connect_available:true});}catch{data.providers=(data.providers||[]).filter(p=>p.id!=='desktop-commander');data.providers.push({id:'desktop-commander',status:'unavailable',connect_available:false});}return data;}
 return {getToken:token,list,computer,connect:p=>p==='desktop-commander'?computer('start'):request('connect',p),pick:p=>request('pick',p),disconnect:p=>p==='desktop-commander'?computer('disconnect'):request('disconnect',p)};
})();
