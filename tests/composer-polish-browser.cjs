'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\//,'');
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end('Missing');}res.writeHead(200,{'content-type':type[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(data)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 const origin='http://127.0.0.1:'+server.address().port+'/chat/';
 for(const width of [1360,390]){
  const page=await browser.newPage({viewport:{width,height:820},isMobile:width<700,hasTouch:width<700});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   if(/yap_shared_chat_threads|yap_user_memory/.test(route.request().url()))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   return route.fulfill({status:204,body:''});
  });
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:28000});
  await page.waitForFunction(()=>window.YapComposerPolish&&window.YapAttachments&&window.YapActivity,{timeout:18000});
  assert.equal(await page.locator('#yap-attachment-menu summary svg').count(),1,'plus icon should be SVG');
  assert.equal(await page.locator('#yap-attachment-menu .yap-attach-item').count(),5,'five clean menu choices');
  assert.equal(await page.locator('#yap-attachment-menu').innerText().then(s=>s.includes('Do more')),false,'old Do more label removed');
  assert.equal(await page.locator('#yap-attachment-menu .yap-attach-item').first().getAttribute('aria-label'),'Take photo');
  await page.locator('#yap-attachment-menu > summary').click();
  assert(await page.locator('#yap-photo-pick').isVisible(),'image action visible');
  assert(await page.locator('#yap-document-pick').isVisible(),'document action visible');
  await page.locator('#yap-attachment-menu > summary').click();
  const doc=Buffer.from('Notes: design tests\nStep 2: verify attachment\n');
  await page.locator('#yap-document-input').setInputFiles({name:'notes.md',mimeType:'text/markdown',buffer:doc});
  await page.waitForFunction(()=>document.getElementById('photo-name').textContent==='notes.md');
  assert(await page.locator('#photo-preview').isVisible(),'document chip is visible');
  assert(await page.locator('#photo-preview .yap-doc-icon').isVisible(),'document icon in chip');
  assert.equal(await page.locator('#photo-preview').evaluate(el=>el.parentElement.classList.contains('compose-row')),true,'chip appears inside composer');
  assert((await page.evaluate(()=>window.YapAttachments.getDocument())).includes('verify attachment'),'document text available');
  assert(await page.locator('#yap-image-action').isHidden(),'image action hidden for document');
  await page.locator('#photo-remove').click();
  assert(await page.locator('#photo-preview').isHidden(),'document chip removes');
  assert.equal(await page.evaluate(()=>window.YapAttachments.getDocument()),'','removed document content cleared');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/6PcAAAAASUVORK5CYII=','base64');
  await page.locator('#photo-input').setInputFiles({name:'screenshot.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>window.YapPhotoVision.hasPhoto());
  assert(await page.locator('#photo-preview').isVisible(),'image chip visible');
  assert(await page.locator('#photo-thumb').isVisible(),'image thumbnail visible');
  assert((await page.locator('#photo-name').innerText()).includes('screenshot.png'),'image filename visible');
  await page.locator('#photo-remove').click();
  assert.equal(await page.evaluate(()=>window.YapPhotoVision.hasPhoto()),false,'removal clears original photo');
  assert(await page.locator('#photo-preview').isHidden(),'image chip removed');
  // Activity belongs to the conversation on the LEFT, never middle of the viewport.
  await page.evaluate(()=>window.YapWebChat.add('Question to generate reply','user'));
  await page.evaluate(()=>{window.__testActivity=window.YapActivity.start('yapthing','Preparing your reply…')});
  const activity=page.locator('#messages>.yap-activity');
  assert(await activity.isVisible(),'activity visible while pending');
  assert(await activity.locator('img.yap-source-yapthing').evaluate(el=>el.complete&&el.naturalWidth>0),'correct logo loads');
  const activityBox=await activity.boundingBox(),messageBox=await page.locator('#messages').boundingBox();
  assert(activityBox.x-messageBox.x<55,'left aligned: '+JSON.stringify({activityBox,messageBox}));
  assert(activityBox.width<400,'indicator compact');
  await page.evaluate(()=>window.__testActivity.finish('Done'));
  await page.waitForTimeout(1950);
  assert.equal(await activity.count(),0,'progress clears after completion');
  const composer=await page.locator('.compose-row').boundingBox();
  assert(composer.width>=width*.70&&composer.height<230,'composer fills available workspace without excessive height '+JSON.stringify(composer));
  assert.equal(errors.length,0,'uncaught JS errors: '+errors.join('; '));
  console.log('PASS polished composer '+width+'px: menu labels, supported docs, thumbnail, removal, left activity, automatic cleanup');
  await page.close();
 }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
