'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),app='C:/Users/KhalialA/yapthing';
const mime={'.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let file=decodeURIComponent(req.url.split('?')[0]);
 if(file.endsWith('/'))file+='index.html';
 const target=path.resolve(root,file.replace(/^\//,''));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(target,(err,bytes)=>{if(err){res.writeHead(404);return res.end('Missing')}
  res.writeHead(200,{'content-type':mime[path.extname(target)]||'text/plain','cache-control':'no-store'});res.end(bytes)});
});
(async()=>{
 const htmls=[];
 function walk(dir,level=0){if(level>3)return;
  for(const x of fs.readdirSync(dir,{withFileTypes:true})){
   if(x.name.startsWith('.')||['node_modules','dist','vendor','build'].includes(x.name))continue;
   const item=path.join(dir,x.name);
   if(x.isDirectory())walk(item,level+1);
   else if(x.name==='index.html')htmls.push(item);
  }
 }
 walk(root);
 for(const file of htmls){
  const src=fs.readFileSync(file,'utf8');
  assert(!/class="mark"[^>]*>Y<\/span>/i.test(src),path.relative(root,file)+' retains old Y badge');
  if(src.includes('assets/favicon.svg'))assert(src.includes('assets/favicon.svg?v=20261031-yapsmile1'),
   path.relative(root,file)+' has stale favicon link');
 }
 const icon=fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8');
 assert(icon.includes('M169 302 Q256 403 343 302')&&!icon.includes('<text>Y</text>'),'favicon must use smiling face');
 assert(fs.readFileSync(path.join(app,'app/src/main/AndroidManifest.xml'),'utf8').includes('android:icon="@drawable/ic_yapthing_logo"'));
 assert(fs.existsSync(path.join(app,'app/src/main/res/drawable-nodpi/ic_yapthing_logo.png')));
 const ios=fs.readFileSync(path.join(app,'ios/ios/YapThing/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png'));
 assert.equal(ios.readUInt32BE(16),1024);assert.equal(ios.readUInt32BE(20),1024);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [1365,390]){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   const marks=await page.locator('.mark').evaluateAll(imgs=>imgs.map(img=>({tag:img.tagName,loaded:img.complete&&img.naturalWidth>0,src:img.getAttribute('src')})));
   assert.equal(marks.length,3,'home should have image brand in header, preview, footer');
   assert(marks.every(x=>x.tag==='IMG'&&x.loaded&&x.src.endsWith('yapthing-192.png')),JSON.stringify(marks));
   assert(await page.locator('a.brand').first().isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'homepage overflows width '+width);
   await page.goto(origin+'/support/',{waitUntil:'domcontentloaded'});
   const support=await page.locator('.brand .mark').evaluateAll(imgs=>imgs.map(img=>img.complete&&img.naturalWidth>0));
   assert.deepEqual(support,[true,true],'support brand images should load');
   await page.goto(origin+'/chat/',{waitUntil:'domcontentloaded'});
   const header=page.locator('.topline .yap-home-link img');
   assert(await header.count()===1,'chat header must use logo image');
   assert(await header.evaluate(img=>img.complete&&img.naturalWidth>0),'chat logo must load at '+width);
   if(width===390)await page.locator('#yap-desktop-menu > summary').click();
   assert(await page.locator('#account-toggle img').evaluate(img=>img.complete&&img.naturalWidth>0),'account logo should load');
   await page.close();
  }
  console.log('PASS smiling YapThing image: '+htmls.length+' website pages, favicon, wordmarks, chat, account, Android launcher, iOS icon, desktop/mobile browser.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err.stack||err);server.close();process.exitCode=1});
