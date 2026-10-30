'use strict';
(()=>{
const panel=document.getElementById('panel');if(!panel)return;
const state=document.getElementById('code-state'),facts=document.getElementById('code-facts'),refresh=document.getElementById('code-refresh');
let ready=false,busy=false;
async function updateCode(){
if(!ready||busy)return;busy=true;refresh.disabled=true;facts.replaceChildren();state.textContent='Checking public GitHub source...';
try{
const r=await fetch('https://api.github.com/repos/sharikhuddin/yapthing-website/commits/main',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(12000),cache:'no-store'});
if(!r.ok)throw Error('GitHub HTTP '+r.status+'; use the source and deployment links below.');
const d=await r.json();if(!/^[a-f0-9]{40}$/.test(d.sha))throw Error('Invalid repository response');
function fact(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;facts.append(dt,dd)}
fact('Latest source commit',d.sha.slice(0,12));fact('Change',d.commit?.message?.split('\n')[0]||'Unavailable');fact('Source commit date',d.commit?.committer?.date||'Unavailable');fact('Observed at',new Date().toLocaleString());fact('Production deploy', 'Not checked by this API. Review GitHub deployment logs.');
state.textContent='Public source loaded. Source commit is not proof of the deployed version.';
}catch(e){state.textContent='Code status unavailable: '+e.message}finally{busy=false;refresh.disabled=false}
}
refresh.addEventListener('click',updateCode);
window.addEventListener('yap-customer-summary',e=>{
const d=e.detail;
document.getElementById('biz-accounts').textContent=Number.isFinite(d.total)?d.total.toLocaleString():'Unavailable';
document.getElementById('biz-new').textContent=Number.isFinite(d.new7)?d.new7.toLocaleString():'Unavailable';
document.getElementById('biz-observed').textContent='Account directory observed '+new Date(d.observedAt).toLocaleString()+'. These totals are not revenue or active-user measures.';
});
window.addEventListener('yap-customer-error',()=>{
for(const id of ['biz-accounts','biz-new'])document.getElementById(id).textContent='Unavailable';
document.getElementById('biz-observed').textContent='Directory refresh failed. No current customer totals are available.';
});
function start(){if(ready)return;ready=true;updateCode()}
window.addEventListener('yap-admin-ready',start);
if(!panel.hidden)start();
})();
