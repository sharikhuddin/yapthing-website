const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let file=path.join(root,decodeURIComponent(pathname));
  if(!file.startsWith(root))throw Error('invalid path');
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const ext=path.extname(file);
  res.setHeader('Content-Type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.svg'?'image/svg+xml':'text/html');
  res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const width of [390,1280]){
   const ctx=await browser.newContext({viewport:{width,height:844}});
   const page=await ctx.newPage(),errors=[],jobs=new Map(),writes=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
   await page.route('**/functions/v1/yap-work',async route=>{
    const req=route.request().postDataJSON(),kind=req.task?.kind;
    let out;
    if(req.action==='devices')out={devices:[{id:'testDevice',name:'Test PC',online:true}]};
    else if(req.action==='quote'){
     const cost={inspect:0,local_models:0,read:0,draft_project:5,write:2,check:1,github_diff:0,github_pr:3}[kind];
     assert(cost!==undefined,'unexpected kind '+kind);
     const id=req.request_id,job={id,kind,payload:req.task,approval_hash:'test-hash',status:'quoted',cost};
     jobs.set(id,job);out={job};
    }else if(req.action==='approve'){
     const task=jobs.get(req.id);assert(task,'missing job');
     const info=task.payload;
     let data;
     switch(task.kind){
      case 'local_models':data={models:[{name:'qwen-code-local'}]};break;
      case 'inspect':data={entries:[{name:'src',type:'folder'}]};break;
      case 'read':data={path:info.path,content:'const total = 1;'};break;
      case 'draft_project':data={summary:'Change file and add style.',files:[{path:'src/main.js',content:'const total = 2;',expectedSha:'a'.repeat(64)},{path:'src/style.css',content:'body {color: green}',expectedSha:'missing'}]};break;
      case 'write':writes.push(info);data={path:info.path,sha256:'b'.repeat(64),message:'Saved'};break;
      case 'check':data={output:'PASS 2 tests'};break;
      case 'github_diff':data={head:'c'.repeat(40),files:[{path:'src/main.js',sha256:'b'.repeat(64)}],diff:'diff --git a/src/main.js b/src/main.js'};break;
      case 'github_pr':data={url:'https://github.com/example/repo/pull/1'};break;
     }
     out={job:{...task,status:'completed',result:{ok:true,data}}};
    }else if(req.action==='cancel')out={job:{...jobs.get(req.id),status:'canceled'}};
    else out={error:'Unexpected '+req.action};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/chat/');
   await page.waitForFunction(()=>!!window.YapCode && !!window.YapWorkHub);
   await page.evaluate(()=>{
    window.YapWebAccount.getUserId=()=> 'test-user';
    window.YapWebAccount.getToken=async()=> 'test-token';
    window.YapWebAccount.authFetch=window.fetch.bind(window);
    window.YapCode.open('Fix the dashboard and add a responsive stylesheet.');
   });
   await page.locator('#yapcode-dialog').waitFor({state:'visible'});
   assert.equal(await page.locator('#yc-prompt').inputValue(),'Fix the dashboard and add a responsive stylesheet.');
   await page.locator('[data-yc=devices]').click();
   await page.locator('#yc-device').selectOption('testDevice');
   await page.locator('#yc-root').fill('C:\\Projects\\example');
   await page.locator('[data-yc=models]').click();
   await page.locator('#yc-model').selectOption('qwen-code-local');
   await page.locator('#yc-paths').fill('src/main.js');
   await page.locator('[data-yc=draft]').click();
   await page.locator('#yc-review-cost').getByText('5 Work credits',{exact:false}).waitFor();
   assert.equal(writes.length,0);
   await page.locator('#yc-review [data-yc=approve]').click();
   await page.locator('#yc-draft-section').waitFor({state:'visible'});
   assert.equal(await page.locator('.yc-files button').count(),2);
   await page.locator('[data-yc=read-diff]').click();
   await page.locator('#yc-diff').getByText('- const total = 1;', {exact:false}).waitFor();
   await page.locator('[data-yc=write]').click();
   await page.locator('#yc-review-cost').getByText('2 Work credits',{exact:false}).waitFor();
   assert.equal(writes.length,0);
   await page.locator('#yc-review [data-yc=approve]').click();
   await page.locator('.yc-files button').first().getByText('Applied',{exact:false}).waitFor();
   assert.equal(writes.length,1);
   await page.locator('[data-yc=check]').click();
   await page.locator('#yc-review [data-yc=approve]').click();
   await page.locator('#yc-status').getByText('successfully',{exact:false}).waitFor();
   await page.locator('#yc-repo').fill('example/repo');
   await page.locator('#yc-pr-title').fill('Improve responsive dashboard');
   await page.locator('[data-yc=diff]').click();
   await page.locator('#yc-status').getByText('diff reviewed',{exact:false}).waitFor();
   await page.locator('[data-yc=pr]').click();
   await page.locator('#yc-review-cost').getByText('3 Work credits',{exact:false}).waitFor();
   await page.locator('#yc-review [data-yc=approve]').click();
   await page.locator('#yc-status').getByText('Draft PR created',{exact:false}).waitFor();
   await page.evaluate(()=>{
    window.YapWebAccount.getUserId=()=> '';
    window.dispatchEvent(new Event('yap:session-change'));
   });
   assert.equal(await page.locator('#yc-prompt').inputValue(),'');
   assert.equal(await page.locator('#yc-root').inputValue(),'');
   assert.equal(await page.locator('#yc-draft-section').isVisible(),false);
   const metrics=await page.locator('#yapcode-dialog').boundingBox();
   assert(metrics.width<=width,'YapCode dialog overflows viewport');
   assert.deepEqual(errors,[]);
   console.log('PASS YapCode approvals, draft, edit, check, PR, logout at '+width+'px');
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
