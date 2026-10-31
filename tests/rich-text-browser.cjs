'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const android=process.argv.includes('--android');
const root=path.resolve(__dirname,android?'../app/src/main/assets/www':'..');
const server=http.createServer((req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1').pathname,fp=path.resolve(root,'.'+url),target=fs.statSync(fp).isDirectory()?path.join(fp,'index.html'):fp;
 if(!target.startsWith(root))throw Error('Invalid path');
 const ext=path.extname(target);res.setHeader('content-type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.svg'?'image/svg+xml':ext==='.png'?'image/png':'text/html');
 res.end(fs.readFileSync(target));
}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const triple=String.fromCharCode(96).repeat(3);
 const sample=[
  '## Project summary',
  'A **clear answer** with *context* and '+String.fromCharCode(96)+'inline code'+String.fromCharCode(96)+'.',
  '',
  '### Practical steps',
  '1. Check **inputs**',
  '2. Run validation',
  '   - Include nested evidence',
  '   - Keep logs',
  '',
  '> Important: check results before deploying.',
  '',
  '| Step | Outcome |',
  '| --- | --- |',
  '| Read | Correct |',
  '| Deploy | Review |',
  '',
  triple+'python',
  'print("hello")',
  'const x = "<img src=x onerror=alert(1)>";',
  triple,
  '',
  'See source [1] and [docs](https://example.com/guide) for details.',
  '',
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '[evil](javascript:alert(1))'
 ].join('\n');
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1')?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+(android?'/index.html':'/chat/'),{waitUntil:'domcontentloaded',timeout:22000});
  await page.waitForFunction(()=>!!window.YapRichText&& (typeof renderMessages==='function'||!!window.YapWebChat),{timeout:17000});
  await page.evaluate(({sample,android})=>{
   if(android){current.messages=[{role:'user',text:'Review project'},{role:'thing',source:'ai',text:sample,sources:[{title:'Reference',url:'https://example.com/study'}]}];renderMessages();}
   else{window.YapWebChat.newChat();window.YapWebChat.add('Review project','user');window.YapWebChat.add(sample,'assistant',{sources:[{title:'Reference',url:'https://example.com/study'}]});}
  },{sample,android});
  // Verify real UI, not just an isolated parser.
  const prose=page.locator(android?'#messages .msg.thing .bubble.yap-prose':'#messages .message.yap-assistant-reply.yap-prose');
  await prose.waitFor({timeout:8000});
  if(!android)await page.evaluate(sample=>window.YapRichText.render(document.querySelector('#messages .message.yap-assistant-reply'),sample,{sources:[{title:'Reference',url:'https://example.com/study'}]}),sample);
  assert.equal(await prose.locator('h3').count(),1,'Markdown summary heading');
  assert(await prose.locator('h4').count()>=1,'Markdown subheading');
  assert.equal(await prose.locator('strong').count()>=2,true,'bold text');
  assert.equal(await prose.locator('em').count(),1,'italic text');
  assert.equal(await prose.locator('ol > li').count(),2,'numbered steps');
  assert(await prose.locator('ul > li').count()>=2,'nested bullet points');
  assert.equal(await prose.locator('blockquote').count(),1,'quote');
  assert.equal(await prose.locator('table tbody tr').count(),2,'table rows');
  assert.equal(await prose.locator('pre code').count(),1,'code');
  assert.equal(await prose.locator('.yp-copy').count(),1,'copy code button');
  assert.equal(await prose.locator('a[href="https://example.com/guide"]').count(),1,'safe link');
  const source=await prose.locator('a').allTextContents();
  assert(source.includes('[1]'),'citation link preserved');
  assert.equal(await prose.locator('script,img').count(),0,'model HTML must remain inert');
  assert((await prose.innerText()).includes('<script>alert(1)</script>'),'literal unsafe code displayed, not executed');
  assert(!await prose.locator('a[href^="javascript:"]').count(),'never create javascript links');
  assert((await prose.locator('pre code').innerText()).includes('print("hello")'));
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth);
  assert(overflow<=2,'horizontal page overflow '+overflow+'px');
  const css=await prose.evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,fontSize:getComputedStyle(el).fontSize}));
  assert.equal(css.whiteSpace,'normal','formatted paragraphs should not inherit pre-wrap');
  assert.deepEqual(errors,[],'JavaScript runtime errors');
  console.log('PASS '+(android?'Android':'Web')+' rich answer structure and safety '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});