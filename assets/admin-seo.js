'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const root=$('seo-marketing');
 if(!root)return;
 let ready=false,busy=false,latest=null;
 const status=$('seo-status'),button=$('seo-refresh'),download=$('seo-download'),tbody=$('seo-pages-body'),ideas=$('seo-ideas');
 const clean=(value,max=180)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
 const text=(tag,content,cls)=>{const node=document.createElement(tag);node.textContent=content;if(cls)node.className=cls;return node};
 const load=async(url)=>{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(16000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.text();
 };
 const diagnose=(d,url)=>{
  const get=selector=>d.querySelector(selector)?.getAttribute('content')||'';
  const title=clean(d.querySelector('title')?.textContent,125),desc=clean(get('meta[name="description"]'),250),
    canonical=d.querySelector('link[rel="canonical"]')?.href||'',
    og=get('meta[property="og:title"]'),tw=get('meta[name="twitter:card"]'),
    jsonld=[...d.querySelectorAll('script[type="application/ld+json"]')];
  const issues=[];
  if(title.length<15||title.length>72)issues.push('Review title length');
  if(desc.length<70||desc.length>170)issues.push('Review description length');
  if(canonical!==url)issues.push('Canonical mismatch');
  if(!og)issues.push('Open Graph title missing');
  if(!tw)issues.push('Twitter metadata missing');
  if(!jsonld.length)issues.push('Structured data missing');
  else for(const script of jsonld){try{JSON.parse(script.textContent)}catch{issues.push('Invalid structured data');break}}
  if(title.includes('�')||desc.includes('�'))issues.push('Invalid character');
  return {url,title,description:desc,canonical,issues,ok:!issues.length};
 };
 async function scan(){
  if(!ready||busy)return;
  busy=true;button.disabled=true;download.disabled=true;status.textContent='Fetching the public sitemap and inspecting live metadata…';tbody.replaceChildren();
  const results=[],startedAt=new Date().toISOString();
  try{
   const xml=new DOMParser().parseFromString(await load('/sitemap.xml?seo='+Date.now()),'application/xml');
   if(xml.querySelector('parsererror'))throw Error('Sitemap XML could not be read');
   const urls=[...xml.getElementsByTagName('loc')].map(x=>x.textContent.trim());
   const unique=[...new Set(urls)];if(!urls.length||unique.length!==urls.length||urls.length>100)throw Error('Invalid, duplicate or excessive sitemap URLs');
   const modDates=[...xml.getElementsByTagName('url')].map(node=>[node.querySelector('loc')?.textContent.trim(),node.querySelector('lastmod')?.textContent.trim()]);
   const mods=new Map(modDates);
   for(let i=0;i<urls.length;i+=4){
    await Promise.all(urls.slice(i,i+4).map(async url=>{
     const target=new URL(url);
     if(target.origin!==location.origin){results.push({url,issues:['Unknown sitemap origin'],ok:false});return}
     try{
      const html=await load(target.pathname+target.search);
      const page=new DOMParser().parseFromString(html,'text/html');
      results.push({...diagnose(page,url),lastmod:mods.get(url)||'—'});
     }catch(error){results.push({url,issues:[clean(error.message)],ok:false,lastmod:mods.get(url)||'—'})}
    }));
    status.textContent='Checked '+Math.min(i+4,urls.length)+' of '+urls.length+' pages…';
   }
   results.sort((a,b)=>a.url.localeCompare(b.url));
   const healthy=results.filter(p=>p.ok).length;
   $('seo-pages').textContent=String(results.length);
   $('seo-healthy').textContent=String(healthy);
   $('seo-issues').textContent=String(results.length-healthy);
   for(const page of results){
    const tr=document.createElement('tr');
    const cell=(value)=>{const td=text('td',value);tr.append(td);return td;};
    const c=cell(''),link=document.createElement('a');link.href=page.url;link.textContent=new URL(page.url).pathname;link.target='_blank';link.rel='noopener noreferrer';c.append(link);
    const metadata=cell('');
    metadata.append(text('strong',page.title||'Title unavailable'),text('small',page.description||'Description unavailable','seo-desc'));
    cell(page.ok?'Pass':page.issues.join('; ')).className=page.ok?'seo-pass':'seo-fail';
    cell(page.lastmod||'—');tbody.append(tr);
   }
   latest={type:'YapThing SEO live audit',startedAt,finishedAt:new Date().toISOString(),results};
   status.textContent='Live audit complete at '+new Date().toLocaleString()+' — '+healthy+' of '+results.length+' pages passed. This does not measure Google rankings, indexing or traffic.';
   download.disabled=false;
  }catch(error){
   status.textContent='SEO report could not be completed: '+clean(error.message);
   const row=document.createElement('tr');const col=text('td','No verified report available; retry.');col.colSpan=4;row.append(col);tbody.append(row);
  }finally{busy=false;button.disabled=false;}
 }
 async function queue(){
  try{
   const data=JSON.parse(await load('/seo/marketing-queue.json?refresh='+Date.now()));
   if(!Array.isArray(data.proposals))throw Error('No review queue is available');
   ideas.replaceChildren();
   for(const idea of data.proposals.slice(0,10)){
    const card=document.createElement('article');card.className='seo-idea';
    card.append(text('span',clean(idea.intent,60),'seo-label'),text('strong',clean(idea.topic,100)),text('p',clean(idea.proposal,350)));
    const link=document.createElement('a');link.href=idea.path;link.textContent='Review source page ↗';card.append(link);
    ideas.append(card);
   }
  }catch(error){ideas.replaceChildren(text('p','The marketing-review queue has not been published yet. Trigger or await the GitHub maintenance workflow.'))}
 }
 async function automation(){
  const el=$('seo-automation-state');
  try{
   const response=await fetch('https://api.github.com/repos/sharikhuddin/yapthing-website/actions/workflows/seo-marketing-maintenance.yml/runs?per_page=1',{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('GitHub run status unavailable');
   const payload=await response.json(),run=payload.workflow_runs?.[0];
   if(!run){el.textContent='Not run yet';return}
   el.textContent=run.status==='completed'?(run.conclusion==='success'?'Last run passed':'Review failure'):'Running';
   el.title='Latest GitHub workflow run: '+run.created_at;
  }catch{el.textContent='Not verified';el.title='Open GitHub Actions to verify scheduled run status'}
 }
 button.addEventListener('click',()=>{scan();queue();automation()});
 download.addEventListener('click',()=>{
  if(!latest)return;
  const object=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=object;a.download='yapthing-seo-report-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(object),1500);
 });
 window.addEventListener('yap-admin-ready',()=>{if(ready)return;ready=true;scan();queue();automation()});
 if(!$('panel')?.hidden){ready=true;scan();queue();automation()}
 document.addEventListener('visibilitychange',()=>{if(ready&&!document.hidden&&latest&&Date.now()-new Date(latest.finishedAt).getTime()>30*60*1000)scan()});
})();
