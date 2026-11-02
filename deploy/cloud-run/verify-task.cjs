'use strict';
// First-stage Cloud Run Job: validates trusted YapCode code only.
// Deliberately accepts no arbitrary shell commands, repositories or secrets.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const maxMs=Number(process.env.YAPCODE_TIMEOUT_MS||60000);
if(!Number.isInteger(maxMs)||maxMs<1000||maxMs>120000)throw Error('Invalid timeout');
const checks=[
 ['syntax',['--check','chat/yap-media-policy.js']],
 ['regression',['--test','tests/yap-media-policy.cjs']]
];
const results=checks.map(([name,args])=>{
 const r=spawnSync(process.execPath,args,{cwd:process.cwd(),timeout:maxMs,encoding:'utf8',maxBuffer:65536,windowsHide:true});
 return {name,passed:r.status===0,exitCode:r.status,output:String((r.stdout||'')+'\n'+(r.stderr||'')).slice(-2500)};
});
const report={status:results.every(x=>x.passed)?'verified':'failed',at:new Date().toISOString(),results};
process.stdout.write(JSON.stringify(report)+'\n');
process.exitCode=report.status==='verified'?0:1;
