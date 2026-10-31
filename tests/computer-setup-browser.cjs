'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+url.pathname),f=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;if(!f.startsWith(root))throw Error('bad');res.setHeader('content-type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:820},permissions:['clipboard-read','clipboard-write']});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.YapComputerSetup&&window.YapCode&&window.YapWorkHub));
  await page.evaluate(()=>{
   window.YapWorkClient={account:()=>'',request:async()=>({})};
   window.YapComputerSetup.open();
  });
  const modal=page.locator('#yap-computer-setup');
  assert.equal(await modal.isVisible(),true);
  assert.equal(await modal.locator('#ycs-command').innerText(),'npx.cmd @wonderwhy-er/desktop-commander@latest remote');
  await modal.getByRole('button',{name:'Copy',exact:true}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'npx.cmd @wonderwhy-er/desktop-commander@latest remote');
  await modal.getByRole('button',{name:'Check connection'}).click();
  await modal.getByText(/Sign in to your YapThing account/).waitFor();
  await page.evaluate(()=>{
   window.YapWorkClient={account:()=> 'user-1', request:async(action)=>action==='status'?{connected:true}:action==='devices'?{devices:[{id:'a',name:'My desktop',online:true}]}:{authorization_url:'https://mcp.desktopcommander.app/authorize?state=test'}};
  });
  await modal.getByRole('button',{name:'Check connection'}).click();
  await modal.getByText(/1 computer online/).waitFor();
  await modal.getByText(/My desktop — Online/).waitFor();
  await modal.getByRole('button',{name:'Computer offline'}).click();
  await modal.getByText(/leave the PowerShell process open/).waitFor();
  const rect=await modal.boundingBox();assert(rect&&rect.width<=width);
  await modal.getByRole('button',{name:'Close computer setup'}).click();
  await page.locator('#prompt').fill('how can I troubleshoot my computer offline?');
  await page.locator('#form').evaluate(f=>f.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('#yap-computer-setup')?.open);
  assert((await page.locator('#messages').innerText()).includes('PowerShell process open'));
  assert.deepEqual(errors,[]);
  console.log('PASS guided computer setup, status, offline and chat help at '+width+'px');
  await ctx.close();
 }
 // Standalone desktop route also exposes the setup wizard.
 const context=await browser.newContext({viewport:{width:1280,height:840}}),page=await context.newPage();
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/desktop/');
 await page.waitForFunction(()=>Boolean(window.YapComputerSetup));
 await page.getByRole('button',{name:'Connect computer'}).click();
 assert.equal(await page.locator('#yap-computer-setup').isVisible(),true);
 console.log('PASS desktop setup page wizard');
 await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
