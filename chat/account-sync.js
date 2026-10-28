'use strict';
(()=>{
const base='https://uemjkfvcadggyvhbqqyp.supabase.co';
const key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
const $=id=>document.getElementById(id);
const sessionKey='yapthing.web.session.v1';
let session=null;
try{session=JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{}
const note=s=>{$('account-state').textContent=s};
const headers=(token)=>({'apikey':key,'Authorization':'Bearer '+token,'Content-Type':'application/json'});
async function request(path,method='GET',body,token=session?.access_token){
 const res=await fetch(base+'/'+path,{method,headers:headers(token||key),body:body?JSON.stringify(body):undefined});
 const json=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(json.msg||json.message||json.error_description||json.error||'Request failed');
 return json;
}
function setSession(s){session=s;try{if(s)localStorage.setItem(sessionKey,JSON.stringify(s));else localStorage.removeItem(sessionKey)}catch{};render();}
function render(){const on=!!session?.access_token;$('account-email').hidden=on;$('account-password').hidden=on;$('account-form').querySelector('[type=submit]').hidden=on;$('account-signup').hidden=on;$('account-signout').hidden=!on;note(on?'Signed in. Cloud sync available.':'Sign in to sync your cloud quota and conversations.');}
async function refresh(){if(!session?.refresh_token)return;const next=await request('auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},key);setSession(next)}
async function ready(){if(!session?.access_token)throw Error('Sign in first');try{await refresh()}catch{setSession(null);throw Error('Session expired. Sign in again')}}
$('account-toggle').onclick=()=>{$('account-panel').hidden=!$('account-panel').hidden;if(!$('account-panel').hidden)status()};
$('account-form').onsubmit=async e=>{e.preventDefault();note('Signing in…');try{const s=await request('auth/v1/token?grant_type=password','POST',{email:$('account-email').value.trim(),password:$('account-password').value},key);$('account-password').value='';setSession(s);await status()}catch(err){note(err.message)}};
$('account-signup').onclick=async()=>{note('Creating account…');try{await request('auth/v1/signup','POST',{email:$('account-email').value.trim(),password:$('account-password').value},key);note('Check your email for verification, then sign in.')}catch(err){note(err.message)}};
$('account-signout').onclick=()=>{setSession(null);$('cloud-quota').textContent=''};
async function status(){if(!session)return;try{await ready();const q=await request('functions/v1/yap-quota-status');$('cloud-quota').textContent='Cloud AI: '+q.features.cloud_chat.remaining+'/'+q.features.cloud_chat.limit+' requests left today (UTC). Local AI remains on-device.'}catch(err){$('cloud-quota').textContent=err.message}}
render();if(session)status();
window.YapWebAccount={getToken:async()=>{await ready();return session.access_token},getUserId:()=>session?.user?.id||null,status};
})();