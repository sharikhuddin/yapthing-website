'use strict';
/* Account-owned text conversation sync. No guest history, raw attachments, or API keys
 * are uploaded. Supabase row-level security enforces user_id = auth.uid(). */
(()=>{
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co';
 const note=document.getElementById('chat-sync-status');
 const userId=()=>{
  const s=window.YapSession?.get?.();
  return s?.access_token&&/^[0-9a-f-]{36}$/i.test(s?.user?.id||'')?s.user.id:null;
 };
 const timeout=12000;
 let actor=userId(),serial=0,scheduled=0,runningGeneration=-1,lastRun=0;
 let timer=null;
 const say=value=>{if(note)note.textContent=value};
 const resource='rest/v1/yap_shared_chat_threads';
 const urlFor=id=>BASE+'/'+resource+'?select=thread_id,title,messages,updated_at&user_id=eq.'+
  encodeURIComponent(id)+'&order=updated_at.desc&limit=80';
 const validUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const normalize=m=>{
  const result=Array.isArray(m)?m.filter(x=>x&&typeof x.text==='string'&&
   ['user','assistant','model','thing'].includes(x.role))
   .slice(-65).map(x=>({role:x.role==='user'?'user':'assistant',text:x.text.slice(0,2000)})):[];
  // Supabase limits chat-thread JSON to 80KB. Keep newest text turns rather
  // than failing every subsequent sync on a long conversation.
  const bytes=part=>new TextEncoder().encode(JSON.stringify(part)).length;
  while(result.length>1&&bytes(result)>74000)result.shift();
  return result;
 };
 const hash=messages=>JSON.stringify(normalize(messages));
 async function syncNow({manual=false}={}){
  const current=userId();
  if(!current||current!==actor){if(manual)say('Sign in to sync conversations.');return}
  const generation=serial;
  if(runningGeneration===generation)return;
  if(document.visibilityState==='hidden'&&!manual)return;
  runningGeneration=generation;
  try{
   say('Syncing your conversations…');
   const response=await window.YapSession.authFetch(urlFor(current),{
    method:'GET',signal:AbortSignal.timeout(timeout)
   });
   if(!response.ok)throw Error('History download unavailable (HTTP '+response.status+').');
   const remote=await response.json();
   if(!Array.isArray(remote))throw Error('Invalid history response');
   if(generation!==serial||current!==userId())return;
   const byId=new Map(remote.filter(r=>validUUID.test(r.thread_id||''))
     .map(r=>[r.thread_id.toLowerCase(),r]));
   window.YapWebChat?.mergeCloud(remote);
   const local=window.YapWebChat?.snapshot()||[];
   let uploaded=0;
   for(const thread of local.slice(0,80)){
    if(generation!==serial||current!==userId())return;
    const id=String(thread.id||'').toLowerCase();
    if(!validUUID.test(id))continue; // Legacy browser chats require explicit import.
    const messages=normalize(thread.messages);
    if(!messages.length)continue;
    const prior=byId.get(id);
    const identical=prior&&hash(prior.messages)===hash(messages);
    if(identical)continue;
    // Don't overwrite remote content that is longer or was updated more recently.
    if(prior&&(normalize(prior.messages).length>messages.length||
       (Date.parse(prior.updated_at||'')>Number(thread.updated||0)+1500&&
        normalize(prior.messages).length>=messages.length)))continue;
    const save=await window.YapSession.authFetch(BASE+'/'+resource+'?on_conflict=user_id,thread_id',{
     method:'POST',headers:{'content-type':'application/json',
       'prefer':'resolution=merge-duplicates,return=minimal'},
     body:JSON.stringify({user_id:current,thread_id:id,
       title:String(thread.title||'New chat').slice(0,100),messages,
       updated_at:new Date(Math.max(Number(thread.updated)||0,Date.now())).toISOString()}),
     signal:AbortSignal.timeout(timeout)
    });
    if(!save.ok)throw Error('History upload unavailable (HTTP '+save.status+').');
    uploaded++;
   }
   if(generation!==serial||current!==userId())return;
   lastRun=Date.now();
   say('Conversations synced · '+remote.length+' cloud chats'+(uploaded?' · '+uploaded+' updated':''));
  }catch(e){
   if(generation===serial&&current===userId()){
    say('Could not sync chats. Your local account history is preserved. Try Sync conversations.');
    console.warn('YapThing chat sync unavailable',e?.message||e);
   }
  }finally{if(runningGeneration===generation)runningGeneration=-1}
 }
 const schedule=()=>{
  if(!actor||actor!==userId())return;
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{timer=null;syncNow()},1100);
 };
 const reset=()=>{
  serial++;
  if(timer){clearTimeout(timer);timer=null}
  actor=userId();
  say(actor?'Conversations are private to your account. Checking other devices…':
    'Signed out — previous conversations are hidden.');
  if(actor)queueMicrotask(()=>syncNow());
 };
 window.addEventListener('yap:session-change',reset);
 window.addEventListener('yap:chat-local-saved',schedule);
 window.addEventListener('focus',()=>{if(actor&&Date.now()-lastRun>7000)syncNow()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&actor&&Date.now()-lastRun>7000)syncNow();
 });
 setInterval(()=>{if(actor&&document.visibilityState==='visible'&&Date.now()-lastRun>25000)syncNow()},30000);
 window.YapChatCloud={syncNow,refreshAccount:reset};
 if(actor)queueMicrotask(()=>syncNow());
})();
