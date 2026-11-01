'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const form=$('uuid-lookup-form'),panel=$('panel');
 if(!form||!panel)return;
 const email=$('uuid-lookup-email'),submit=$('uuid-lookup-submit'),status=$('uuid-lookup-status');
 const result=$('uuid-lookup-result'),uuid=$('uuid-lookup-value'),matched=$('uuid-lookup-matched-email');
 const copy=$('uuid-lookup-copy'),override=$('uuid-lookup-override');
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-admin-customers';
 const KEY='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 const clear=()=>{result.hidden=true;uuid.value='';matched.textContent='';copy.disabled=true;override.disabled=true;};
 const message=text=>{status.textContent=text;};
 let busy=false,requestId=0;
 const validUUID=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
 email.addEventListener('input',()=>{requestId++;clear();message('Enter a registered email and select Find UUID.');});
 async function find(){
  if(busy)return;
  clear();
  const q=email.value.trim().toLowerCase();
  if(q.length>120||q.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)){
   message('Enter a valid registered email address (up to 120 characters).');email.focus();return;
  }
  const session=(()=>{try{return JSON.parse(localStorage.getItem('yapthing.web.session.v1')||'null')}catch{return null}})();
  if(panel.hidden||!session?.access_token){message('Sign in with your administrator account first.');return;}
  const ticket=++requestId;
  busy=true;submit.disabled=true;message('Looking up the exact email in registered accounts…');
  try{
   let customer=null,matchedCount=0;
   for(let page=1;page<=4;page++){
    const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
    let payload;
    try{
     const response=await fetch(BASE+'?q='+encodeURIComponent(q)+'&page='+page,{
      headers:{authorization:'Bearer '+session.access_token,apikey:KEY},
      cache:'no-store',signal:ctrl.signal
     });
     payload=await response.json().catch(()=>({}));
     if(!response.ok)throw Error(response.status===401||response.status===403?'Your admin session has expired or is not authorized.':payload.error||'Customer lookup unavailable.');
    }finally{clearTimeout(timeout)}
    if(ticket!==requestId)return;
    if(!Array.isArray(payload.customers))throw Error('Customer directory returned an invalid response.');
    matchedCount=Math.max(0,Number(payload.matched)||0);
    customer=payload.customers.find(u=>String(u.email||'').trim().toLowerCase()===q);
    if(customer||payload.customers.length===0||page*25>=matchedCount)break;
   }
   if(!customer){
    message(matchedCount>100?'Too many matching directory entries to verify this email. Contact support for manual review.':'No registered user was found for that exact email.');
    return;
   }
   if(!validUUID(String(customer.id||'')))throw Error('The account returned an invalid UUID.');
   uuid.value=customer.id;matched.textContent='Exact email match: '+customer.email;
   result.hidden=false;copy.disabled=false;override.disabled=false;
   message('Account found. You can copy the UUID or use it in Plan Overrides.');
  }catch(error){
   if(ticket!==requestId)return;
   const msg=error?.name==='AbortError'?'Lookup timed out. Try again.':String(error?.message||'Lookup unavailable.').slice(0,200);
   message(msg);
  }finally{busy=false;submit.disabled=false;}
 }
 form.addEventListener('submit',event=>{event.preventDefault();find();});
 copy.addEventListener('click',async()=>{
  if(result.hidden||!validUUID(uuid.value))return;
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(uuid.value);
   message('UUID copied to clipboard.');
  }catch{
   uuid.focus();uuid.select();message('UUID selected. Copy it using Ctrl+C (or your device copy command).');
  }
 });
 override.addEventListener('click',()=>{
  if(result.hidden||!validUUID(uuid.value))return;
  const input=$('uid');if(!input){message('The Plan Override form is unavailable.');return;}
  input.value=uuid.value;
  $('result').textContent='Account UUID selected. Review the plan and status before applying any override.';
  window.YapAdminPages?.open?.('customers-access');
 });
})();
