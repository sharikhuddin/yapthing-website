'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const uri=new URL(req.url,'http://localhost'),name=path.resolve(root,'.'+uri.pathname),file=fs.statSync(name).isDirectory()?path.join(name,'index.html'):name;if(!file.startsWith(root))throw Error('Invalid');res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const width of [390,1280]){
   const ctx=await browser.newContext({viewport:{width,height:820},permissions:['clipboard-read','clipboard-write']});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.YapComputerSetup&&!!window.YapNoAdminSetup);
   await page.evaluate(()=>window.YapComputerSetup.open());
   const modal=page.locator('#yap-computer-setup');
   await modal.getByRole('button',{name:'No admin / Node missing'}).click();
   assert.equal(await modal.locator('#ycs-portable').count(),0);
   const portable=page.locator('#ycs-noadmin .ycs-portable');
   assert.equal(await portable.isVisible(),true);
   assert.equal(await portable.locator('a[download]').getAttribute('href'),'/desktop/YapThing-Computer-NoAdmin.cmd?v=20261101-portable2');
   await portable.getByRole('button',{name:'Copy download command'}).click();
   const copied=await page.evaluate(()=>navigator.clipboard.readText());
   assert(copied.includes('Invoke-WebRequest')&&copied.includes('YapThing-Computer-NoAdmin.cmd'));
   assert(!copied.includes('iex'));
   await modal.getByRole('button',{name:'No administrator rights'}).click();
   assert((await modal.locator('#ycs-help').innerText()).includes('organization policy'));
   await modal.getByRole('button',{name:'Company policy blocked'}).click();
   assert((await modal.locator('#ycs-help').innerText()).includes('No compliant software bypass'));
   const rect=await modal.boundingBox();assert(rect&&rect.width<=width,'Modal overflows viewport');
   await modal.getByRole('button',{name:'Close computer setup'}).click();
   await page.locator('#prompt').fill('Help me connect my computer without admin rights');
   await page.locator('#form').evaluate(f=>f.requestSubmit());
   await page.waitForFunction(()=>document.querySelector('#yap-computer-setup')?.open);
   assert((await page.locator('#messages').innerText()).includes('No admin / Node missing'));
   assert.deepEqual(errors,[]);
   console.log('PASS browser no-admin portable launcher and chat guidance '+width+'px');
   await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:1280,height:820}}),page=await ctx.newPage();
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/desktop/');
  assert(await page.getByRole('link',{name:'Download No-Admin Windows launcher'}).count()===1);
  await page.waitForFunction(()=>!!window.YapNoAdminSetup);
  await page.getByRole('button',{name:'Connect computer'}).click();
  await page.getByRole('button',{name:'No admin / Node missing'}).click();
  assert.equal(await page.locator('#ycs-noadmin .ycs-portable').isVisible(),true);
  const response=await page.request.get('http://127.0.0.1:'+server.address().port+'/desktop/YapThing-Computer-NoAdmin.cmd');
  assert.equal(response.status(),200);
  const cmd=await response.text();
  for(const required of ['latest-v24.x','SHASUMS256.txt','Get-FileHash','Expand-Archive','choice /c YN','npx.cmd @wonderwhy-er/desktop-commander@latest remote'])assert(cmd.includes(required),required);
  assert(!cmd.includes('ExecutionPolicy Bypass')&&!cmd.includes('runas /user:')&&!cmd.includes('Set-ExecutionPolicy'));
  console.log('PASS desktop no-admin command and integrity checks');
  await ctx.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
