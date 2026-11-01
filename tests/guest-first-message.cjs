'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
 try{const p=new URL(req.url,'http://local').pathname,source=path.resolve(root,'.'+p),f=fs.statSync(source).isDirectory()?path.join(source,'index.html'):source;
 if(!f.startsWith(root))throw Error('bad route');res.setHeader('content-type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}
 catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:850}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapGuestConversion&&!!window.YapWebChat);
  assert.equal(await page.locator('#yap-guest-join').count(),0);
  await page.locator('#prompt').fill('Hi');
  assert(await page.locator('#send').isEnabled());
  await page.locator('#send').click();
  await page.waitForFunction(()=>window.YapWebChat.latest?.().includes('Yapper'));
  assert.match(await page.locator('#messages').innerText(),/Hey.*Yapper/);
  assert(await page.locator('#yap-guest-join').isVisible());
  await page.locator('#prompt').fill('How do I design a secure API?');
  await page.locator('#send').click();
  assert.equal(await page.locator('#prompt').inputValue(),'How do I design a secure API?');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapGuestConversion);
  assert(await page.locator('#yap-guest-join').isVisible());
  await page.locator('#prompt').fill('I want to create a new project');
  assert(await page.locator('#send').isEnabled());
  await page.locator('#send').click();
  assert(await page.locator('#yap-guest-join').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS first free greeting, visible signup, refresh stays editable '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
