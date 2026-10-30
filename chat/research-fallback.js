'use strict';
/* Research fallback: authenticated server-side search, source links and explicit failure status. */
window.YapResearchFallback=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const apikey='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 function shouldSearch(prompt){
  return /\b(latest|current|today|tonight|recent|weather|forecast|price|prices|availability|opening hours|near me|nearby|news|research|sources?|citations?|cite|verify|search|look up|find online|compare options|regulations?|laws?|legal requirements?|updated|202[4-9]|best (?:available|options?|results?|places?|tools?|services?))\b/i.test(prompt);
 }
 function queryFor(prompt){return String(prompt||'').replace(/\s+/g,' ').trim().slice(0,180)}
 async function call(slug,prompt,timeoutMs=26000){
  const revision=window.YapLocation?.revision();
  const token=await window.YapWebAccount?.getToken();
  if(revision!==window.YapLocation?.revision()){const error=Error('Location context changed. Please retry your question.');error.status=409;throw error;}
  if(!token){const error=Error('Sign in to research the live web.');error.status=401;throw error;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);const provider=slug==='google-grounded-search'?'google':slug==='search-web'?'brave':'web';const activity=window.YapActivity?.start(provider,'Searching for sources…');let complete=false;
  try{
   const response=await fetch(base+slug,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,'apikey':apikey},body:JSON.stringify({query:queryFor(prompt)}),signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){const error=Error('Search unavailable ('+response.status+'). '+(response.status===429?'Daily allowance or provider quota reached.':response.status===401||response.status===403?'Sign in again to research sources.':'Try again later or open search in your browser.'));error.status=response.status;throw error;}
   const sources=[...new Map((Array.isArray(data.results)?data.results:[]).flatMap(s=>{try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||/^(?:localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.|\[)/i.test(u.hostname))return [];u.hash='';return [{title:String(s.title||u.hostname).slice(0,140),url:u.href,summary:String(s.summary||'').slice(0,450)}]}catch{return []}}).map(s=>[s.url,s])).values()].slice(0,9);
   if(!sources.length)throw Error('Search returned no verifiable source links.');
   const answer=typeof data.answer==='string'&&data.answer.trim()?data.answer.trim():'Search snippets (not independently verified full pages):\n\n'+sources.map((s,i)=>'['+(i+1)+'] '+s.title+'\n'+s.summary).join('\n\n');
   complete=true;return {answer,sources:sources.map(s=>({title:s.title,url:s.url})),provider:data.provider||slug,scope:String(data.scope||'').slice(0,240)};
  }finally{clearTimeout(timer);activity?.finish(complete?'Sources found':'Search unavailable',!complete)}
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
  const live=/\b(weather|forecast|prices?|availability|opening hours|nearby|near me|latest|current|today|tonight|news|exchange rate)\b/i.test(prompt);
  for(const provider of (mode==='google'?['google-grounded-search']:mode==='brave'?['search-web']:mode==='public'?['yap-public-research']:live?['google-grounded-search','search-web']:['google-grounded-search','search-web','yap-public-research'])){
   try{const result=await call(provider,prompt,mode==='auto'?14000:26000);return {...result,durationMs:Math.round(performance.now()-started)}}catch(e){if([401,403,409,429].includes(e.status))throw e;errors.push(provider+': unavailable')}
  }
  throw Error('Live research is unavailable. '+errors.join(' | ').slice(0,260));
 }
 function externalLink(prompt){return 'https://www.google.com/search?q='+encodeURIComponent(queryFor(prompt))}
 return {shouldSearch,research,externalLink};
})();
