const BASE=Deno.env.get("SUPABASE_URL")||"",ANON=Deno.env.get("SUPABASE_ANON_KEY")||"",ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const origins=new Set(["https://yapthing.com","https://www.yapthing.com","https://sharikhuddin.github.io"]);
const allowed=new Set(["academic","developer","live","source_read"]),outcomes=new Set(["started","success","failure","cached"]);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"",headers:Record<string,string>={"content-type":"application/json","cache-control":"no-store","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"GET,POST,OPTIONS"};
 if(origins.has(origin))headers["access-control-allow-origin"]=origin;
 const response=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return response(401,{error:"Sign in required"});
 const verified=await fetch(BASE+"/auth/v1/user",{headers:{authorization,apikey:ANON}}).catch(()=>null);
 if(!verified?.ok)return response(401,{error:"Invalid session"});
 const actor=await verified.json(),id=String(actor.id||"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return response(401,{error:"Invalid account"});
 const svc={apikey:ROLE,authorization:"Bearer "+ROLE,"content-type":"application/json"};
 const endpoint=BASE+"/rest/v1/yap_knowledge_activity";
 if(req.method==="POST"){
  const payload=await req.json().catch(()=>({}));
  if(!allowed.has(payload.event_type)||!outcomes.has(payload.outcome))return response(400,{error:"Unsupported activity event"});
  const duration=Number(payload.duration_ms||0);
  if(!Number.isFinite(duration)||duration<0||duration>180000)return response(400,{error:"Invalid duration"});
  const start=new Date(Date.now()-86400000).toISOString();
  const count=await fetch(endpoint+"?user_id=eq."+encodeURIComponent(id)+"&created_at=gte."+encodeURIComponent(start)+"&select=id",{headers:{...svc,prefer:"count=exact",Range:"0-0"}});
  if(!count.ok)return response(503,{error:"Activity metering unavailable"});
  const countHeader=count.headers.get("content-range")||"",n=Number(countHeader.split("/")[1]||0);
  if(n>=300)return response(429,{error:"Activity metering daily limit"});
  const saved=await fetch(endpoint,{method:"POST",headers:svc,body:JSON.stringify({user_id:id,event_type:payload.event_type,outcome:payload.outcome,duration_ms:Math.round(duration)})}).catch(()=>null);
  if(!saved?.ok)return response(503,{error:"Activity not saved"});
  return response(200,{ok:true});
 }
 if(req.method!=="GET")return response(405,{error:"Method not allowed"});
 if(actor.app_metadata?.yap_admin!==true)return response(403,{error:"Administrator role required"});
 const from=new Date(Date.now()-7*86400000).toISOString();
 const r=await fetch(endpoint+"?created_at=gte."+encodeURIComponent(from)+"&select=event_type,outcome,duration_ms,created_at&order=created_at.desc&limit=2000",{headers:svc}).catch(()=>null);
 if(!r?.ok)return response(503,{error:"Knowledge activity unavailable"});
 const rows=await r.json();const counts:Record<string,{total:number,success:number,failure:number,cached:number,durationSum:number,durationCount:number}>={};
 let success=0,failed=0,cached=0;
 const days:Record<string,number>={};
 const recent:unknown[]=[];
 for(const e of rows){
  const group=counts[e.event_type]||(counts[e.event_type]={total:0,success:0,failure:0,cached:0,durationSum:0,durationCount:0});
  group.total++;
  if(e.outcome==="success"){success++;group.success++}
  if(e.outcome==="failure"){failed++;group.failure++}
  if(e.outcome==="cached"){cached++;group.cached++}
  if(e.duration_ms>0){group.durationSum+=e.duration_ms;group.durationCount++}
  const day=String(e.created_at||"").slice(0,10);days[day]=(days[day]||0)+1;
  if(recent.length<15)recent.push({event_type:e.event_type,outcome:e.outcome,duration_ms:e.duration_ms,created_at:e.created_at});
 }
 const routes=Object.entries(counts).map(([name,v])=>({route:name,events:v.total,success:v.success,failed:v.failure,cached:v.cached,avg_ms:v.durationCount?Math.round(v.durationSum/v.durationCount):null}));
 return response(200,{source:"client-reported YapKnowledge events recorded by server",window:"last_7_days",sampleLimited:rows.length===2000,total:rows.length,success,failed,cached,routes,days,recent,asOf:new Date().toISOString(),privacy:"No prompts, queries or source contents are collected."});
});