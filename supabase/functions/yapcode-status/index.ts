// YapCode private-testing availability endpoint. No task dispatcher or billing.
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"https://yapthing.com","vary":"Origin"}});
Deno.serve(async req=>{
 if(req.method!=="GET")return json({error:"GET required"},405);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return json({error:"Authentication required"},401);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY");
 if(!base||!key)return json({error:"Authentication configuration unavailable"},503);
 const r=await fetch(base+"/auth/v1/user",{headers:{"authorization":auth,"apikey":key},signal:AbortSignal.timeout(5000)}).catch(()=>null);
 if(!r?.ok)return json({error:"Invalid session"},401);
 return json({feature:"yapcoding",stage:"private-testing",payments_enabled:false,automatic_cloud_execution_enabled:false,task_submission_enabled:false,work_usage_enabled:true,notice:"YapCoding cloud automation is not yet available. Local Work tools may remain available under their own usage limits."});
});