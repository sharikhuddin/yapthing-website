'use strict';
(()=>{
const base='https://uemjkfvcadggyvhbqqyp.supabase.co';
const key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
const $=id=>document.getElementById(id);
const sessionKey='yapthing.web.session.v1';
let session=null;
session=window.YapSession.get();window.addEventListener('yap:session-change',()=>{session=window.YapSession.get();render();});
const note=s=>{$('account-state').textContent=s};let quotaCache=null;const publishQuota=q=>{const f=q?.features?.cloud_chat;if(!f)return;quotaCache=f;window.dispatchEvent(new CustomEvent('yap:quota',{detail:{remaining:Math.max(0,Number(f.remaining)||0),limit:Number(f.limit)||20}}))};
const headers=(token)=>({'apikey':key,'Authorization':'Bearer '+token,'Content-Type':'application/json'});
async function request(path,method='GET',body,token=session?.access_token){
 const requestHeaders=headers(token||key);if(path.includes('on_conflict='))requestHeaders['Prefer']='resolution=merge-duplicates,return=minimal';const options={method,headers:requestHeaders,body:body?JSON.stringify(body):undefined};const res=path.startsWith('auth/')?await fetch(base+'/'+path,options):await window.YapSession.authFetch(base+'/'+path,options);
 const json=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(json.msg||json.message||json.error_description||json.error||'Request failed');
 return json;
}
function setSession(s){window.YapSession.set(s);session=window.YapSession.get();render();}
function render(){const on=!!session?.access_token;$('account-email').hidden=on;$('account-password').hidden=on;$('account-form').querySelector('[type=submit]').hidden=on;$('account-signup').hidden=on;$('account-signout').hidden=!on;note(on?'Signed in. Your work stays with your account.':'Sign in to save and sync your work.');}
async function ready(){await window.YapSession.token();session=window.YapSession.get();}
$('account-toggle').onclick=()=>{$('account-panel').hidden=!$('account-panel').hidden;if(!$('account-panel').hidden)status()};
$('account-form').onsubmit=async e=>{e.preventDefault();note('Signing in…');try{const s=await request('auth/v1/token?grant_type=password','POST',{email:$('account-email').value.trim(),password:$('account-password').value},key);$('account-password').value='';setSession(s);await status()}catch(err){note(err.message)}};
$('account-signup').onclick=async()=>{note('Creating account…');try{await request('auth/v1/signup','POST',{email:$('account-email').value.trim(),password:$('account-password').value},key);note('Check your email for verification, then sign in.')}catch(err){note(err.message)}};
$('account-signout').onclick=()=>{setSession(null);$('cloud-quota').textContent=''};
async function memoryName(){await ready();const rows=await request('rest/v1/yap_user_memory?select=memory_value&memory_key=eq.preferred_name&limit=1');return Array.isArray(rows)?rows[0]?.memory_value||'':''}async function saveName(value){await ready();const name=String(value||'').trim().slice(0,80);if(!name)return;await request('rest/v1/yap_user_memory?on_conflict=user_id,memory_key','POST',{user_id:session.user.id,memory_key:'preferred_name',memory_value:name})}async function deleteName(){await ready();await request('rest/v1/yap_user_memory?memory_key=eq.preferred_name','DELETE')}async function status(){if(!session)return;try{await ready();const q=await request('functions/v1/yap-quota-status');publishQuota(q);$('cloud-quota').textContent='Cloud AI: '+q.features.cloud_chat.remaining+'/'+q.features.cloud_chat.limit+' requests left today (UTC). Local AI remains on-device.'}catch(err){$('cloud-quota').textContent=err.message}}

// Opt-in cloud backup. Never upload guest chats or authentication tokens.
const chatKey='yapthing.web.preview.v1';
$('cloud-save').onclick=async()=>{
 try{
  await ready();
  const uid=session.user.id;
  const chats=JSON.parse(localStorage.getItem(chatKey)||'[]');
  let saved=0;
  for(const chat of chats.slice(0,30)){
   if(!Array.isArray(chat.messages))continue;
   const id=String(chat.id||'');
   // Stable UUID per browser thread, stored only in this account's local mapping.
   const mappingKey='yapthing.web.cloud.thread.'+uid+'.'+id;
   let threadId=localStorage.getItem(mappingKey);
   if(!threadId){threadId=crypto.randomUUID();localStorage.setItem(mappingKey,threadId)}
   const messages=chat.messages.slice(-60).map(m=>({role:String(m.role||'').slice(0,15),text:String(m.text||'').slice(0,2000)}));
   const title=String(messages.find(m=>m.role==='user')?.text||'New chat').slice(0,100);
   await request('rest/v1/yap_shared_chat_threads?on_conflict=user_id,thread_id','POST',{user_id:uid,thread_id:threadId,title,messages,updated_at:new Date().toISOString()});
   saved++;
  }
  note('Backed up '+saved+' chats. Restore is available on signed-in devices.');
 }catch(err){note('Backup failed: '+err.message)}
};
$('cloud-load').onclick=async()=>{
 try{
  await ready();
  const uid=session.user.id;
  const rows=await request('rest/v1/yap_shared_chat_threads?select=thread_id,title,messages&user_id=eq.'+encodeURIComponent(uid)+'&order=updated_at.desc&limit=30');
  const existing=JSON.parse(localStorage.getItem(chatKey)||'[]');
  const chats=Array.isArray(existing)?existing:[];
  let added=0;
  for(const row of rows){
   const localId='cloud-'+row.thread_id;
   if(chats.some(c=>c.id===localId))continue;
   if(!Array.isArray(row.messages))continue;
   chats.push({id:localId,messages:row.messages});added++;
  }
  localStorage.setItem(chatKey,JSON.stringify(chats.slice(-50)));
  note('Restored '+added+' new conversations. Reload the page to see them.');
 }catch(err){note('Restore failed: '+err.message)}
};
render();if(session)status();
window.YapWebAccount={getToken:async()=>{await ready();return session.access_token},getUserId:()=>session?.user?.id||null,authFetch:window.YapSession.authFetch,status,getQuota:()=>quotaCache,memoryName,saveName,deleteName};
})();