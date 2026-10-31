'use strict';
(()=>{
 const panel=document.getElementById('panel'),month=document.getElementById('cost-month'),
  refresh=document.getElementById('cost-refresh'),status=document.getElementById('cost-status');
 if(!panel||!month||!refresh||!status)return;
 const el=id=>document.getElementById(id);
 const currentMonth=new Date().toISOString().slice(0,7);
 month.max=currentMonth;month.value=currentMonth;
 let ready=false,busy=false,latest=null;
 const number=v=>Number.isFinite(Number(v))?Number(v):0;
 function usd(v){
  if(v===null||v===undefined||v==='')return '—';
  const n=Number(v);
  if(!Number.isFinite(n))return '—';
  const digits=n===0?2:Math.abs(n)<0.1?6:Math.abs(n)<1?4:2;
  return '$'+n.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
 }
 const asInt=v=>Math.max(0,Math.floor(number(v))).toLocaleString('en-US');
 function cells(tbody,items,columns){
  tbody.replaceChildren();
  if(!items.length){
   const row=document.createElement('tr'),cell=document.createElement('td');
   cell.colSpan=columns;cell.textContent='No tracked events for this month.';row.append(cell);tbody.append(row);return;
  }
  for(const values of items){
   const row=document.createElement('tr');
   for(const value of values){const cell=document.createElement('td');cell.textContent=String(value??'—');row.append(cell)}
   tbody.append(row);
  }
 }
 function render(report){
  latest=report;
  const requests=number(report.requests),incomplete=number(report.partial_requests)+number(report.unpriced_requests);
  el('cost-total').textContent=requests?usd(report.estimated_usd):'No data yet';
  el('cost-requests').textContent=asInt(requests);
  el('cost-average').textContent=report.average_usd==null?'—':usd(report.average_usd);
  el('cost-incomplete').textContent=asInt(incomplete);
  const features=Array.isArray(report.by_feature)?report.by_feature:[];
  const models=Array.isArray(report.by_model)?report.by_model:[];
  const accountRows=Array.isArray(report.top_accounts)?report.top_accounts:[];
  const days=Array.isArray(report.by_day)?report.by_day:[];
  const featureNames={cloud_chat:'Yap Chat',web_search:'Yap Web',grounded_research:'Yap Verify',code_draft:'Yap Code Draft'};
  cells(el('cost-features'),features.map(x=>[featureNames[x.feature]||x.feature,asInt(x.requests),usd(x.estimated_usd),asInt(x.incomplete)]),4);
  cells(el('cost-models'),models.map(x=>[(x.model||x.provider||'Unknown')+(x.provider&&x.model&&x.model!==x.provider?' ('+x.provider+')':''),asInt(x.requests),usd(x.estimated_usd),asInt(x.incomplete)]),4);
  cells(el('cost-accounts'),accountRows.map(x=>{
   const target=x.plan==='plus'?1:x.plan==='pro'?2:null,cost=number(x.estimated_usd);
   return [String(x.user_id||'').slice(0,8)+'…',x.plan||'unknown',asInt(x.requests),usd(x.estimated_usd),
    target===null?'No target':cost>target?'Above '+usd(target):'Within '+usd(target)];
  }),5);
  const bars=el('cost-daily');bars.replaceChildren();
  if(!days.length){bars.textContent='No daily cost records for this period.';}
  else{
   const max=Math.max(...days.map(x=>number(x.estimated_usd)),0);
   for(const item of days){
    const col=document.createElement('div');col.className='cost-day';
    const bar=document.createElement('span');bar.className='cost-bar';
    const value=number(item.estimated_usd);
    bar.style.height=(max?Math.max(3,Math.round(value/max*100)):3)+'%';
    bar.title=String(item.day)+' · '+usd(item.estimated_usd)+' · '+asInt(item.requests)+' requests';
    const label=document.createElement('small');label.textContent=String(item.day).slice(5);
    col.append(bar,label);bars.append(col);
   }
  }
  const first=report.first_tracked_at?new Date(report.first_tracked_at).toLocaleString():'Not yet recorded';
  status.textContent=requests
   ?'Updated '+new Date(report.observed_at).toLocaleString()+'. Tracking began '+first+'. '+incomplete+' estimates incomplete.'
   :'No cost events tracked for '+String(report.month||month.value)+'. Metering starts with new requests; historical quota counters cannot be converted into invoices.';
  el('cost-disclaimer').textContent=String(report.note||'Estimates only; provider invoices and verified revenue are not connected.')+' Price snapshot '+String(report.pricing_version||'unknown')+'.';
 }
 async function load(){
  if(!ready||busy)return;
  const selected=month.value;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(selected)||selected>currentMonth){
   status.textContent='Select the current or a past month.';return;
  }
  let token='';
  try{token=JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null')?.access_token||'';}catch{}
  if(!token){status.textContent='Sign in to your administrator account to view costs.';return;}
  busy=true;refresh.disabled=true;month.disabled=true;status.textContent='Loading private cost summary…';
  try{
   const r=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-admin-ai-costs?month='+encodeURIComponent(selected),{
    headers:{authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)
   });
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(typeof result.error==='string'?result.error:'Cost service returned HTTP '+r.status);
   if(result.month!==selected||!Number.isFinite(Number(result.requests)))throw Error('Invalid cost service response');
   render(result);
  }catch(e){status.textContent='Cost intelligence unavailable: '+e.message+'. No estimate was updated.';}
  finally{busy=false;refresh.disabled=false;month.disabled=false;}
 }
 refresh.addEventListener('click',load);month.addEventListener('change',load);
 function start(){if(ready)return;ready=true;load();}
 window.addEventListener('yap-admin-ready',start);
 if(!panel.hidden)start();
})();
