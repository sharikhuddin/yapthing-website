'use strict';
/* Account-isolated Google Drive access. All Google tokens stay on YapThing servers. */
window.YapDriveClient=(()=>{
 const endpoint='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-drive-files';
 const key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 async function request(action,params={}){
  const owner=window.YapWebAccount?.getUserId?.()||null;
  const token=await window.YapPluginConnections?.getToken?.();
  if(!token)throw Error('Sign in to YapThing before using Google Drive.');
  const response=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,apikey:key,'content-type':'application/json'},
    body:JSON.stringify({action,...params}),signal:AbortSignal.timeout(24000),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(owner&&owner!==window.YapWebAccount?.getUserId?.())throw Error('Account changed. Retry in your current account.');
  if(!response.ok)throw Error(String(data.error||'Google Drive action was unavailable.').slice(0,270));
  return data;
 }
 return Object.freeze({
  list:()=>request('list'),
  read:file_id=>request('read',{file_id:String(file_id||'')}),
  create:(name,text,confirm)=>request('create',{name:String(name||''),text:String(text||''),confirm:confirm===true})
 });
})();