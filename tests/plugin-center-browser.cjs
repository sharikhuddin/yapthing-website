'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+name),final=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;if(!final.startsWith(root))throw Error('invalid');res.setHeader('content-type',final.endsWith('.js')?'application/javascript':final.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(final));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}});
  await ctx.addInitScript(()=>localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'test-access-token',expires_at:4102444800})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.route('**/functions/v1/yap-plugin-connections',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({providers:[{id:'gmail',status:'connected',connect_available:true}]})}));
  await page.route('**/functions/v1/yap-gmail-messages',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({messages:[{subject:'Sample inbox subject',from:'example@example.com',snippet:'This is a test.'}]})}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/plugins/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.YapPluginCenter)&&window.YapPluginCenter.apps().some(p=>p.id==='gmail'&&p.status==='Connected'));
  assert.equal(await page.locator('#yap-connect-center').isVisible(),true);
  assert.equal(await page.locator('#yap-connect-center .pc-card').count(),19);
  const gmail=page.locator('#yap-connect-center .pc-card').filter({has:page.getByRole('heading',{name:'Gmail'})});
  await gmail.getByRole('button',{name:'Open'}).click();
  await page.locator('#pc-dialog').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Read recent inbox'}).click();
  await page.getByText('Sample inbox subject',{exact:false}).waitFor();
  await page.locator('#pc-dialog .pc-close').click();
  await page.locator('#pc-search').fill('Crossref');
  assert.equal(await page.locator('#yap-connect-center .pc-card').count(),1);
  await page.locator('#pc-search').fill('');
  await page.getByRole('button',{name:'Coming soon',exact:true}).first().click();
  assert.equal(await page.locator('#yap-connect-center .pc-card').count(),11);
  const rect=await page.locator('#yap-connect-center').boundingBox();assert(rect&&rect.width<=width+1,'Plugin area wider than viewport');
  assert.deepEqual(errors,[]);
  console.log('PASS web plugin center and live-state mock '+width+'px');
  await ctx.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
