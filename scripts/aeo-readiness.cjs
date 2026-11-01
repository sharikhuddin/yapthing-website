'use strict';
/**
 * YapThing AEO readiness: deterministic, offline inspection of published HTML.
 * This is not a ranking, indexing, crawl-log or AI-citation measurement.
 * No outbound APIs, AI-generated claims, user content, or API credentials.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'search-manifest.json'),'utf8'));
const origin='https://yapthing.com';
const text=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]+>/g,' ')
 .replace(/&(?:nbsp|amp|quot|lt|gt|#39);/g,' ')
 .replace(/\s+/g,' ').trim();
const find=(s,re)=>s.match(re)?.[1]||'';
const match=(h,prop,val)=>{
 const tags=[...h.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
 return tags.some(tag=>new RegExp('\\b'+prop+'\\s*=\\s*["\']'+val+'["\']','i').test(tag));
};
const record=(key,priority,description)=>({code:key,priority,description});
const analyzed=[];
for(const page of manifest.pages){
 const file=path.join(root,page.file),html=fs.readFileSync(file,'utf8');
 const main=find(html,/<main\b[^>]*>([\s\S]*?)<\/main>/i);
 const body=find(html,/<body\b[^>]*>([\s\S]*?)<\/body>/i);
 const content=text(main||body);
 const heading=[...((main||body).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi))].map(x=>text(x[1]));
 const title=text(find(html,/<title>([\s\S]*?)<\/title>/i));
 const description=find(html,/<meta\s+name="description"\s+content="([^"]*)"/i);
 const canonical=find(html,/<link\s+rel="canonical"\s+href="([^"]*)"/i);
 const robots=find(html,/<meta\s+name="robots"\s+content="([^"]*)"/i);
 const schemas=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
 const issues=[],schemaTypes=new Set(),mainLinks=[...main.matchAll(/<a\b[^>]*href="([^"]*)"/gi)].map(x=>x[1]);
 const add=(key,priority,description)=>issues.push(record(key,priority,description));
 if(!title||!description||!canonical)add('missing_index_metadata','critical','Title, description or canonical missing');
 if(canonical!==page.url)add('canonical_mismatch','critical','Canonical does not match its sitemap URL');
 if(/noindex/i.test(robots))add('noindex','critical','Page is set noindex although listed in the public sitemap');
 // Chat is a dynamic application, not a static explanatory article; do not apply article-heading rules.
 if(page.url!==origin+'/chat/'&&heading.length!==1)add('h1_structure','critical','Provide exactly one accurate, visible primary heading');
 if(!/og:title/i.test(html)||!/og:description/i.test(html))add('social_preview','review','Check social preview metadata');
 if(!schemas.length)add('structured_data','review','Add factual, valid structured data matching visible page content');
 for(const [i,match] of schemas.entries()){
  try{
   const data=JSON.parse(match[1]);if(data['@context']!=='https://schema.org')add('schema_context','review','Check JSON-LD schema.org context');
   for(const node of data['@graph']||[data]){if(node?.['@type'])schemaTypes.add(node['@type']);
    if(node?.['@type']==='FAQPage'){for(const q of node.mainEntity||[]){
      if(!content.toLowerCase().includes(text(q.name).toLowerCase()))add('faq_visibility','critical','A structured FAQ question does not match visible content');
    }}
   }
  }catch{add('schema_invalid_'+i,'critical','Structured data JSON cannot be parsed')}
 }
 if(content.length<230&&page.url!=='https://yapthing.com/chat/')add('thin_visible_text','review','Expand original, useful, visible explanatory text');
 if(mainLinks.filter(x=>x.startsWith('/')&&!x.startsWith('//')).length<2&&page.url!=='https://yapthing.com/chat/')
  add('internal_discovery','review','Link to related first-party product information or practical guides');
 if(!/<(?:p|li|details|section)\b/i.test(main))add('answer_structure','review','Provide crawlable explanatory paragraphs or answers');
 if(/\uFFFD/.test(content))add('character_encoding','review','Review visible replacement characters');
 const questionHeadings=[...main.matchAll(/<(?:h2|h3|summary)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|summary)>/gi)]
  .map(x=>text(x[1])).filter(x=>/\?$/.test(x));
 analyzed.push({
  path:new URL(page.url).pathname,url:page.url,title,lastmod:page.lastmod,visibleCharacters:content.length,
  questionHeadings:questionHeadings.length,structuredTypes:[...schemaTypes].sort(),
  status:issues.some(x=>x.priority==='critical')?'critical':issues.length?'review':'checked',
  findings:issues
 });
}
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const groups=robots.split(/(?=^User-agent:)/gmi).map(s=>({agent:find(s,/^User-agent:\s*(.+)$/im).trim(),body:s}));
const searchBot=groups.find(g=>g.agent.toLowerCase()==='oai-searchbot');
const all=groups.find(g=>g.agent==='*');
const hasBan=g=>g&&/^Disallow:\s*\/$/m.test(g.body);
const bots={
 'OAI-SearchBot':{robotsAllowed:!!(searchBot||all)&&!hasBan(searchBot||all),note:'Search inclusion crawler; distinct from AI training'},
 'Googlebot':{robotsAllowed:!!all&&!hasBan(all),note:'General search crawler'},
 'Bingbot':{robotsAllowed:!!all&&!hasBan(all),note:'General search crawler'}
};
const critical=analyzed.filter(x=>x.status==='critical').length,
 review=analyzed.filter(x=>x.status==='review').length,
 observed=analyzed.length-critical-review;
const report={
 kind:'offline-answer-engine-readiness',origin,scope:'Crawlability and on-page answer-readiness only; not AI citations, search rankings, impressions or indexing',
 trackedPages:analyzed.length,criticalPages:critical,reviewPages:review,checkedPages:observed,
 crawlerRules:bots,robotsSitemap:robots.includes('Sitemap: '+origin+'/sitemap.xml'),
 generatedFrom:'search-manifest.json',pages:analyzed,
 externalReporting:{
  googleSearchConsole:'https://search.google.com/search-console',
  aiVisibilityGuide:'https://support.google.com/webmasters/answer/16984139',
  bingWebmaster:'https://www.bing.com/webmasters/',
  chatgptSearchBot:'https://developers.openai.com/api/docs/bots'
 },
 disclaimers:['Rules checked from source; live network and search-crawler visits are not measured',
 'Structured data must accurately describe visible content; it does not guarantee an AI citation or rich result',
 'Do not auto-create mass-produced articles or invented customer reviews or performance claims']
};
if(!report.robotsSitemap||!bots['OAI-SearchBot'].robotsAllowed)throw Error('Public AI search crawler access or sitemap declaration needs review');
const recommendations=analyzed.flatMap(p=>p.findings.map(f=>({
 page:p.path,priority:f.priority,code:f.code,why:f.description,action:'Human editorial review required; do not change product claims or publish automatically'
})));
const focus=[
 {path:'/guides/',topic:'Answer-first guides',why:'Add authentic short direct answers to frequent user questions, with links to current product facts',approval:'required'},
 {path:'/product/',topic:'Verified product capabilities',why:'Confirm each claimed feature is currently live before including it in explanatory answers',approval:'required'},
 {path:'/faq/',topic:'Accuracy and release-status review',why:'Review platforms, pricing, provider limitations and privacy wording for factual changes',approval:'required'}
];
const opportunities={kind:'aeo-editorial-review',scope:'Human approval required',items:recommendations.slice(0,80),suggestions:focus};
for(const [file,value] of [['seo/aeo-report.json',report],['seo/aeo-opportunities.json',opportunities]]){
 const full=path.join(root,file),body=JSON.stringify(value,null,2)+'\n';
 if(!fs.existsSync(full)||fs.readFileSync(full,'utf8')!==body)fs.writeFileSync(full,body);
}
console.log('AEO readiness: '+report.trackedPages+' pages, '+critical+' critical, '+review+' editorial review, '+observed+' checked. SearchBot and sitemap validated.');
