'use strict';
(()=>{
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/',KEY='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 const pending=new Map();let serial=0,cached=null,owner='',last=0;
 const account=()=>window.YapAssistant?.getAccountId?.()||window.YapWebAccount?.getUserId?.()||'';
 function publish(data){if(data.balance){cached=data.balance;owner=account();last=Date.now();window.dispatchEvent(new Event('yap:usage-updated'));}window.dispatchEvent(new CustomEvent('yap:work-status',{detail:data}));return data;}
 window.yapOnWork=(id,result)=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);if(p.actor!==account())return p.reject(Error('Account changed. Reopen Work.'));let data;try{data=typeof result==='string'?JSON.parse(result):result;}catch{return p.reject(Error('Work response could not be read.'));}if(data.error)return p.reject(Error(data.error));p.resolve(publish(data));};
 async function request(action,data={},route='work'){
  const actor=account();if(!actor)throw Error('Sign in to YapThing to connect a computer and sync Work credits.');
  const body={...data,action};const native=typeof window.YapIOS?.workRequest==='function'?window.YapIOS:typeof window.YapAndroid?.workRequest==='function'?window.YapAndroid:null;
  if(native)return new Promise((resolve,reject)=>{const id='work'+(++serial);const timer=setTimeout(()=>{pending.delete(id);reject(Error('Connection interrupted. Refresh Recent tasks before retrying.'));},115000);pending.set(id,{resolve,reject,timer,actor});try{native.workRequest(id,route,JSON.stringify(body));}catch{pending.delete(id);clearTimeout(timer);reject(Error('Work could not connect.'));}});
  if(!window.YapWebAccount?.getToken)throw Error('This app needs the latest native build to connect Work.');
  const token=await window.YapWebAccount.getToken();const response=await (window.YapWebAccount.authFetch||fetch)(BASE+(route==='oauth'?'yap-work-oauth':'yap-work'),{method:'POST',headers:{Authorization:'Bearer '+token,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(110000)});const result=await response.json();if(actor!==account())throw Error('Account changed. Reopen Work.');if(!response.ok||result.error)throw Error(result.error||'Work could not connect.');return publish(result);
 }
 async function refresh(force=false){if(!account()){cached=null;owner='';return null;}if(!force&&cached&&owner===account()&&Date.now()-last<30000)return cached;const data=await request('status');return data.balance;}
 async function chargeLocal(kind='local_code',requestId){const {job}=await request('quote',{request_id:requestId||crypto.randomUUID(),task:{kind}});if(job.status==='completed')return true;const result=await request('approve',{id:job.id,approval_hash:job.approval_hash});return result.job.status==='completed';}
 function onAccount(){if(owner!==account()){cached=null;owner='';last=0;window.dispatchEvent(new Event('yap:work-account'));}if(account())refresh().catch(()=>{});}
 window.addEventListener('yap:chats-updated',onAccount);window.addEventListener('yap:session-change',onAccount);window.addEventListener('focus',()=>{if(account())refresh().catch(()=>{});});
 window.YapWorkClient=Object.freeze({request,account,refresh,chargeLocal,balance:()=>owner===account()?cached:null});onAccount();
})();
