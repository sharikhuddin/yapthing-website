'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const type={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\//,'');
 if(!name||name.endsWith('/'))name+='index.html';
 const f=path.resolve(root,name);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(f,(err,b)=>{if(err){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'content-type':type[path.extname(f)]||'text/plain','cache-control':'no-store'});res.end(b)});
});
const routes=['/','/product/','/about/','/faq/','/plans/','/support/','/privacy/','/delete-account/','/desktop/','/guides/','/ai-writing-assistant/','/ai-research-assistant/','/student-ai/','/medical-education/','/desktop-connector/'];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 const address='http://127.0.0.1:'+server.address().port;
 let checked=0;
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
  const errors=[];page.on('pageerror',err=>{if(!/supabase|storage/i.test(err.message))errors.push(err.message)});
  for(const route of routes){
   await page.goto(address+route,{waitUntil:'domcontentloaded',timeout:16000});
   await page.waitForFunction(()=>document.body.classList.contains('marketing-site'),{timeout:5500});
   assert.equal(await page.locator('.header .brand img').count(),1,route+' official logo');
   assert(await page.locator('.header .brand img').evaluate(el=>el.complete&&el.naturalWidth>0),route+' image loaded');
   assert.equal(await page.locator('main h1').count(),1,route+' exactly one main h1');
   assert.equal(await page.locator('.header nav#site-links a.primary').count(),1,route+' primary CTA');
   assert.equal(await page.locator('footer .mk-footer-grid').count(),1,route+' unified footer');
   assert.equal(await page.locator('link[href*="marketing-v2.css"]').count(),1,route+' editorial CSS');
   assert.equal(await page.locator('script[src*="marketing-nav.js"]').count(),1,route+' nav script');
   const coords=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,innerW:innerWidth,bodyW:document.body.scrollWidth}));
   assert(coords.scrollW<=coords.innerW+3,route+' width '+width+' overflow '+JSON.stringify(coords));
   if(width===390){
    const menu=page.locator('.header .menu');
    assert(await menu.isVisible(),route+' mobile nav button visible');
    await menu.click();
    assert(await page.locator('#site-links').isVisible(),route+' mobile menu opens');
    assert.equal(await menu.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert(await page.locator('#site-links').isHidden(),route+' Escape closes mobile menu');
   } else {
    assert(await page.locator('#site-links').isVisible(),route+' desktop links visible');
   }
   if(route==='/'){
    assert((await page.locator('.mk-hero h1').innerText()).includes('Good ideas deserve'));
    assert.equal(await page.locator('.mk-feature').count(),6);
    assert.equal(await page.locator('.mk-use-case').count(),8);
    assert.equal(await page.locator('.mk-faq details').count(),4);
    await page.locator('.mk-faq summary').first().click();
    assert(await page.locator('.mk-faq details').first().evaluate(el=>el.open),'FAQ reveal works');
   }
   if(route==='/plans/'){
    assert(await page.locator('main').getByText('$7.99', {exact:false}).count()>0,'Plus price preserved');
    assert(await page.locator('main').getByText('$12.99', {exact:false}).count()>0,'Pro price preserved');
   }
   if(route==='/desktop-connector/')assert(await page.locator('#connect').isVisible(),'connector functionality kept');
   ++checked;
  }
  await page.goto(address+'/',{waitUntil:'domcontentloaded'});
  if(width===1440)await page.screenshot({path:'C:/Users/KhalialA/yapthing-website/tests/marketing-home-desktop.png',fullPage:false});
  if(width===390)await page.screenshot({path:'C:/Users/KhalialA/yapthing-website/tests/marketing-home-mobile.png',fullPage:false});
  await page.close();
  assert.equal(errors.length,0,'page errors: '+errors.slice(0,4).join(' | '));
 }
 // Validate internal homepage route references without relying on external provider services.
 const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const links=[...homepage.matchAll(/href="(\/[^"#?]*\/?)"/g)].map(m=>m[1]);
 const missing=links.filter(link=>!link.includes('mailto:')&&!fs.existsSync(path.join(root,link.slice(1),link.endsWith('/')?'index.html':'')));
 assert.deepEqual(missing,[],'homepage link destinations must exist');
 console.log('PASS marketing redesign '+checked+' desktop/mobile pages, responsive nav, SEO hierarchy, working FAQs, pricing preserved, desktop connector and internal links');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
