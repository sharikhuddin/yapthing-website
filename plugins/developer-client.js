'use strict';
/* YapThing developer API: read-only OAuth calls, per-account isolated on server. */
window.YapDeveloperClient=(()=>{
 const endpoint="https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-dev-read";
 const apikey="sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ";
 async function call(provider,action,params={}){
  const identity=window.YapWebAccount?.getUserId?.();
  const token=await window.YapPluginConnections?.getToken?.();
  if(!token)throw Error("Sign in to YapThing before using your developer connections.");
  const r=await fetch(endpoint,{method:"POST",headers:{authorization:"Bearer "+token,apikey,"content-type":"application/json"},
   body:JSON.stringify({provider,action,...params}),signal:AbortSignal.timeout(24000),cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(identity&&identity!==window.YapWebAccount?.getUserId?.())throw Error("Account changed. Please try again.");
  if(!r.ok)throw Error(String(data.error||"Developer tool unavailable").slice(0,280));
  return data;
 }
 return Object.freeze({
  githubInstallations:()=>call("github","repos"),
  githubRepositories:id=>call("github","repositories",{installation_id:id}),
  githubIssues:(owner,repo)=>call("github","issues",{owner,repo}),
  githubFile:(owner,repo,path)=>call("github","file",{owner,repo,path}),
  supabaseProjects:()=>call("supabase","projects"),
  supabaseFunctions:project_ref=>call("supabase","functions",{project_ref})
 });
})();