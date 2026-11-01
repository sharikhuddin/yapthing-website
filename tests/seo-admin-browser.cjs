'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml'};
const server=http.createServer((req,res)=>{
 let target=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'');if(!target||target.endsWith('/'))target+='index.html';
 const file=path.resolve(root,target);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':type[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 for(const width of [1340,390]){
 const ctx=await browser.newContext({viewport:{width,height:850}});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let knowledgeRequests=0,authenticated=false;
 await page.addInitScript(()=>{
   localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'admin-test-token'}));
 });
 await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
  const url=route.request().url();
  if(url.includes('yap-plan-status'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({plan:'pro',status:'active',is_admin:true})});
  if(url.includes('yap-admin-customers'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_accounts:1,new_last_7_days:0,matched:0,customers:[]})});
  if(url.includes('yap-knowledge-activity')){knowledgeRequests++;authenticated=route.request().headers().authorization==='Bearer admin-test-token';
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'client-reported YapKnowledge events recorded by server',window:'last_7_days',asOf:new Date().toISOString(),total:4,success:2,failed:1,cached:1,routes:[{route:'academic',events:3,success:2,failed:1,cached:0,avg_ms:625}],recent:[{event_type:'academic',outcome:'success',duration_ms:625,created_at:'2026-10-31T12:00:00Z'}],days:{'2026-10-31':4}})});
  }
  if(url.includes('api.github.com'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({workflow_runs:[],sha:'a'.repeat(40),commit:{message:'test',committer:{date:new Date().toISOString()}}})});
  return route.fulfill({status:503,contentType:'application/json',body:'{}'});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/admin/',{waitUntil:'domcontentloaded',timeout:22000});
 await page.waitForFunction(()=>document.getElementById('panel')&&!document.getElementById('panel').hidden,{timeout:12000});
 await page.waitForFunction(()=>document.getElementById('knowledge-total')?.textContent==='4',{timeout:9000});
 assert(authenticated,'aggregates require authenticated API session');
 assert.equal(await page.locator('#knowledge-success').innerText(),'2');
 assert.equal(await page.locator('#knowledge-failed').innerText(),'1');
 assert.equal(await page.locator('#knowledge-routes tr').count(),1,'route breakdown');
 assert((await page.locator('#knowledge-recent').innerText()).includes('academic'));
 assert.equal(await page.locator('#seo-marketing').count(),1);
 assert.equal(await page.locator('#aeo-intelligence').count(),1,'dedicated AEO admin view');
 await page.waitForFunction(()=>document.getElementById('aeo-intelligence-tracked')?.textContent==='24',{timeout:12000});
 assert.equal(await page.locator('#aeo-intelligence-critical').innerText(),'0','critical AEO structural checks');
 assert.equal(await page.locator('#aeo-intelligence-review').innerText(),'1','review queue count');
 assert.equal(await page.locator('#aeo-intelligence-crawlers .seo-idea').count(),3,'search crawler status cards');
 assert.equal(await page.locator('#aeo-intelligence-issues tr').count(),1,'one actionable editorial finding');
 await page.waitForFunction(()=>/audit complete|Live audit complete|report could not/i.test(document.getElementById('seo-status')?.textContent||''),{timeout:25000});
 assert.equal(await page.locator('#seo-pages-body tr').count(),24,'all 24 published page metadata entries rendered');
 assert.equal(await page.locator('#seo-ideas .seo-idea').count(),6,'marketing topic queue');
 assert((await page.locator('#seo-automation-state').innerText()).length>0);
 assert.equal(await page.locator('.admin-side-nav a[data-admin-link="marketing-seo"]').count(),1,'SEO admin navigation');
 assert.equal(await page.locator('.admin-side-nav a[data-admin-link="marketing-aeo"]').count(),1,'AEO admin navigation');
 assert.equal(await page.locator('.admin-side-nav a[data-admin-link="ai-knowledge"]').count(),1,'Knowledge admin navigation');
 if(width===390){const sizes=await page.evaluate(()=>({viewport:innerWidth,body:document.body.scrollWidth}));assert(sizes.body<=sizes.viewport+15,'admin mobile page overflows '+JSON.stringify(sizes))}
 assert.deepEqual(errors,[],'browser errors');
 console.log('PASS '+width+'px admin SEO pages, marketing queue, admin-only YapKnowledge totals/routes/activity, refresh controls; '+knowledgeRequests+' authenticated request(s)');
 await ctx.close();
 }
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
