'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const code=fs.readFileSync(path.resolve(__dirname,'../chat/knowledge-router.js'),'utf8');
 try{for(const width of [390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:850}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html><body><div id="messages"><p><a href="https://en.wikipedia.org/wiki/Data_science">Data science</a></p></div><textarea id="prompt"></textarea></body></html>');
 await page.evaluate(()=>{
  window.YapWebAccount={getUserId:()=>window.__userId||'test-user'};
  window.__calls=[];
  window.YapResearchFallback={
   shouldSearch:q=>/current|latest|today/i.test(q),
   research:async(q,mode)=>{window.__calls.push(mode);return {answer:'[1] Source excerpt only',sources:[{title:'Source',url:'https://en.wikipedia.org/wiki/Data_science'}],provider:mode||'auto'};}
  };
 });
 await page.addScriptTag({content:code});
 assert.equal(await page.evaluate(()=>window.YapKnowledge.route('List my Supabase projects')),'supabase');
 assert.equal(await page.evaluate(()=>window.YapKnowledge.route('Find peer reviewed papers about ETL')),'academic');
 assert.equal(await page.evaluate(()=>window.YapKnowledge.route('Latest prices for GPUs')),'live');
 assert.equal(await page.evaluate(()=>window.YapKnowledge.route('Search GitHub repositories for ETL')),'github');
 assert.equal(await page.evaluate(()=>window.YapKnowledge.shouldSearch('github repo for data tools')),true);
 await page.evaluate(()=>window.YapKnowledge.research('Peer reviewed papers about ETL'));
 assert.deepEqual(await page.evaluate(()=>window.__calls),['public']);
 await page.evaluate(()=>window.YapKnowledge.research('Peer reviewed papers about ETL'));
 assert.deepEqual(await page.evaluate(()=>window.__calls),['public']);
 await page.evaluate(()=>{window.__userId='another-user'});
 await page.evaluate(()=>window.YapKnowledge.research('Peer reviewed papers about ETL'));
 assert.deepEqual(await page.evaluate(()=>window.__calls),['public','public']);
 await page.evaluate(()=>window.YapKnowledge.research('Latest prices for GPUs'));
 assert.deepEqual(await page.evaluate(()=>window.__calls),['public','public','auto']);
 const read=page.getByRole('button',{name:'Read source in YapThing'});
 assert.equal(await read.count(),1);
 await page.route('**/w/api.php?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{pages:{"12":{title:'Data science',extract:'Data science combines statistics and programming.'}}}})}));
 await read.click();
 await page.getByText('Data science combines statistics and programming.').waitFor();
 await page.getByRole('button',{name:'Discuss in YapThing'}).click();
 assert((await page.locator('#prompt').inputValue()).includes('Source: https://en.wikipedia.org/wiki/Data_science'));
 assert.deepEqual(errors,[]);
 console.log('PASS YapKnowledge source routes, account cache, safe reader, '+width+'px');
 await ctx.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});