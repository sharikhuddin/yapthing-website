'use strict';
const {spawnSync}=require('node:child_process');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,root=process.env.YAPCODE_REPO_ROOT;
if(!url||!/^https:\/\/[\w.-]+$/.test(url)||!key||!root)throw Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and YAPCODE_REPO_ROOT securely');
const worker=process.env.YAPCODE_WORKER_ID||'oracle-yapcode-1',base=url+'/rest/v1/yapcode_tasks';
const headers={apikey:key,authorization:'Bearer '+key,'content-type':'application/json',Prefer:'return=representation'};
async function req(method,query,body){const r=await fetch(base+query,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Supabase HTTP '+r.status);return r.json();}
async function tick(){const [t]=await req('GET','?select=id,attempts&status=eq.queued&order=created_at.asc&limit=1');if(!t)return;
const q='?id=eq.'+encodeURIComponent(t.id);
const claimed=await req('PATCH',q+'&status=eq.queued',{status:'claimed',attempts:t.attempts+1,worker_id:worker,updated_at:new Date().toISOString()});if(claimed.length!==1)return;
const p=spawnSync(process.execPath,['--test','tests/yap-media-policy.cjs'],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:131072,windowsHide:true});
const result={passed:p.status===0,exit:p.status,log:String((p.stdout||'')+'\n'+(p.stderr||'')).slice(-3000)};
await req('PATCH',q+'&status=eq.claimed&worker_id=eq.'+encodeURIComponent(worker),{status:result.passed?'verified-awaiting-approval':'failed',result,updated_at:new Date().toISOString()});console.log('Task',t.id,result.passed?'verified':'failed');}
(async()=>{for(;;){try{await tick();}catch(e){console.error(e.message);}await new Promise(r=>setTimeout(r,30000));}})();
