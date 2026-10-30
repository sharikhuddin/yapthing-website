'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
const origin='https://yapthing.com',check=process.argv.includes('--check');
const routes=['/','/product/','/faq/','/guides/','/guides/research-with-sources/','/about/','/chat/','/plans/','/desktop/','/plugins/','/support/','/privacy/','/delete-account/','/ai-chat-assistant/','/ai-writing-assistant/','/ai-research-assistant/','/ai-work-productivity/','/medical-education/','/engineering-ai/','/design-ai/','/student-ai/','/professionals-ai/','/everyday-ai/','/yapthing-alternative/'];
const fileFor=r=>r==='/'?'index.html':r.slice(1)+'index.html';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const plain=s=>decode(s.replace(/<[^>]*>/g,'')).trim();
function meta(h,attr,name,value){return h.replace(new RegExp('<meta\\s+'+attr+'="'+name+'"[^>]*>','gi'),'').replace('</head>','<meta '+attr+'="'+name+'" content="'+esc(value)+'"></head>')}
function link(h,rel,value){return h.replace(new RegExp('<link\\s+rel="'+rel+'"[^>]*>','gi'),'').replace('</head>','<link rel="'+rel+'" href="'+value+'"></head>')}
let old={pages:[]};try{old=JSON.parse(fs.readFileSync('search-manifest.json','utf8'))}catch{}
let verification={};if(fs.existsSync('search-verification.json'))verification=JSON.parse(fs.readFileSync('search-verification.json','utf8'));const pages=[],changes=[];
function save(p,s){if(fs.existsSync(p)&&fs.readFileSync(p,'utf8')===s)return;if(check){changes.push(p);return}fs.writeFileSync(p,s)}
const org={'@type':'Organization','@id':origin+'/#organization',name:'YapThing',url:origin+'/',logo:{'@type':'ImageObject',url:origin+'/assets/yapthing-512.png'},email:'support@yapthing.com'};
const website={'@type':'WebSite','@id':origin+'/#website',name:'YapThing',url:origin+'/',publisher:{'@id':org['@id']}};
for(const route of routes){
const file=fileFor(route);let h=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const title=plain(h.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');if(!title)throw Error('Missing title: '+file);
let desc=decode(h.match(/<meta name="description" content="([^"]*)"/i)?.[1]||'');
const descriptions={'/desktop/':'Install YapThing as a desktop web app and learn how to pair a computer for reviewed file edits, code drafts and GitHub tasks.','/plugins/':'Learn how YapThing connects supported services, what authorization is required, and where provider availability and limits apply.','/delete-account/':'How to request deletion of your YapThing account and associated cloud data, including support options and local-device limitations.'};
desc=descriptions[route]||desc;if(!desc)throw Error('Missing description: '+file);
for(const [field,name] of [['googleSiteVerification','google-site-verification'],['bingSiteVerification','msvalidate.01']]){if(verification[field]){if(!/^[a-zA-Z0-9_-]+$/.test(verification[field]))throw Error('Invalid verification value');h=meta(h,'name',name,verification[field]);}}h=meta(h,'name','description',desc);h=link(h,'canonical',origin+route);h=meta(h,'name','robots','index,follow,max-image-preview:large');
for(const [name,value]of Object.entries({'og:type':'website','og:site_name':'YapThing','og:title':title,'og:description':desc,'og:url':origin+route,'og:image':origin+'/assets/yapthing-512.png','og:image:width':'512','og:image:height':'512','og:image:alt':'YapThing logo'}))h=meta(h,'property',name,value);
for(const [name,value]of Object.entries({'twitter:card':'summary','twitter:title':title,'twitter:description':desc,'twitter:image':origin+'/assets/yapthing-512.png','twitter:image:alt':'YapThing logo'}))h=meta(h,'name',name,value);
h=link(h,'icon',origin+'/assets/favicon.svg');
let graph=[];
for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const d=JSON.parse(m[1]);graph.push(...(d['@graph']||[d]))}
graph=graph.filter(d=>!['Organization','WebSite','WebPage','CollectionPage','AboutPage','BreadcrumbList'].includes(d['@type']));
graph=graph.map(d=>{const copy={...d};delete copy['@context'];return copy});
const name=plain(h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||title);
const crumbs=[{name:'YapThing',item:origin+'/'}];
if(route.startsWith('/guides/')&&route!=='/guides/')crumbs.push({name:'Guides',item:origin+'/guides/'});
if(route!=='/')crumbs.push({name,item:origin+route});
const breadcrumb={'@type':'BreadcrumbList','@id':origin+route+'#breadcrumb',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))};
const webpage={'@type':route==='/guides/'?'CollectionPage':route==='/about/'?'AboutPage':'WebPage','@id':origin+route+'#webpage',url:origin+route,name:title,description:desc,inLanguage:'en',isPartOf:{'@id':website['@id']},publisher:{'@id':org['@id']},breadcrumb:{'@id':breadcrumb['@id']}};
const entity=graph.find(d=>d['@id']);if(entity)webpage.mainEntity={'@id':entity['@id']};
h=h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
h=h.replace('</head>','<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':[org,website,webpage,breadcrumb,...graph]}).replaceAll('<','\\u003c')+'</script></head>');
h=h.replace(/<!-- search-navigation -->[\s\S]*?<!-- \/search-navigation -->/g,'');
if(route!=='/chat/'&&route!=='/plugins/'){
const nav='<!-- search-navigation --><aside class="search-navigation" aria-label="Explore YapThing"><h2>Explore YapThing</h2><p><a href="/product/">Product facts</a> · <a href="/guides/">Guides</a> · <a href="/faq/">FAQ</a> · <a href="/desktop/">Computer setup</a> · <a href="/plans/">Plans</a> · <a href="/about/">About &amp; standards</a></p></aside><!-- /search-navigation -->';
h=h.replace('</main>',nav+'</main>');
}
save(file,h);
const sha256=crypto.createHash('sha256').update(h).digest('hex'),prior=old.pages.find(p=>p.url===origin+route);
pages.push({url:origin+route,file,sha256,lastmod:prior?.sha256===sha256?prior.lastmod:new Date().toISOString().slice(0,10)});
}
save('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>'<url><loc>'+p.url+'</loc><lastmod>'+p.lastmod+'</lastmod></url>').join('\n')+'\n</urlset>\n');
save('search-manifest.json',JSON.stringify({origin,pages},null,2)+'\n');
if(changes.length)throw Error('Run node scripts/search-build.cjs before committing; stale files: '+changes.join(', '));
console.log((check?'Verified':'Updated')+' search metadata, graph, navigation and sitemap for '+pages.length+' pages.');


