'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+u),fp=fs.statSync(f).isDirectory()?path.join(f,'index.html'):f;if(!fp.startsWith(root))throw Error('bad');res.setHeader('content-type',fp.endsWith('.js')?'application/javascript':fp.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(fp));}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}}),page=await ctx.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(()=>localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'test-oauth',expires_at:4102444800})));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.route('**/functions/v1/yap-plugin-connections',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({providers:[{id:'gmail',status:'connected',connect_available:true},{id:'google-drive',status:'connected',connect_available:true}]})}));
  await page.route('**/functions/v1/yap-drive-files',async r=>{
   const body=JSON.parse(r.request().postData()||'{}');requests.push(body);
   if(body.action==='list')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({files:[{id:'fake-file-123',name:'YapThing project.txt',mimeType:'text/plain'}]})});
   if(body.action==='read')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({name:'YapThing project.txt',text:'Project document contents'})});
   if(body.action==='create')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,name:body.name+'.txt',id:'fake-file-new'})});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/plugins/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.YapPluginCenter?.apps().some(p=>p.id==='google-drive'&&p.status==='Connected'));
  const card=page.locator('#yap-connect-center .pc-card').filter({has:page.getByRole('heading',{name:'Google Drive'})});
  await card.getByRole('button',{name:'Open'}).click();
  await page.getByText('YapThing project.txt').waitFor();
  await page.getByRole('button',{name:'Read',exact:true}).click();
  await page.getByText('Project document contents').waitFor();
  assert(requests.some(x=>x.action==='list'));
  assert(requests.some(x=>x.action==='read'&&x.file_id==='fake-file-123'));
  assert.equal(await page.locator('#pc-dialog input[type="password"]').count(),0);
  await page.locator('#pc-dialog .pc-close').click();
  assert.deepEqual(errors,[]);
  console.log('PASS Gmail + Google Drive connected plugin UI '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});