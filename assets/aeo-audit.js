'use strict';
(()=>{
const button=document.getElementById('aeo-run'),panel=document.getElementById('panel');if(!button||!panel)return;
const status=document.getElementById('aeo-status'),out=document.getElementById('aeo-results'),summary=document.getElementById('aeo-summary'),auto=document.getElementById('aeo-auto'),download=document.getElementById('aeo-export');
let ready=false,busy=false,last=null,lastStarted=0;
async function run(){
if(!ready||busy)return;
busy=true;lastStarted=Date.now();button.disabled=true;download.disabled=true;out.replaceChildren();summary.replaceChildren();status.textContent='Checking public website...';
const report={startedAt:new Date().toISOString(),origin:location.origin,checks:[],complete:false};
function row(label,ok,detail){report.checks.push({label,passed:ok,detail});const p=document.createElement('p');p.textContent=(ok?'PASS: ':'FAIL: ')+label+' - '+detail;out.append(p)}
async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text()}
try{
const xml=await get('/sitemap.xml'),doc=new DOMParser().parseFromString(xml,'application/xml');
if(doc.querySelector('parsererror'))throw Error('Invalid sitemap XML');
const urls=[...doc.getElementsByTagName('loc')].map(x=>x.textContent.trim());
if(urls.length>100)throw Error('Sitemap exceeds the 100-page browser check limit');
row('Sitemap URLs',urls.length>0&&new Set(urls).size===urls.length,urls.length+' URLs; duplicate check');
for(const url of urls){try{
const u=new URL(url);if(u.origin!==location.origin)throw Error('Unexpected sitemap origin');
const html=await get(u.pathname+u.search),d=new DOMParser().parseFromString(html,'text/html');
row(u.pathname+' availability',true,'HTTP success');
row(u.pathname+' metadata',Boolean(d.title&&d.querySelector('meta[name="description"]')?.content&&d.querySelector('link[rel="canonical"]')?.getAttribute('href')===url),'title, description and matching canonical');
const scripts=[...d.querySelectorAll('script[type="application/ld+json"]')],schemas=scripts.map(s=>JSON.parse(s.textContent));
row(u.pathname+' structured data',schemas.length>0&&schemas.every(s=>s['@context']==='https://schema.org'),'JSON syntax and context only; not rich-result validation');
}catch(e){row(url,false,e.message)}}
const robots=await get('/robots.txt');row('Crawler configuration',robots.includes('Sitemap: https://yapthing.com/sitemap.xml')&&robots.includes('Disallow: /admin/'),'sitemap declaration and admin exclusion');
const discovery=await get('/llms.txt');row('AI discovery text',discovery.includes('https://yapthing.com/faq/'),'FAQ link present; optional discovery aid');
report.complete=true;
}catch(e){report.error=e.message;row('Audit completion',false,e.message)}
finally{
report.finishedAt=new Date().toISOString();last=report;
const passed=report.checks.filter(c=>c.passed).length,failed=report.checks.length-passed;
for(const [label,value,note] of [['Passed checks',passed,'Observed in this run'],['Failed checks',failed,'Review details below'],['Audit status',report.complete?'Completed':'Incomplete','Technical checks only']]){
const card=document.createElement('article');card.className='stat';for(const [tag,text] of [['span',label],['strong',String(value)],['small',note]]){const e=document.createElement(tag);e.textContent=text;card.append(e)}summary.append(card)}
status.textContent=(report.complete?'Finished':'Incomplete')+' at '+new Date(report.finishedAt).toLocaleString()+'. '+passed+' passed, '+failed+' failed. This is not an uptime or AI visibility score.';
button.disabled=false;download.disabled=false;busy=false;
}}
button.addEventListener('click',run);
download.addEventListener('click',()=>{if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yapthing-site-check-'+last.finishedAt.slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
function start(){if(ready)return;ready=true;run()}
window.addEventListener('yap-admin-ready',start);
if(!panel.hidden)start();
function refreshIfDue(){if(ready&&auto.checked&&!document.hidden&&Date.now()-lastStarted>=30*60*1000)run()}
setInterval(refreshIfDue,60000);
document.addEventListener('visibilitychange',refreshIfDue);
auto.addEventListener('change',refreshIfDue);
})();
