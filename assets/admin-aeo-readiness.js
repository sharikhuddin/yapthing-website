'use strict';
(()=>{
 const $=id=>document.getElementById(id),panel=$('aeo-intelligence');
 if(!panel)return;
 let ready=false,loading=false,latest=null;
 const refresh=$('aeo-intelligence-refresh'),exportButton=$('aeo-intelligence-export'),status=$('aeo-intelligence-status');
 const short=s=>String(s??'').slice(0,320);
 const dom=(name,value,cls)=>{const node=document.createElement(name);node.textContent=short(value);if(cls)node.className=cls;return node};
 const fetchJSON=async path=>{
  const r=await fetch(path+'?revision='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('HTTP '+r.status+' for '+path);
  return r.json();
 };
 const empty=(table,message)=>{table.replaceChildren();const tr=document.createElement('tr'),td=dom('td',message);td.colSpan=3;tr.append(td);table.append(tr)};
 async function load(){
  if(!ready||loading)return;
  loading=true;refresh.disabled=true;exportButton.disabled=true;
  status.textContent='Loading AEO readiness results from the published automation…';
  try{
   const [report,queue]=await Promise.all([fetchJSON('/seo/aeo-report.json'),fetchJSON('/seo/aeo-opportunities.json')]);
   if(report.kind!=='offline-answer-engine-readiness'||!Array.isArray(report.pages)||report.pages.length>100||!Array.isArray(queue.items))throw Error('Invalid AEO report');
   if(report.trackedPages!==report.pages.length)throw Error('Page count does not match report');
   latest={report,queue};
   $('aeo-intelligence-tracked').textContent=String(report.trackedPages);
   $('aeo-intelligence-ready').textContent=String(report.checkedPages);
   $('aeo-intelligence-review').textContent=String(report.reviewPages);
   $('aeo-intelligence-critical').textContent=String(report.criticalPages);
   const crawlers=$('aeo-intelligence-crawlers');crawlers.replaceChildren();
   for(const [name,rule] of Object.entries(report.crawlerRules||{})){
    const card=dom('article','');card.className='seo-idea';
    card.append(dom('strong',name),dom('p',rule.robotsAllowed?'Public crawling permitted by checked robots.txt rules':'Crawler access requires investigation'));
    card.append(dom('small',rule.note,'seo-label'));crawlers.append(card);
   }
   const table=$('aeo-intelligence-issues');table.replaceChildren();
   const findings=(queue.items||[]).slice(0,40);
   for(const issue of findings){
    const tr=document.createElement('tr'),td=document.createElement('td'),link=document.createElement('a');
    const path=String(issue.page||'/');
    if(!/^\/[a-z0-9_\-/]*$/i.test(path))continue;
    link.href=path;link.target='_blank';link.rel='noopener noreferrer';link.textContent=path;
    td.append(link);tr.append(td,dom('td',issue.priority,issue.priority==='critical'?'seo-fail':'seo-pass'),dom('td',issue.why));table.append(tr);
   }
   if(!table.children.length)empty(table,'No automated content findings. Review important pages and sources manually.');
   const exceptions=report.criticalPages+report.reviewPages;
   status.textContent='Repository AEO audit loaded: '+report.trackedPages+' pages; '+exceptions+' with findings. Re-run the GitHub workflow to rebuild the report after changes. Search impressions and AI citations are not measured here.';
   exportButton.disabled=false;
  }catch(error){
   status.textContent='AEO report unavailable: '+short(error.message)+'. Use the GitHub workflow to generate it.';
   $('aeo-intelligence-tracked').textContent='Unavailable';
   $('aeo-intelligence-ready').textContent='Unavailable';
   $('aeo-intelligence-review').textContent='Unavailable';
   $('aeo-intelligence-critical').textContent='Unavailable';
   $('aeo-intelligence-crawlers').replaceChildren(dom('p','No verified crawler summary.'));
   empty($('aeo-intelligence-issues'),'No verified report available.');
  }finally{loading=false;refresh.disabled=false}
 }
 refresh.addEventListener('click',load);
 exportButton.addEventListener('click',()=>{
  if(!latest)return;
  const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}),uri=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=uri;link.download='yapthing-aeo-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(uri),1500);
 });
 const start=()=>{if(ready)return;ready=true;load()};
 window.addEventListener('yap-admin-ready',start);
 if(!$('panel')?.hidden)start();
})();
