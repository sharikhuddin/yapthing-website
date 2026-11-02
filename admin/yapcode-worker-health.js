'use strict';
(()=>{
 function init(){
 const panel=document.getElementById('panel');if(!panel)return;
 const section=document.createElement('section');section.id='yapcode-cloud-health';section.style.cssText='margin:20px 0;padding:18px;border:1px solid #b4babb;border-radius:14px';
 const title=document.createElement('h2');title.textContent='YapCode cloud worker · Free-tier monitoring';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Monitoring not connected — no CPU, memory, or billing measurements available.';
 const cpu=document.createElement('p'),memory=document.createElement('p'),risk=document.createElement('p');
 cpu.textContent='CPU: unavailable';memory.textContent='Memory: unavailable';risk.textContent='Cost risk: unknown — Google Cloud billing must be checked separately.';
 const btn=document.createElement('button');btn.type='button';btn.textContent='Refresh worker status';
 const info=document.createElement('small');info.textContent='Only verified telemetry is displayed. Alerts and budget controls must be configured in Google Cloud; this panel does not stop billing.';
 btn.onclick=async()=>{btn.disabled=true;try{if(!window.YapWebAccount?.getToken)throw Error('Sign in as administrator.');const token=await window.YapWebAccount.getToken();const resp=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yapcode-worker-health',{headers:{authorization:'Bearer '+token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},signal:AbortSignal.timeout(8000)});if(!resp.ok)throw Error('Cloud telemetry endpoint is not deployed.');const data=await resp.json();if(data?.status!=='active'||typeof data.cpu_percent!=='number'||typeof data.memory_percent!=='number'||!data.observed_at)throw Error('No verified worker measurements.');const age=Date.now()-Date.parse(data.observed_at);if(!Number.isFinite(age)||age<0||age>180000)throw Error('Worker telemetry is stale.');cpu.textContent='CPU: '+data.cpu_percent.toFixed(1)+'%';memory.textContent='Memory: '+data.memory_percent.toFixed(1)+'%';status.textContent='Worker active · last reading '+new Date(data.observed_at).toLocaleTimeString();risk.textContent='Resource alert: '+(data.cpu_percent>=80||data.memory_percent>=85?'HIGH usage':'Below resource warning thresholds')+'. Billing status not measured.';}catch(e){status.textContent='Monitoring unavailable: '+e.message;cpu.textContent='CPU: unavailable';memory.textContent='Memory: unavailable';risk.textContent='Cost risk: unknown — check Cloud Billing.';}finally{btn.disabled=false;}};
 section.append(title,status,cpu,memory,risk,btn,info);panel.prepend(section);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();