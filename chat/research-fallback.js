'use strict';
/* Research fallback: authenticated server-side search, source links and explicit failure status. */
window.YapResearchFallback=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const apikey='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 function shouldSearch(prompt){
  return /\b(latest|current|today|recent|news|research|sources?|cite|verify|search|look up|find online|compare options|regulations?|laws?|legal requirements?|best (?:available|options?|results?|places?|tools?|services?))\b/i.test(prompt);
 }
 function queryFor(prompt){return String(prompt||'').trim().slice(0,180)}
 async function call(slug,prompt){
  const token=await window.YapWebAccount?.getToken();
  if(!token)throw Error('Sign in to research the live web.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),26000);
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
 async function research(prompt){
  const errors=[];
  for(const provider of ['google-grounded-search','search-web','yap-public-research']){
   try{return await call(provider,prompt)}catch(e){errors.push(provider+': '+String(e.message||e))}
  }
  throw Error('Live research is unavailable. '+errors.join(' | ').slice(0,260));
 }
 function externalLink(prompt){return 'https://www.google.com/search?q='+encodeURIComponent(queryFor(prompt))}
 return {shouldSearch,research,externalLink};
})();
