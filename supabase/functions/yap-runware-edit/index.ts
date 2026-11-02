// YapThing Runware: guarded background removal preview (not deployed automatically).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin="https://yapthing.com";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return reply(401,{error:"Sign in required"});
 const key=Deno.env.get("RUNWARE_API_KEY");
 if(!key)return reply(503,{error:"Runware provider not configured"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return reply(503,{error:"Authentication unavailable"});
 const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await sb.auth.getUser(auth.slice(7));
 if(error||!user)return reply(401,{error:"Invalid session"});
 let body;
 try{body=await req.json()}catch{return reply(400,{error:"Invalid JSON"})}
 const encoded=body?.imageBase64,preset=body?.skill||"remove-background";
 if(preset!=="remove-background")return reply(400,{error:"This Runware skill is not enabled yet"});
 if(typeof encoded!=="string"||encoded.length<100||encoded.length>1_750_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return reply(400,{error:"Image must be valid JPEG base64 under 1.3MB"});
 // Atomic per-user daily allowance to bound costs and concurrency; deny if database migration is missing.
 const {data:allowed,error:quotaError}=await sb.rpc("yap_claim_runware_edit",{p_limit:2});
 if(quotaError||allowed!==true)return reply(429,{error:"Daily photo-edit limit reached or quota unavailable"});
 const invoke=async(tasks:unknown[])=>{
  const response=await fetch("https://api.runware.ai/v1",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(tasks),signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(!response.ok||result.error||!result.data?.length)throw Error("Runware request failed");
  return result.data;
 };
 try{
  const upload=await invoke([{taskType:"mediaStorage",taskUUID:crypto.randomUUID(),operation:"upload",media:"data:image/jpeg;base64,"+encoded}]);
  const mediaUUID=upload[0]?.mediaUUID;
  if(!mediaUUID)throw Error("Runware upload returned no media");
  const edited=await invoke([{taskType:"removeBackground",taskUUID:crypto.randomUUID(),model:"runware:112@10",inputs:{image:mediaUUID},includeCost:true}]);
  const imageURL=edited[0]?.imageURL;
  if(typeof imageURL!=="string"||!imageURL.startsWith("https://im.runware.ai/"))throw Error("Runware returned no valid image URL");
  const imgResponse=await fetch(imageURL,{signal:AbortSignal.timeout(20000)});
  if(!imgResponse.ok)throw Error("Edited image could not be retrieved");
  const bytes=new Uint8Array(await imgResponse.arrayBuffer());
  if(bytes.length>5_000_000)throw Error("Edited image too large");
  let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return reply(200,{imageBase64:btoa(binary),mimeType:"image/png",skill:preset,cost:edited[0]?.cost??null});
 }catch(e){console.error("Runware processing failed",String(e));return reply(502,{error:"Photo processing failed; please try later"})}
});
