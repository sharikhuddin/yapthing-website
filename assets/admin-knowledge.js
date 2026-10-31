'use strict';
(()=>{
 const $=id=>document.getElementById(id);if(!$('yapknowledge-admin'))return;
 let ready=false,busy=false;
 const button=$('knowledge-refresh'),status=$('knowledge-status'),routes=$('knowledge-routes'),recent=$('knowledge-recent');
 const safe=(x,max=180)=>String(x??'').slice(0,max);
 function empty(table,cols,message){table.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=cols;td.textContent=message;tr.append(td);table.append(tr)}
 function addRow(table,values){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=safe(value);tr.append(td)}table.append(tr)}
 async function refresh(){
  if(!ready||busy)return;
  busy=true;button.disabled=true;status.textContent='Loading admin-only YapKnowledge event summary…';
  try{
   const session=JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null');
   if(!session?.access_token)throw Error('Sign in to the admin account again.');
   const r=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-knowledge-activity',{headers:{authorization:'Bearer '+session.access_token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},signal:AbortSignal.timeout(12000),cache:'no-store'});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Knowledge activity unavailable');
   $('knowledge-total').textContent=String(data.total??'—');
   $('knowledge-success').textContent=String(data.success??'—');
   $('knowledge-failed').textContent=String(data.failed??'—');
   $('knowledge-cached').textContent=String(data.cached??'—');
   routes.replaceChildren();
   for(const item of data.routes||[]){addRow(routes,[item.route,item.events,item.success,item.failed,item.cached,item.avg_ms===null?'—':item.avg_ms+' ms'])}
   if(!routes.childNodes.length)empty(routes,6,'No YapKnowledge events recorded in the last 7 days.');
   recent.replaceChildren();
   for(const item of data.recent||[]){addRow(recent,[item.created_at||'—',item.event_type,item.outcome,item.duration_ms?item.duration_ms+' ms':'—'])}
   if(!recent.childNodes.length)empty(recent,4,'No recent activity. Operational tracking starts after the updated chat is deployed.');
   status.textContent='Last 7 days, as of '+new Date(data.asOf).toLocaleString()+'. Source: '+data.source+'.'+(data.sampleLimited?' Results are limited to the most recent 2,000 events.':'');
  }catch(error){
   status.textContent='No verified YapKnowledge activity summary: '+safe(error.message);
   empty(routes,6,'The report could not be loaded.');empty(recent,4,'No verified recent events.');
   for(const id of ['knowledge-total','knowledge-success','knowledge-failed','knowledge-cached'])$(id).textContent='Unavailable';
  }finally{busy=false;button.disabled=false}
 }
 button.addEventListener('click',refresh);
 window.addEventListener('yap-admin-ready',()=>{if(ready)return;ready=true;refresh()});
 if(!$('panel')?.hidden){ready=true;refresh()}
})();
