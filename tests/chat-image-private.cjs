'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent((req.url||'/').split('?')[0]);if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,name.replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end('Missing')}
  res.writeHead(200,{'content-type':types[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(data)});
});
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const objects=new Map();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
   args:['--no-sandbox','--disable-gpu']});
  const context=await browser.newContext({viewport:{width:1150,height:800}});
  await context.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const url=route.request().url(),method=route.request().method();
   const match=url.match(/\/storage\/v1\/object\/(?:authenticated\/)?yap-chat-images\/(.+)$/);
   if(match){
    const key=decodeURIComponent(match[1]);
    if(method==='POST'){objects.set(key,route.request().postDataBuffer());return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({Key:key})})}
    if(method==='GET'){const blob=objects.get(key);return route.fulfill({status:blob?200:404,contentType:'image/jpeg',body:blob||''})}
    if(method==='DELETE'){objects.delete(key);return route.fulfill({status:200,contentType:'application/json',body:'{}'})}
   }
   if(url.includes('yap_shared_chat_threads'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   if(url.includes('yap_user_memory'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   if(url.includes('yap-quota-status'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   return route.fulfill({status:204,body:''});
  });
  const base='http://127.0.0.1:'+server.address().port+'/chat/';
  const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.YapImageStore&&!!window.YapWebChat,{timeout:15000});
  await page.evaluate(id=>window.YapSession.set({access_token:'test-a',user:{id,email:'x@example.com'},expires_at:Date.now()/1000+4000}),a);
  const media=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   canvas.getContext('2d').fillRect(0,0,640,480);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
   return window.YapImageStore.store(blob);
  });
  assert(media.imageKey.startsWith(a+'/'),'cached private key should include owner');
  assert(media.imagePath.startsWith(a+'/'),'cloud image must belong to owner');
  assert(objects.has(media.imagePath),'new image should have been uploaded');
  const loaded=await page.evaluate(async ref=>{
   const img=document.createElement('img');document.body.append(img);
   const finished=new Promise(resolve=>{img.addEventListener('load',()=>resolve(true),{once:true});img.addEventListener('error',()=>resolve(false),{once:true})});
   await window.YapImageStore.attach(img,ref);
   const ok=await finished;img.remove();return ok;
  },media);
  assert(loaded,'cached image should display correctly');
  const row={thread_id:'33333333-3333-4333-8333-333333333333',title:'Image message',
    updated_at:new Date().toISOString(),messages:[{role:'user',text:'My screenshot',imagePath:media.imagePath}]};
  const preserved=await page.evaluate(row=>{
   window.YapWebChat.mergeCloud([row]);
   return window.YapWebChat.snapshot()[0]?.messages[0]?.imagePath;
  },row);
  assert.equal(preserved,media.imagePath,'cloud chat history must retain image reference');
  await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=120;canvas.height=90;
   canvas.getContext('2d').fillRect(0,0,120,90);
   window.dispatchEvent(new CustomEvent('yap-edited-image',{detail:{url:canvas.toDataURL('image/png'),prompt:'Make this brighter'}}));
  });
  await page.waitForFunction(()=>window.YapWebChat.snapshot().some(chat=>chat.messages.some(m=>m.text==='Edited image ready.'&&m.imagePath)),{timeout:9000});
  const hasLargeBase64=await page.evaluate(()=>Object.keys(localStorage).some(k=>/yapthing\.web.*chat/.test(k)&&localStorage.getItem(k).includes('data:image/')));
  assert(!hasLargeBase64,'edited images should be stored as files, not Base64 in chat JSON');
  await page.evaluate(id=>window.YapSession.set({access_token:'test-b',user:{id,email:'b@example.com'},expires_at:Date.now()/1000+4000}),b);
  const denied=await page.evaluate(async ref=>{
   const img=document.createElement('img');document.body.append(img);
   await window.YapImageStore.attach(img,ref);const result=!img.hasAttribute('src');img.remove();return result;
  },media);
  assert(denied,'different account must not open another user local image cache');
  await page.evaluate(id=>window.YapSession.set({access_token:'test-a',user:{id,email:'x@example.com'},expires_at:Date.now()/1000+4000}),a);
  await page.evaluate(ref=>window.YapImageStore.removeMessages([ref]),media);
  assert(!objects.has(media.imagePath),'image deletion should clean cloud object');
  console.log('PASS private cloud image upload, device cache, chat metadata, cross-account denial, deletion');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close()});
