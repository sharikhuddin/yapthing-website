'use strict';
(()=>{
 const panel=document.getElementById('panel'),button=document.getElementById('providers-refresh'),
  status=document.getElementById('providers-status'),grid=document.getElementById('providers-grid'),
  flags=document.getElementById('providers-flags');
 if(!panel||!button||!status||!grid||!flags)return;
 const entries=[
  {key:'openrouter',name:'OpenRouter',detail:'Low-cost chat model routing'},
  {key:'cerebras',name:'Cerebras',detail:'Fast everyday chat'},
  {key:'cloudflare',name:'Cloudflare',detail:'Gateway and optional Workers AI'},
  {key:'tavily',name:'Tavily',detail:'Live search'},
  {key:'exa',name:'Exa',detail:'Research-oriented search'},
  {key:'firecrawl',name:'Firecrawl',detail:'Web search and content retrieval'}
 ];
 let ready=false,busy=false;
 function show(info){
  grid.replaceChildren();
  for(const entry of entries){
   const card=document.createElement('article'),name=document.createElement('strong'),
    label=document.createElement('small');
   card.className='stat';
   name.textContent=entry.name;
   const present=info[entry.key]===true;
   label.textContent=(present?'Secret names detected':'Secret names missing')+' · '+entry.detail;
   card.append(name,label);
   grid.append(card);
  }
  const chat=info.chat_enabled===true,search=info.research_enabled===true;
  flags.textContent='Chat routing: '+(chat?'Enabled':'Off')+
   ' · Research routing: '+(search?'Enabled':'Off')+
   ' · Cloudflare model opt-in: '+(info.cloudflare_model===true?'Configured':'Not configured');
  status.textContent='Configuration names checked '+new Date().toLocaleString()+'. No chargeable requests were made.';
 }
 async function load(){
  if(!ready||busy)return;
  let token='';
  try{token=JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null')?.access_token||'';}catch{}
  if(!token){status.textContent='Sign in as an administrator to view connections.';return;}
  busy=true;button.disabled=true;status.textContent='Checking server-side provider configuration…';
  try{
   const r=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-provider-hub',{
    method:'GET',headers:{authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(14000)
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(typeof data.error==='string'?data.error:'Connection status unavailable');
   if(!data.configured||typeof data.configured!=='object')throw Error('Invalid provider status');
   show(data.configured);
  }catch(e){status.textContent='Unable to check provider connections: '+e.message;}
  finally{busy=false;button.disabled=false;}
 }
 button.addEventListener('click',load);
 function start(){if(ready)return;ready=true;load()}
 window.addEventListener('yap-admin-ready',start);
 if(!panel.hidden)start();
})();
