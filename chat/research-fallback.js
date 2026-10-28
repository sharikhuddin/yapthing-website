'use strict';
/* Research fallback: authenticated server-side search, source links and explicit failure status. */
window.YapResearchFallback=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const apikey='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 function shouldSearch(prompt){
  return /\b(latest|current|today|recent|news|research|sources?|cite|verify|search|look up|find online|compare options|regulations?|laws?|legal requirements?|best (?:available|options?|results?|places?|tools?|services?))\b/i.test(prompt);
 }
 function queryFor(prompt){return String(prompt||'').trim().slice(0,180)}
 async function call(slug,prompt,timeoutMs=26000){
  const token=await window.YapWebAccount?.getToken();
  if(!token)throw Error('Sign in to research the live web.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(base+slug,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,'apikey':apikey},body:JSON.stringify({query:queryFor(prompt)}),signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(String(data.error||'Search unavailable ('+response.status+')'));
   const sources=(Array.isArray(data.results)?data.results:[]).flatMap(s=>{try{const u=new URL(s.url);if(u.protocol!=='https:')return [];return [{title:String(s.title||u.hostname).slice(0,140),url:u.href,summary:String(s.summary||'').slice(0,450)}]}catch{return []}}).slice(0,7);
   if(!sources.length)throw Error('Search returned no verifiable source links.');
   const answer=typeof data.answer==='string'&&data.answer.trim()?data.answer.trim():sources.map((s,i)=>'['+(i+1)+'] '+s.title+'\n'+s.summary).join('\n\n');
   return {answer,sources:sources.map(s=>({title:s.title,url:s.url})),provider:data.provider||slug,scope:String(data.scope||'').slice(0,240)};
  }finally{clearTimeout(timer)}
 }
 async function research(prompt,mode='auto'){
  const started=performance.now();
  if(mode==='parallel'){
   const checks=await Promise.allSettled(['search-web','yap-public-research'].map(p=>call(p,prompt,14000)));
   const good=checks.filter(x=>x.status==='fulfilled').map(x=>x.value);
   if(!good.length)throw Error('Parallel sources unavailable');
   const sources=[...new Map(good.flatMap(x=>x.sources).map(s=>[s.url,s])).values()].slice(0,12);
   return {answer:good.map(x=>x.provider+': '+x.answer).join('\n\n'),sources,provider:'Parallel sources',durationMs:Math.round(performance.now()-started),scope:'Compare independent sources before relying on claims.'};
  }
  const errors=[];
  for(const provider of (mode==='google'?['google-grounded-search']:mode==='brave'?['search-web']:mode==='public'?['yap-public-research']:['google-grounded-search','search-web','yap-public-research'])){
   try{const result=await call(provider,prompt,mode==='auto'?14000:26000);return {...result,durationMs:Math.round(performance.now()-started)}}catch(e){errors.push(provider+': '+String(e.message||e))}
  }
  throw Error('Live research is unavailable. '+errors.join(' | ').slice(0,260));
 }
 function externalLink(prompt){return 'https://www.google.com/search?q='+encodeURIComponent(queryFor(prompt))}
 return {shouldSearch,research,externalLink};
})();
