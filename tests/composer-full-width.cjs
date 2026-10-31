'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let file=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\//,'');
 if(file.endsWith('/'))file+='index.html';
 const target=path.resolve(root,file);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end('Missing');}res.writeHead(200,{'content-type':type[path.extname(target)]||'text/plain','cache-control':'no-store'});res.end(data)});
});
async function measure(page,label,ratio){
 const m=await page.evaluate(()=>{
  const rect=id=>document.querySelector(id).getBoundingClientRect();
  const work=rect('.workspace'),composer=rect('.workspace>.composer'),row=rect('.compose-row'),textarea=rect('#prompt');
  const css=getComputedStyle(document.querySelector('.workspace'));
  const paddingLeft=parseFloat(css.paddingLeft)||0;
  const contentWidth=work.width-paddingLeft;
  return {viewport:innerWidth,workspace:work.width,contentWidth,sidebar:paddingLeft,composerX:composer.x,composerW:composer.width,rowX:row.x,rowW:row.width,textareaW:textarea.width,scrollW:document.documentElement.scrollWidth,formMax:getComputedStyle(document.querySelector('.composer')).maxWidth};
 });
 assert(m.rowW>=m.contentWidth*ratio, label+' composer should use workspace width '+JSON.stringify(m));
 assert(m.textareaW>=m.rowW-125,label+' textarea should fill composer '+JSON.stringify(m));
 assert(m.rowX>=m.sidebar-3,label+' composer inside workspace '+JSON.stringify(m));
 assert(m.rowX+m.rowW<=m.viewport+3,label+' no right overflow '+JSON.stringify(m));
 assert(m.scrollW<=m.viewport+3,label+' no horizontal scroll '+JSON.stringify(m));
 console.log('PASS '+label+' width '+Math.round(m.rowW)+'px / available '+Math.round(m.contentWidth)+'px');
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
  const addr='http://127.0.0.1:'+server.address().port+'/chat/';
  for(const width of [1670,1280,390]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
   page.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,150)));
   await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
    const u=route.request().url();
    return route.fulfill(u.includes('yap_shared_chat_threads')||u.includes('yap_user_memory')?{status:200,contentType:'application/json',body:'[]'}:{status:204,body:''});
   });
   await page.goto(addr,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(()=>window.YapWebChat?.newChat&&window.YapComposerPolish,{timeout:12000});
   assert(await page.locator('#yap-empty-hero').isVisible(),'new-chat landing visible');
   await measure(page,'new-chat '+width,width<700?.92:.91);
   await page.evaluate(()=>window.YapWebChat.add('A test message','user'));
   await measure(page,'existing-chat '+width,width<700?.92:.91);
   if(width>700){
    await page.locator('#yap-tool-menu .yap-sidebar-close').click();
    await page.waitForTimeout(280);
    await measure(page,'collapsed-sidebar '+width,.93);
    await page.locator('#yap-desktop-menu > summary').click();
    await page.evaluate(()=>document.documentElement.style.setProperty('--yap-sidebar-width','385px'));
    await page.waitForTimeout(280);
    await measure(page,'resized-sidebar '+width,.91);
   }
   await page.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
