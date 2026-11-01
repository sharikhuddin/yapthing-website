// YapThing billing v2: price-updated subscriptions, one-time prepaid credits,
// and Plus -> Pro upgrade on the *same* Stripe subscription.
const base=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",stripe=Deno.env.get("STRIPE_SECRET_KEY")||"";
const plus=Deno.env.get("STRIPE_PLUS_PRICE_ID")||"price_1UWjwrPOts9xDpaF48Twuy9H";
const pro=Deno.env.get("STRIPE_PRO_PRICE_ID")||"price_1UWjwuPOts9xDpaF6xQiYLi0";
const oldPlus="price_1UVdYMPOts9xDpaF7q9fcpuW",oldPro="price_1UVdYPPOts9xDpaFuIAicbUr";
const storagePrices:Record<string,string>={gb1:'price_1UWlqQPOts9xDpaFTcHpE5KX',gb5:'price_1UWlqTPOts9xDpaFdUDQH5qp'};
const packMap:Record<string,{price:string;credits:number}>={starter:{price:"price_1UWjxAPOts9xDpaFDscUSbpz",credits:100},boost:{price:"price_1UWjxIPOts9xDpaFyJXGkPjD",credits:300},power:{price:"price_1UWjxPPOts9xDpaFDp36pGlI",credits:750}};
const validOrigins=["https://yapthing.com","https://www.yapthing.com","https://sharikhuddin.github.io"];
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type J=Record<string,unknown>;
const safe=(s:unknown)=>String(s||"").slice(0,150);
async function spath(path:string,form?:URLSearchParams){
 const response=await fetch("https://api.stripe.com/v1/"+path,{
  method:form?"POST":"GET",
  headers:{authorization:"Bearer "+stripe,...(form?{"content-type":"application/x-www-form-urlencoded"}:{})},
  body:form,signal:AbortSignal.timeout(16000)
 });
 if(!response.ok)throw Error("stripe_http_"+response.status);
 return await response.json();
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const headers:Record<string,string>={"content-type":"application/json","cache-control":"no-store",
  "access-control-allow-headers":"authorization,apikey,content-type",
  "access-control-allow-methods":"POST,OPTIONS"};
 if(validOrigins.includes(origin))headers["access-control-allow-origin"]=origin;
 const out=(code:number,x:unknown)=>new Response(JSON.stringify(x),{status:code,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return out(405,{error:"POST required"});
 // Payments are deliberately hard-disabled for the testing release.
 const paymentsEnabled=false;
 if(!paymentsEnabled)return out(503,{error:"Payments are disabled during testing. No payment has been taken.",code:"PAYMENTS_DISABLED"});
 if(!stripe.startsWith("sk_live_")||!service||!base||!anon)return out(503,{
  error:"Secure web checkout is being connected. No payment has been taken.",code:"BILLING_NOT_LIVE"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer \S+$/.test(bearer))return out(401,{error:"Sign in first"});
 const input=await req.text().catch(()=>"");
 if(input.length>2000)return out(413,{error:"Request too large"});
 let body:J;
 try{body=JSON.parse(input)}catch{return out(400,{error:"Invalid request"})}
 const action=String(body.action||"");
 const plan=String(body.plan||"");
 if(!["checkout","portal","upgrade","topup","storage"].includes(action))return out(400,{error:"Unsupported action"});
 if(action==="checkout"&&!["plus","pro"].includes(plan))return out(400,{error:"Choose Plus or Pro"});
 const selected=packMap[String(body.pack||"")];
 if(action==="topup"&&!selected)return out(400,{error:"Unknown credit pack"});
 if(action==="storage"&&!storagePrices[String(body.tier||"")])return out(400,{error:"Unknown storage tier"});
 try{
  const auth=await fetch(base+"/auth/v1/user",{
   headers:{authorization:bearer,apikey:anon},signal:AbortSignal.timeout(9000)});
  if(!auth.ok)return out(401,{error:"Invalid session"});
  const user=await auth.json(),uid=String(user.id||"");
  if(!id.test(uid))return out(401,{error:"Invalid account"});
  const h={apikey:service,authorization:"Bearer "+service,"content-type":"application/json"};
  if(action==="checkout"||action==="upgrade"){
   const current=await fetch(base+"/rest/v1/yap_entitlements?user_id=eq."+uid+"&select=plan,status,source,period_end",{
    headers:h,signal:AbortSignal.timeout(9000)
   });
   if(!current.ok)return out(503,{error:"Unable to verify current subscription"});
   const ent=(await current.json())[0];
   const active=ent&&["active","trialing"].includes(ent.status)&&
    (!ent.period_end||Date.parse(ent.period_end)>Date.now());
   if(active&&["apple","google_play"].includes(ent.source))
    return out(409,{error:"Your subscription is managed through Apple or Google Play. Upgrade through your phone's subscription settings to avoid duplicate charges.",code:"STORE_SUBSCRIPTION"});
  }
  const mapping=await fetch(base+"/rest/v1/yap_stripe_customers?user_id=eq."+uid+"&select=stripe_customer_id",{
   headers:h,signal:AbortSignal.timeout(9000)});
  if(!mapping.ok)return out(503,{error:"Billing account temporarily unavailable"});
  let customer=String((await mapping.json())[0]?.stripe_customer_id||"");
  if(!customer&&action==="portal")return out(404,{error:"No web subscription found"});
  if(!customer){
   const c=await spath("customers",new URLSearchParams({
    email:String(user.email||""),"metadata[yap_user_id]":uid
   }));
   customer=String(c.id||"");
   if(!customer.startsWith("cus_"))return out(503,{error:"Unable to create billing account"});
   const save=await fetch(base+"/rest/v1/yap_stripe_customers?on_conflict=user_id",{
    method:"POST",headers:{...h,prefer:"resolution=merge-duplicates"},
    body:JSON.stringify({user_id:uid,stripe_customer_id:customer}),signal:AbortSignal.timeout(9000)});
   if(!save.ok)return out(503,{error:"Unable to link billing account"});
  }
  const portal=async()=>{
   const r=await spath("billing_portal/sessions",new URLSearchParams({
    customer,return_url:"https://yapthing.com/plans/"
   }));
   return out(200,{url:r.url,kind:"portal"});
  };
  if(action==="portal")return await portal();
  if(action==="topup"){
   // One-time web checkout only. Mobile apps must use their own platform-approved IAP packages.
   const f=new URLSearchParams({mode:"payment",customer,
    "line_items[0][price]":selected.price,"line_items[0][quantity]":"1",
    client_reference_id:uid,
    "metadata[yap_user_id]":uid,"metadata[yap_pack]":String(body.pack),
    "metadata[yap_credits]":String(selected.credits),
    success_url:"https://yapthing.com/plans/?credits=pending",
    cancel_url:"https://yapthing.com/plans/?checkout=cancel"});
   const checkout=await spath("checkout/sessions",f);
   return out(200,{url:checkout.url,kind:"topup",credits:selected.credits});
  }
  if(action==="storage"){
   const subs=await spath("subscriptions?customer="+encodeURIComponent(customer)+"&status=all&limit=50");
   const existingStorage=(subs.data||[]).filter((s:J)=>["active","trialing","past_due"].includes(String(s.status))&&
    (s.items?.data||[]).some((item:J)=>Object.values(storagePrices).includes(String(item.price?.id||""))));
   if(existingStorage.length)return await portal(); // Upgrade/cancel through Stripe billing; prevent duplicates.
   const tier=String(body.tier),f=new URLSearchParams({
    mode:"subscription",customer,client_reference_id:uid,
    "line_items[0][price]":storagePrices[tier],"line_items[0][quantity]":"1",
    success_url:"https://yapthing.com/plans/?storage=pending",
    cancel_url:"https://yapthing.com/plans/?checkout=cancel",
    "subscription_data[metadata][yap_user_id]":uid,
    "subscription_data[metadata][yap_storage_tier]":tier
   });
   const checkout=await spath("checkout/sessions",f);
   return out(200,{url:checkout.url,kind:"storage",tier});
  }
  const subscriptions=await spath("subscriptions?customer="+encodeURIComponent(customer)+"&status=all&limit=20");
  const active=(subscriptions.data||[]).filter((s:J)=>["active","trialing","past_due"].includes(String(s.status))&&
   (s.items?.data||[]).some((item:J)=>[plus,pro,oldPlus,oldPro].includes(String(item.price?.id||""))));
  if(active.length>1)return out(409,{error:"Multiple subscriptions detected. Manage them in billing.",code:"DUPLICATE_SUBSCRIPTIONS"});
  const existing=active[0];
  if(action==="upgrade"){
   if(!existing)return out(409,{error:"Subscribe to Plus first, or select Pro directly."});
   const item=existing.items?.data?.[0];
   const current=String(item?.price?.id||"");
   if(![oldPlus,plus].includes(current))return out(409,{error:"Only Plus subscribers can upgrade to Pro"});
   if(!item?.id)return out(503,{error:"Subscription item unavailable"});
   const f=new URLSearchParams({
    "items[0][id]":String(item.id),"items[0][price]":pro,"items[0][quantity]":"1",
    "proration_behavior":"always_invoice","payment_behavior":"pending_if_incomplete",
    "metadata[yap_plan]":"pro","metadata[yap_user_id]":uid
   });
   const changed=await spath("subscriptions/"+encodeURIComponent(String(existing.id)),f);
   const latest=changed.latest_invoice;
   let payUrl="";
   if(typeof latest==="object"&&latest)payUrl=String(latest.hosted_invoice_url||"");
   return out(200,{upgrade:true,pending_payment:!!changed.pending_update,
    status:safe(changed.status),url:payUrl||"https://yapthing.com/plans/?upgrade=pending",
    message:"Pro activates when Stripe confirms payment; no second subscription created."});
  }
  if(existing)return await portal(); // Never create a second subscription for current paying customers.
  const f=new URLSearchParams({
   mode:"subscription",customer,client_reference_id:uid,
   "line_items[0][price]":plan==="plus"?plus:pro,"line_items[0][quantity]":"1",
   success_url:"https://yapthing.com/plans/?checkout=success",
   cancel_url:"https://yapthing.com/plans/?checkout=cancel",
   "subscription_data[metadata][yap_user_id]":uid,
   "subscription_data[metadata][yap_plan]":plan
  });
  const checkout=await spath("checkout/sessions",f);
  return out(200,{url:checkout.url,kind:"subscription"});
 }catch(e){
  console.error(JSON.stringify({event:"yap_billing_action_failed",action,reason:e instanceof Error?e.message:"unknown"}));
  return out(503,{error:"Secure billing temporarily unavailable; no changes were confirmed."});
 }
});
