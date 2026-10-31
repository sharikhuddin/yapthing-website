'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 try{const target=new URL(req.url,'http://localhost').pathname;
  const file=path.join(site,target==='/'?'index.html':target);
  if(!file.startsWith(site))throw Error('bad path');
  const found=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
  res.setHeader('Content-Type',found.endsWith('.js')?'application/javascript':found.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(found));
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:820}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/');
  await page.waitForFunction(()=>!!window.YapCode&&!!window.YapWorkChat&&!!document.getElementById('yap-nav-primary'));
  const open=()=>page.locator('#yap-desktop-menu>summary').click();
  await page.evaluate(()=>{window.YapWebChat.newChat();window.YapWebChat.add('Navigation smoke test', 'user');});
  await open();
  const nav=page.locator('#yap-nav-primary');
  assert.equal(await nav.locator('button').count(),3);
  assert.deepEqual(await nav.locator('button').allTextContents(),['◻Chat','▤Projects','</>Code']);
  await page.locator('#yap-tool-menu .yap-nav-recents').getByText('Recents').waitFor();
  await page.locator('#yap-tool-menu #history').getByText('Navigation smoke test',{exact:false}).waitFor();
  await page.locator('#yap-nav-projects').click();
  assert.equal(await page.locator('#yap-nav-project-list').isVisible(),true);
  assert.equal(await page.locator('#yap-conversation-mode').inputValue(),'work');
  await page.locator('#yap-nav-project-list').getByRole('button',{name:/New project/}).click();
  await page.locator('.yap-project-editor').waitFor({state:'visible'});
  await page.locator('#yap-nav-code').click();
  await page.locator('#yapcode-dialog').waitFor({state:'visible'});
  await page.locator('#yapcode-dialog [data-yc=close]').click();
  await open();
  await page.locator('#yap-nav-chat').click();
  assert.equal(await page.locator('#yap-conversation-mode').inputValue(),'chat');
  assert.equal(await page.locator('#yap-desktop-menu').evaluate(x=>x.open),false);
  await open();
  await page.locator('#yap-tool-menu #history').getByText('Navigation smoke test',{exact:false}).click();
  assert.equal(await page.locator('#yap-desktop-menu').evaluate(x=>x.open),width===390?false:true);
  await openIfClosed(page);
  const rect=await page.locator('#yap-tool-menu').boundingBox();
  assert(rect && rect.width<=width,'sidebar must fit viewport');
  assert.deepEqual(errors,[]);
  console.log('PASS web navigation, projects, code, recents at '+width+'px');
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
async function openIfClosed(page){if(!await page.locator('#yap-desktop-menu').evaluate(x=>x.open))await page.locator('#yap-desktop-menu>summary').click();}
