'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\//,'');
 if(!name||name.endsWith('/'))name+='index.html';
 const p=path.resolve(root,name);
 if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end('Blocked')}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end('Missing')}res.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain','cache-control':'no-store'});res.end(b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 for(const width of [1400,390]){
  const context=await browser.newContext({viewport:{width,height:840},isMobile:width<700,hasTouch:width<700});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'admin-mock-token'}))});
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const url=route.request().url();
   const data=url.includes('yap-plan-status')?{is_admin:true,plan:'pro',status:'active'}:
    url.includes('yap-admin-customers')?{total_accounts:6,new_last_7_days:2,matched:6,customers:[]}:
    url.includes('yap-admin-geography')?{total:6,known:4,unknown:2,last_30_days:3,countries:[{code:'US',total:3,last_30_days:2},{code:'PK',total:1,last_30_days:1}],source:'optional_self_reported_registration_country',asOf:new Date().toISOString()}:
    url.includes('yap-knowledge-activity')?{source:'mock',total:0,success:0,failed:0,cached:0,routes:[],recent:[],asOf:new Date().toISOString()}:{};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route('https://api.github.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","commit":{"message":"mock","committer":{"date":"2026-10-31"}},"workflow_runs":[]}'}));
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/admin/?view=marketing',{waitUntil:'domcontentloaded',timeout:23000});
  await page.waitForFunction(()=>document.getElementById('panel')&&!document.getElementById('panel').hidden,{timeout:16000});
  await page.waitForFunction(()=>window.YapAdminPages?.getCurrent?.()==='marketing',{timeout:5000});
  assert.equal(await page.locator('.admin-view:not([hidden])').count(),1,'only one admin view visible');
  assert.equal(await page.locator('#admin-current-page').innerText(),'Marketing overview');
  assert.equal(await page.locator('.admin-hub-card').count(),5,'marketing subpage cards');
  assert.equal(await page.locator('#panel > section').count(),0,'old scrolling sections removed');
  await page.locator('.admin-hub-card[data-admin-link="marketing-seo"]').click();
  assert.equal(await page.locator('#admin-current-page').innerText(),'SEO & metadata');
  assert.equal(new URL(page.url()).searchParams.get('view'),'marketing-seo','separate bookmarkable URL');
  assert(await page.locator('#seo-marketing').isVisible());
  assert(await page.locator('#aeo-intelligence').isHidden(),'AEO isolated on own page');
  await page.goto(origin+'/admin/?view=marketing-aeo',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.getElementById('panel').hidden);
  assert.equal(await page.locator('#admin-current-page').innerText(),'AEO & AI Search');
  assert(await page.locator('#aeo-intelligence').isVisible());
  await page.goto(origin+'/admin/?view=customers-geography',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.getElementById('panel').hidden);
  await page.waitForFunction(()=>document.getElementById('registration-geo-total')?.textContent==='6',{timeout:10000});
  assert.equal(await page.locator('#registration-geo-known').innerText(),'4');
  assert.equal(await page.locator('#registration-geo-unknown').innerText(),'2');
  assert((await page.locator('#registration-geo-table').innerText()).includes('United States'),'US country row');
  assert((await page.locator('#registration-geo-table').innerText()).includes('Pakistan'),'Pakistan country row');
  assert((await page.locator('#registration-geo-table').innerText()).includes('Unknown'),'unknown account row');
  assert.equal(await page.locator('.admin-view:not([hidden])').count(),1);
  if(width<700){
   await page.locator('.admin-menu-toggle').click();
   assert(await page.locator('.admin-sidebar').evaluate(el=>el.classList.contains('open')),'mobile menu opens');
   await page.locator('.admin-side-nav a[data-admin-link="finance-costs"]').click();
   assert.equal(await page.locator('#admin-current-page').innerText(),'AI & search costs');
   assert(await page.locator('.admin-sidebar').evaluate(el=>!el.classList.contains('open')),'mobile menu closes');
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.YapAdminPages?.getCurrent?.()==='customers-geography');
  }else{
   assert(await page.locator('.admin-sidebar').isVisible(),'desktop rail available');
   await page.locator('.admin-side-nav a[data-admin-link="finance-billing"]').click();
   assert(await page.locator('.admin-view[data-admin-view="finance-billing"]').isVisible(),'billing own page');
   assert(await page.locator('#registration-geo').isHidden());
  }
  assert.deepEqual(errors,[],'uncaught errors '+errors.join('|'));
  console.log('PASS '+width+'px admin: isolated pages, marketing hub, geography totals, history/deep links and responsive nav');
  await context.close();
 }
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
