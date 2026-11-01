'use strict';
// Read and enqueue user-owned YapCode tasks; requires SQL migration and valid Supabase session.
// This browser client cannot claim tasks or issue commands to a desktop computer.
window.YapCodeCloudTasks=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/rest/v1/yapcode_tasks';
 const key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 async function call(method,query='',body){
  const account=window.YapWebAccount;
  const actor=account?.getUserId?.(),jwt=await account?.getToken?.();
  if(!actor||!jwt)throw Error('Sign in to YapThing first.');
  const response=await fetch(base+query,{method,headers:{apikey:key,Authorization:'Bearer '+jwt,'content-type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(response.status===404?'YapCode cloud tasks are not enabled yet.':data?.message||'Task service unavailable.');
  if(actor!==account.getUserId())throw Error('Account changed. Discarding result.');
  return data;
 }
 const list=()=>call('GET','?select=id,goal,status,attempts,created_at,updated_at&order=created_at.desc&limit=30');
 async function enqueue(goal){
  const text=String(goal||'').trim();
  if(text.length<5||text.length>1000)throw Error('Please provide a task description between 5 and 1000 characters.');
  const owner_id=window.YapWebAccount?.getUserId?.();
  return call('POST','',{owner_id,goal:text,status:'queued'});
 }
 return Object.freeze({list,enqueue});
})();
