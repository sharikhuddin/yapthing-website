// YapThing plan and prepaid-credit purchasing. Payments are never activated by a redirect.
'use strict';
(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const feedback=document.getElementById('billing-feedback');
 const planEl=document.getElementById('account-plan');
 const balanceEl=document.getElementById('credit-balance');
 const buttons=[...document.querySelectorAll('[data-plan],[data-pack]'),document.getElementById('manage-billing')].filter(Boolean);
 let plan='free',billingBusy=false;
 const session=()=>{
  try{return JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null')?.access_token||''}
  catch{return ''}
 };
 const update=async()=>{
  const token=session();
  if(!token){
   planEl.textContent='Sign in to see your plan.';
   balanceEl.textContent='Sign in to see your Yap Credits balance.';
   return;
  }
  try{
   const r=await window.YapSession.authFetch(base+'yap-plan-status',{headers:{authorization:'Bearer '+token}});
   if(!r.ok)throw Error('Plan status unavailable');
   const info=await r.json();
   plan=['free','plus','pro'].includes(info.plan)?info.plan:'free';
   planEl.textContent='Your plan: '+plan.toUpperCase()+' · '+String(info.status||'inactive')+
    (info.period_end?' · Renews/expires '+new Date(info.period_end).toLocaleDateString():'');
   if(plan==='plus'){
    const b=document.querySelector('[data-plan="pro"]');
    if(b)b.textContent='Upgrade Plus to Pro · $12.99/mo';
   }
   if(plan==='pro'){
    const b=document.querySelector('[data-plan="pro"]');
    if(b)b.textContent='Manage current Pro plan';
   }
  }catch(e){planEl.textContent=e.message||'Unable to load plan'}
  try{
   const r=await window.YapSession.authFetch(base+'yap-quota-status',{headers:{authorization:'Bearer '+token}});
   if(!r.ok)throw Error('Balance temporarily unavailable');
   const data=await r.json();
   const credits=Number(data.prepaid?.credits);
   balanceEl.textContent='Available prepaid Yap Credits: '+(Number.isFinite(credits)?credits.toLocaleString():'unavailable');
  }catch(e){balanceEl.textContent=e.message||'Credit balance unavailable'}
 };
 const safeTarget=value=>{
  try{
   const u=new URL(value);
   if(u.protocol==='https:'&&
      (u.hostname==='checkout.stripe.com'||u.hostname==='billing.stripe.com'||
       (u.hostname==='yapthing.com'&&u.pathname==='/plans/')))return u.href;
  }catch{}
  throw Error('Unexpected checkout destination');
 };
 const billing=async(action,selection)=>{
  if(billingBusy)return;
  const token=session();
  if(!token){
   feedback.textContent='Please sign in to YapThing before choosing a plan or buying credits.';
   return;
  }
  billingBusy=true;buttons.forEach(b=>b.disabled=true);
  feedback.textContent='Connecting to secure YapThing billing…';
  try{
   const payload={action};
   if(action==='checkout')payload.plan=selection;
   if(action==='topup')payload.pack=selection;
   const r=await window.YapSession.authFetch(base+'yap-stripe-checkout',{
    method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify(payload)
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||'Secure checkout is not yet available');
   if(!data.url)throw Error('Billing destination missing');
   if(action==='upgrade'&&data.pending_payment){
    feedback.textContent='Your upgrade is pending Stripe payment confirmation. Follow the invoice if provided; Pro will activate after payment.';
   }
   window.location.assign(safeTarget(data.url));
  }catch(e){
   feedback.textContent=e.message||'Secure checkout unavailable. No credit was purchased.';
   billingBusy=false;buttons.forEach(b=>b.disabled=false);
  }
 };
 for(const b of document.querySelectorAll('[data-plan]')){
  b.addEventListener('click',()=>{
   const next=b.dataset.plan;
   if(next==='pro'&&plan==='plus')return billing('upgrade');
   if(next===plan)return billing('portal');
   return billing('checkout',next);
  });
 }
 for(const b of document.querySelectorAll('[data-pack]')){
  b.addEventListener('click',()=>billing('topup',b.dataset.pack));
 }
 document.getElementById('manage-billing')?.addEventListener('click',()=>billing('portal'));
 const q=new URLSearchParams(location.search);
 if(q.get('checkout')==='success')feedback.textContent='Checkout returned. Your subscription activates after Stripe confirms payment.';
 if(q.get('checkout')==='cancel')feedback.textContent='Checkout canceled. Your plan and credits were not changed.';
 if(q.get('credits')==='pending')feedback.textContent='Payment is being confirmed. Purchased credits appear in your account once Stripe verifies payment.';
 if(q.get('upgrade')==='pending')feedback.textContent='Subscription upgrade is pending payment confirmation. Check your billing portal.';
 update();
})();
