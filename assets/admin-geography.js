'use strict';
(()=>{
 const $=id=>document.getElementById(id),panel=$('panel'),button=$('registration-geo-refresh');
 if(!panel||!button)return;
 const status=$('registration-geo-status'),table=$('registration-geo-table'),bars=$('registration-geo-bars'),exportButton=$('registration-geo-export');
 const names=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});
 const name=code=>code==='??'?'Unknown':/^[A-Z]{2}$/.test(code)?(names.of(code)||code):'Unknown';
 let ready=false,busy=false,data=null;
 const add=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=String(text);if(cls)el.className=cls;return el};
 async function refresh(){
  if(!ready||busy)return;
  busy=true;button.disabled=true;exportButton.disabled=true;status.textContent='Checking aggregated signup countries…';
  try{
   const s=JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null');
   if(!s?.access_token)throw Error('Sign in with your administrator account.');
   const response=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-admin-geography',{
    headers:{authorization:'Bearer '+s.access_token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},
    signal:AbortSignal.timeout(12000),cache:'no-store'});
   const report=await response.json();
   if(!response.ok)throw Error(report.error||'Unable to load registration data');
   if(!Array.isArray(report.countries)||!Number.isFinite(Number(report.total)))throw Error('Invalid country summary');
   const total=Number(report.total),known=Number(report.known)||0,unknown=Number(report.unknown)||0;
   if(known+unknown!==total)throw Error('Registration breakdown is incomplete');
   data=report;
   $('registration-geo-total').textContent=total.toLocaleString();
   $('registration-geo-known').textContent=known.toLocaleString();
   $('registration-geo-unknown').textContent=unknown.toLocaleString();
   $('registration-geo-recent').textContent=Number(report.last_30_days||0).toLocaleString();
   const entries=report.countries.map(x=>({code:/^[A-Z]{2}$/.test(x.code)?x.code:'??',count:Number(x.total)||0,recent:Number(x.last_30_days)||0}));
   entries.push({code:'??',count:unknown,recent:Math.max(0,Number(report.last_30_days||0)-entries.reduce((n,x)=>n+x.recent,0))});
   entries.sort((a,b)=>b.count-a.count||a.code.localeCompare(b.code));
   table.replaceChildren();bars.replaceChildren();
   const max=Math.max(1,...entries.map(x=>x.count));
   for(const item of entries){
    const row=document.createElement('tr');
    for(const val of [name(item.code)+(item.code==='??'?'':' ('+item.code+')'),item.count.toLocaleString(),item.recent.toLocaleString()])row.append(add('td',val));
    table.append(row);
    const bar=document.createElement('div');bar.className='admin-geo-row';
    const title=add('span',name(item.code)),track=document.createElement('div'),fill=document.createElement('div');
    track.className='admin-geo-track';fill.className='admin-geo-fill';
    fill.style.width=(item.count/max*100)+'%';track.append(fill);bar.append(title,track,add('strong',item.count,'admin-geo-count'));bars.append(bar);
   }
   status.textContent='Updated '+new Date(report.asOf).toLocaleString()+'. Countries are optional, self-reported at web signup; no IP geolocation.';
   exportButton.disabled=false;
  }catch(e){
   for(const id of ['registration-geo-total','registration-geo-known','registration-geo-unknown','registration-geo-recent'])$(id).textContent='Unavailable';
   table.replaceChildren();const row=document.createElement('tr'),cell=add('td','No verified country report available.');cell.colSpan=3;row.append(cell);table.append(row);
   bars.replaceChildren(add('p','Refresh when administrator access and reporting are available.'));
   status.textContent='Country breakdown unavailable: '+String(e.message).slice(0,160);
  }finally{busy=false;button.disabled=false}
 }
 button.addEventListener('click',refresh);
 exportButton.addEventListener('click',()=>{
  if(!data)return;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yapthing-registration-countries.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 });
 const start=()=>{if(ready)return;ready=true;refresh()};
 window.addEventListener('yap-admin-ready',start);
 if(!panel.hidden)start();
})();
