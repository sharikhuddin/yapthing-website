'use strict';
// Local-only, resumable and review-first YapCode verification runner.
// Never executes model-proposed commands; only fixed test commands.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'.yapcode-tasks');
const checks=Object.freeze({syntax:['node','--check','chat/yap-media-policy.js'],policy:['node','--test','tests/yap-media-policy.cjs']});
function safeId(id){if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('Invalid task ID');return id;}
function load(id){return JSON.parse(fs.readFileSync(path.join(DIR,safeId(id)+'.json'),'utf8'));}
function save(task){fs.mkdirSync(DIR,{recursive:true});const file=path.join(DIR,safeId(task.id)+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(task,null,2));fs.renameSync(file+'.tmp',file);return task;}
function runCheck(name){const [exe,...args]=checks[name];const p=cp.spawnSync(exe,args,{cwd:ROOT,encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:1024*1024});return {check:name,passed:p.status===0,exit:p.status,summary:String((p.stdout||'')+'\n'+(p.stderr||'')).slice(-6000)};}
function main(){const [action,arg]=process.argv.slice(2);if(action==='new'){const task={id:crypto.randomUUID(),goal:String(arg||'').slice(0,1000),status:'awaiting-review',createdAt:new Date().toISOString(),attempts:0,checks:[],approvalRequired:true};if(task.goal.length<5)throw Error('Give a task goal (5+ characters)');save(task);console.log(JSON.stringify(task));return;}
if(action==='status'){console.log(JSON.stringify(load(arg),null,2));return;}
if(action==='verify'){const task=load(arg);if(task.attempts>=3)throw Error('Maximum verification attempts reached');task.attempts++;task.status='verifying';save(task);const result=Object.keys(checks).map(runCheck);task.checks.push({at:new Date().toISOString(),results:result});task.status=result.every(x=>x.passed)?'verified-awaiting-approval':'failed-review-required';save(task);console.log(JSON.stringify({id:task.id,status:task.status,checks:result},null,2));if(task.status!=='verified-awaiting-approval')process.exitCode=1;return;}
if(action==='list'){if(!fs.existsSync(DIR)){console.log('[]');return;}const tasks=fs.readdirSync(DIR).filter(x=>/^[0-9a-f-]{36}\.json$/i.test(x)).map(x=>JSON.parse(fs.readFileSync(path.join(DIR,x),'utf8'))).map(x=>({id:x.id,goal:x.goal,status:x.status}));console.log(JSON.stringify(tasks,null,2));return;}
throw Error('Usage: node scripts/yapcode-task-runner.cjs new "goal" | verify ID | status ID | list');}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
