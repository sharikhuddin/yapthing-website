'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const uid='11111111-1111-4111-8111-111111111111',env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server',YAP_OAUTH_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64')};
let status=200,mode='ok',calls=[],row;
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s});
async function fakeFetch(url,opts={}){
 calls.push({url:String(url),opts});
 if(String(url).endsWith('/auth/v1/user'))return mode==='unauth'?json({},401):json({id:uid});
 if(String(url).includes('/rest/v1/'))return json(mode==='missing'?[]:[row]);
 if(String(url).startsWith('https://api.supabase.com/v1/')){
  if(status!==200)return json({},status);
  return String(url).endsWith('/functions')?json([{name:'hello',slug:'hello',status:'ACTIVE',version:1}]):json([{id:'abcdefghijklmnopqrst',name:'Private project',region:'us-east-1',status:'ACTIVE',secret:'must-not-leak'}]);
 }
 throw Error('Unexpected network '+url);
}
const sandbox={Deno:{env:{get:n=>env[n]}},crypto,TextEncoder,TextDecoder,Uint8Array,Request,Response,AbortSignal,URLSearchParams,atob,btoa,fetch:fakeFetch};
vm.createContext(sandbox);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/yap-dev-read/index.ts','utf8')).replace('export async function handler','async function handler').replace('Deno.serve(handler);','')+';globalThis.run=handler',sandbox);
const request=body=>new Request('https://test/function',{method:'POST',headers:{authorization:'Bearer session',origin:'https://yapthing.com'},body:JSON.stringify(body)});
(async()=>{
 const key=await crypto.subtle.importKey('raw',Buffer.alloc(32,1),'AES-GCM',false,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('supabase-user-oauth'));
 row={encrypted_access_token:Buffer.from(cipher).toString('base64'),access_iv:Buffer.from(iv).toString('base64')};
 let r=await sandbox.run(request({provider:'supabase',action:'projects',user_id:'attacker'})),body=await r.json();assert.equal(r.status,200);assert.equal(body.projects[0].name,'Private project');assert(!JSON.stringify(body).includes('must-not-leak'));
 assert(calls.some(c=>c.url.includes('user_id=eq.'+uid)&&c.url.includes('provider=eq.supabase')));assert(!calls.some(c=>c.url.includes('attacker')));
 assert.equal(calls.at(-1).opts.headers.authorization,'Bearer supabase-user-oauth');assert.equal(calls.at(-1).opts.redirect,'error');
 r=await sandbox.run(request({provider:'supabase',action:'functions',project_ref:'abcdefghijklmnopqrst'}));assert.equal(r.status,200);assert.equal((await r.json()).functions[0].name,'hello');
 for(const project_ref of ['../secrets','https://evil.example','abc','abcdefghijklmnopqrst/../../']){calls=[];r=await sandbox.run(request({provider:'supabase',action:'functions',project_ref}));assert.equal(r.status,400);assert(!calls.some(c=>c.url.startsWith('https://api.supabase.com')));}
 for(const action of ['query','delete','deploy','secrets']){r=await sandbox.run(request({provider:'supabase',action}));assert.equal(r.status,400);}
 for(const [m,expected] of [['unauth',401],['missing',409]]){mode=m;calls=[];r=await sandbox.run(request({provider:'supabase',action:'projects'}));assert.equal(r.status,expected);assert(!calls.some(c=>c.url.startsWith('https://api.supabase.com')));}
 mode='ok';for(const n of [401,403,404,429,500]){status=n;r=await sandbox.run(request({provider:'supabase',action:'projects'}));assert.equal(r.status,({401:409,403:403,404:404,429:429,500:502})[n]);const e=await r.json();assert(e.code);assert(!e.error.includes('GitHub'));}
 status=200;row.access_expires_at='2020-01-01';r=await sandbox.run(request({provider:'supabase',action:'projects'}));assert.equal(r.status,409);
 console.log('PASS Supabase OAuth ownership/provider isolation, safe output, projects/functions, invalid refs, unsupported writes, auth, expiry and provider errors');
})().catch(e=>{console.error(e);process.exitCode=1});
