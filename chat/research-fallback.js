'use strict';
/* Research fallback: authenticated server-side search, source links and explicit failure status. */
window.YapResearchFallback=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const apikey='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 function topicFor(q){if(/\b(?:stress test(?:ing)?|economic depression|panic (?:button|in rust))\b/i.test(q))return 'topic';return /\b(suicid\w*|self[- ]harm|schizophren\w*|psychosis|psychotic|mental health|anxiet\w*|anxious|panic|depress\w*|stress\w*|burnout|overwhelmed|ptsd|trauma|adhd|ocd|bipolar|grief|grieving|insomnia|eating disorder|anorexia|bulimia|addiction|counsell?ing|psychotherap\w*|therapist)\b/i.test(q)?'mental-health':/\b(health|medical|symptoms?|diagnos\w*|medication|dose|pregnan\w*|diabet\w*|asthma|vaccin\w*|cancer|nutrition)\b/i.test(q)?'health':/\b(science|scientific|research|education|finance|invest\w*|mortgage|tax|legal|law|visa|travel|github|software|programming|technology|api)\b/i.test(q)?'topic':'general';}
 function supportAnswer(q){if(!/\b(?:I (?:want|plan|intend) to (?:kill myself|end my life|hurt myself)|I(?:'m| am) (?:going to kill myself|suicidal)|I (?:can(?:not|'t)|can’t) (?:stay|keep myself) safe|I (?:just |have )?(?:took an overdose|overdosed)|I (?:might|may) hurt myself|I (?:have|am having) suicidal thoughts|I(?:'m| am) thinking about (?:suicide|killing myself|ending my life))\b/i.test(q))return null;return {source:'support',text:'I’m sorry you’re going through this. Your safety matters. If you have taken an overdose, already hurt yourself, or may act now, contact local emergency services or go to the nearest emergency department now. If you can, move away from anything you could use to hurt yourself and ask someone you trust to stay with you. Are you safe right now, and what country are you in so we can look for verified local support?'};}
 function shouldSearch(prompt){
  if(topicFor(prompt)!=='general')return true;
  return /\b(restaurants?|cafes?|pharmacies|local events|latest|current|today|tonight|recent|weather|forecast|price|prices|availability|opening hours|near me|nearby|news|research|sources?|citations?|cite|verify|search|look up|find online|compare options|regulations?|laws?|legal requirements?|updated|202[4-9]|best (?:available|options?|results?|places?|tools?|services?))\b/i.test(prompt);
 }
 function queryFor(prompt){return String(prompt||'').replace(/\s+/g,' ').trim().slice(0,180)}
 async function call(slug,prompt,timeoutMs=26000,style='balance'){
  const revision=window.YapLocation?.revision();
  const token=await window.YapWebAccount?.getToken();
  if(revision!==window.YapLocation?.revision()){const error=Error('Location context changed. Please retry your question.');error.status=409;throw error;}
  if(!token){const error=Error('Sign in to research the live web.');error.status=401;throw error;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),slug==='google-grounded-search'?45000:timeoutMs);const provider=slug==='google-grounded-search'?'google':slug==='search-web'?'brave':'web';const activity=window.YapActivity?.start(provider,'Searching for sources…');let complete=false;
  try{
   const response=await fetch(base+slug,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,'apikey':apikey},body:JSON.stringify({query:queryFor(prompt),responseMode:style}),signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){const error=Error('Search unavailable ('+response.status+'). '+(response.status===429?'Daily allowance or provider quota reached.':response.status===401||response.status===403?'Sign in again to research sources.':'Try again later or open search in your browser.'));if(typeof data.error==='string'&&data.error.trim())error.message=data.error.slice(0,260);error.code=data.code;error.status=response.status;throw error;}
   const sources=[...new Map((Array.isArray(data.results)?data.results:[]).flatMap(s=>{try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||/^(?:localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.|\[)/i.test(u.hostname))return [];u.hash='';return [{title:String(s.title||u.hostname).slice(0,140),url:u.href,summary:String(s.summary||'').slice(0,450)}]}catch{return []}}).map(s=>[s.url,s])).values()].slice(0,9);
   if(!sources.length)throw Error('Search returned no verifiable source links.');
   const answer=typeof data.answer==='string'&&data.answer.trim()?data.answer.trim():'Search snippets (not independently verified full pages):\n\n'+sources.map((s,i)=>'['+(i+1)+'] '+s.title+'\n'+s.summary).join('\n\n');
   complete=true;return {answer,sources:sources.map(s=>({title:s.title,url:s.url})),provider:data.provider||slug,scope:String(data.scope||'').slice(0,400),searchSuggestions:typeof data.searchSuggestions==='string'?data.searchSuggestions.slice(0,15000):''};
  }finally{clearTimeout(timer);activity?.finish(complete?'Sources found':'Search unavailable',!complete)}
 }
 async function research(prompt,mode='auto',style='balance'){
  if(mode==='auto'&&style==='swift')mode='google';
  if(mode==='auto'&&style==='depth'){
   const began=performance.now(),primary=await research(prompt,'google','depth');
   try{
    const secondary=await call('yap-public-research',prompt,14000);
    const offset=primary.sources.length;
    const extra=secondary.answer.replace(/\[(\d+)\]/g,(_,n)=>Number(n)>0&&Number(n)<=secondary.sources.length?'['+(Number(n)+offset)+']':'');
    return {...primary,answer:primary.answer+'\n\nAdditional research:\n'+extra,sources:[...primary.sources,...secondary.sources],scope:[primary.scope,secondary.scope].filter(Boolean).join(' '),durationMs:Math.round(performance.now()-began),provider:primary.provider+' + public research'};
   }catch{return {...primary,durationMs:Math.round(performance.now()-began),scope:(primary.scope||'')+' Additional research was unavailable; this answer uses the primary search only.'};}
  }
  const started=performance.now();
  if(mode==='parallel'){
   const checks=await Promise.allSettled(['search-web','yap-public-research'].map(p=>call(p,prompt,14000)));
   const good=checks.filter(x=>x.status==='fulfilled').map(x=>x.value);
   if(!good.length)throw Error('Parallel sources unavailable');
   const sources=[...new Map(good.flatMap(x=>x.sources).map(s=>[s.url,s])).values()].slice(0,12);
   return {answer:good.map(x=>x.provider+': '+x.answer).join('\n\n'),sources,provider:'Parallel sources',durationMs:Math.round(performance.now()-started),scope:'Compare independent sources before relying on claims.'};
  }
  const errors=[];const sensitive=['mental-health','health'].includes(topicFor(prompt));
  const live=/\b(restaurants?|cafes?|pharmacies|local events|weather|forecast|prices?|availability|opening hours|nearby|near me|latest|current|today|tonight|news|exchange rate)\b/i.test(prompt);
  for(const provider of (sensitive&&mode==='auto'?['google-grounded-search']:mode==='google'?['google-grounded-search']:mode==='brave'?['search-web']:mode==='public'?['yap-public-research']:live?['google-grounded-search','search-web']:['google-grounded-search','search-web','yap-public-research'])){
   try{const result=await call(provider,prompt,mode==='auto'?14000:26000,style);return {...result,durationMs:Math.round(performance.now()-started)}}catch(e){if([401,403,409,429].includes(e.status))throw e;errors.push(provider+': '+String(e.message||'unavailable').slice(0,180))}
  }
  throw Error('Live research is unavailable. '+errors.join(' | ').slice(0,260));
 }
 function externalLink(prompt){return 'https://www.google.com/search?q='+encodeURIComponent(queryFor(prompt))}
 return {shouldSearch,research,externalLink,topicFor,supportAnswer};
})();
