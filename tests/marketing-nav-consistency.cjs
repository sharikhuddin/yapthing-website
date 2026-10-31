'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((request,response)=>{
 let name=decodeURIComponent((request.url||'/').split('?')[0]).replace(/^\//,'');
 if(!name||name.endsWith('/'))name+='index.html';
 const dest=path.resolve(root,name);
 if(!dest.startsWith(root+path.sep)){response.writeHead(403);return response.end('Blocked')}
 fs.readFile(dest,(error,buf)=>{if(error){response.writeHead(404);return response.end('Missing')}
 response.writeHead(200,{'content-type':mime[path.extname(dest)]||'text/plain','cache-control':'no-store'});response.end(buf)});
});
const routes=['/','/plans/','/product/','/support/','/faq/','/desktop/'];
const widths=[1600,1440,1100,900,800,780,760,390];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 const origin='http://127.0.0.1:'+server.address().port;
 let passes=0;
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:20000});
   const layout=await page.evaluate(()=>{
    const r=s=>{const e=document.querySelector(s);const b=e?.getBoundingClientRect();return b?{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}:null};
    const visible=s=>{const e=document.querySelector(s);return e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'};
    return {brand:r('.header .brand'),nav:r('.header .nav'),links:r('.header nav.links'),cta:r('.header a.primary'),hamb:r('.header .menu'),header:r('.header'),
      menuVisible:visible('.header .menu'),linksVisible:visible('.header nav.links'),overflow:document.documentElement.scrollWidth-innerWidth,
      cards:[...document.querySelectorAll('main>.grid>.card')].map(e=>{const a=e.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width}})};
   });
   const desktop=width>780;
   assert(layout.overflow<=3,route+' '+width+' page overflow '+JSON.stringify(layout));
   if(desktop){
    assert(!layout.menuVisible,route+' '+width+' desktop hamburger should be hidden');
    assert(layout.linksVisible,route+' '+width+' desktop links should be visible');
    assert(Math.abs(layout.brand.y-layout.links.y)<25,route+' '+width+' links must share the brand row '+JSON.stringify(layout));
    assert(layout.cta.right<=width-6,route+' '+width+' CTA exceeds viewport');
    assert(layout.nav.h<103,route+' '+width+' navigation too tall');
    assert(layout.header.h<104,route+' '+width+' header should be a single row');
    assert(layout.cta.h<57,route+' '+width+' CTA should be compact '+JSON.stringify(layout));
   }else{
    assert(layout.menuVisible,route+' '+width+' mobile menu must be visible');
    assert(!layout.linksVisible,route+' '+width+' mobile links must initially collapse');
    await page.locator('.header .menu').click();
    assert(await page.locator('.header nav.links').isVisible(),route+' mobile menu opens');
    assert.equal(await page.locator('.header .menu').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert(await page.locator('.header nav.links').isHidden(),route+' Escape hides menu');
   }
   if(route==='/plans/'){
    const cardList=layout.cards;
    assert.equal(cardList.length,3,'All three plans remain available');
    if(width>780)assert(Math.abs(cardList[0].y-cardList[1].y)<3&&Math.abs(cardList[1].y-cardList[2].y)<3,'3 plan cards must align in desktop grid');
    assert(await page.locator('button[data-plan="plus"]').count()===1,'Plus purchase control retained');
    assert(await page.locator('button[data-plan="pro"]').count()===1,'Pro purchase control retained');
    assert(await page.locator('#manage-billing').count()===1,'Manage subscription preserved');
   }
   ++passes;
  }
  if(width===1440||width===390){
   await page.goto(origin+'/plans/',{waitUntil:'domcontentloaded'});
   await page.screenshot({path:path.join(root,'tests',width===1440?'plans-nav-desktop-review.png':'plans-nav-mobile-review.png'),fullPage:false});
  }
  await context.close();
 }
 console.log('PASS '+passes+' public-page viewport checks: single-row desktop header, responsive mobile menu, pricing CTA and billing controls');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
