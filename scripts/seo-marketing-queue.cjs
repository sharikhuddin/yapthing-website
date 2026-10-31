'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'search-manifest.json'),'utf8'));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const pages=manifest.pages.map(page=>{
 const h=fs.readFileSync(path.join(root,page.file),'utf8');
 const title=decode(h.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');
 const description=decode(h.match(/<meta name="description" content="([^"]*)"/i)?.[1]||'');
 const canonical=h.match(/<link rel="canonical" href="([^"]*)"/i)?.[1]||'';
 const og=h.match(/<meta property="og:title" content="([^"]*)"/i)?.[1]||'';
 const issues=[];
 if(title.length<15||title.length>72)issues.push('Review SEO title length');
 if(description.length<75||description.length>165)issues.push('Review meta description length');
 if(canonical!==page.url)issues.push('Canonical mismatch');
 if(!og)issues.push('Open Graph title missing');
 if(/[\uFFFD]/.test(title+' '+description))issues.push('Invalid replacement character');
 return {url:page.url,title,description,lastmod:page.lastmod,issues};
});
const opportunities=[
 {topic:'Research with sources',path:'/guides/research-with-sources/',intent:'Informational',proposal:'Expand an example showing how to verify linked citations and identify unsupported claims.',cta:'/ai-research-assistant/'},
 {topic:'Writing and communication',path:'/ai-writing-assistant/',intent:'Educational',proposal:'Prepare a concise sample for improving an email while keeping the writer’s voice.',cta:'/chat/'},
 {topic:'Getting started with YapThing',path:'/guides/',intent:'Onboarding',proposal:'Create a reviewed five-minute getting-started guide using only features verified on the web.',cta:'/chat/'},
 {topic:'Projects and Work',path:'/ai-work-productivity/',intent:'Product education',proposal:'Explain the difference between chat, projects and authorized Work actions with current limitations.',cta:'/plans/'},
 {topic:'Privacy and Incognito',path:'/privacy/',intent:'Trust',proposal:'Clarify device storage, account sync, provider processing and the limits of Incognito.',cta:'/chat/'},
 {topic:'Plans and usage',path:'/plans/',intent:'Commercial',proposal:'Review plan and credit explanations against current verified billing before drafting comparison content.',cta:'/plans/'}
];
const output={
 type:'human-review-marketing-queue',
 scope:'YapThing owned web pages only',
 automation:'Daily technical metadata maintenance. These topics are review suggestions, not auto-published campaigns.',
 status:'draft_ideas_need_human_review',
 pagesTracked:pages.length,
 pagesWithIssues:pages.filter(p=>p.issues.length).length,
 pages,
 proposals:opportunities.map((idea,i)=>({id:'topic-'+(i+1),...idea,status:'review',requiresHumanApproval:true})),
 disclaimers:['No auto-generated visitor or ranking metrics','No mass posting, unsolicited email or fake endorsements','Indexing and search placement are not guaranteed']
};
const dir=path.join(root,'seo');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'marketing-queue.json');
const json=JSON.stringify(output,null,2)+'\n';
if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==json)fs.writeFileSync(file,json);
console.log('Prepared marketing review queue for '+pages.length+' published pages; '+output.pagesWithIssues+' pages need editorial metadata review.');
