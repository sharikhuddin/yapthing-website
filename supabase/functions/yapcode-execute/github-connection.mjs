// Caller-owned GitHub credentials only. Refresh delegates to the existing OAuth gateway.
export function validRepository(repo){
 return typeof repo==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(repo)&&!repo.split('/').some(x=>x==='.'||x==='..');
}
export async function githubConnection({base,anon,service,userId,authorization,encryptionKey,repo,read,fetchImpl=fetch,signal,inspect=false}){
 if(!validRepository(repo))throw Error('INVALID_REPOSITORY');
 const headers={apikey:service,authorization:'Bearer '+service};
 const url=base+'/rest/v1/yap_developer_oauth_credentials?user_id=eq.'+encodeURIComponent(userId)+'&provider=eq.github&select=encrypted_access_token,access_iv,access_expires_at&limit=1';
 const load=()=>read(url,{headers});
 let rows=await load();
 if(!Array.isArray(rows)||rows.length!==1)throw Error('GITHUB_RECONNECT_REQUIRED');
 const expired=record=>record.access_expires_at&&Date.parse(record.access_expires_at)<Date.now()+90000;
 if(expired(rows[0])){
  // The OAuth gateway validates this same caller and handles encrypted refresh/CAS.
  // Never send a service-role identity to it or substitute a desktop GitHub token.
  const [owner,name]=repo.split('/');
  const r=await fetchImpl(base+'/functions/v1/yap-dev-read',{method:'POST',headers:{apikey:anon,authorization,'content-type':'application/json'},body:JSON.stringify({provider:'github',action:'repository',owner,repo:name}),redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(30000)])});
  await r.body?.cancel();
  if(!r.ok)throw Error('GITHUB_REFRESH_OR_PERMISSION_REQUIRED');
  rows=await load();
  if(!Array.isArray(rows)||rows.length!==1||expired(rows[0]))throw Error('GITHUB_RECONNECT_REQUIRED');
 }
 const dec=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const raw=dec(encryptionKey);if(raw.length!==32)throw Error('OAUTH_CONFIGURATION_REQUIRED');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 let token;
 try{token=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:dec(rows[0].access_iv)},key,dec(rows[0].encrypted_access_token)));}catch{throw Error('GITHUB_RECONNECT_REQUIRED');}
 if(!token)throw Error('GITHUB_RECONNECT_REQUIRED');
 let repository;
 if(inspect){
  const r=await read('https://api.github.com/repos/'+repo,{headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});
  if(r.full_name?.toLowerCase()!==repo.toLowerCase())throw Error('GITHUB_PERMISSION_REQUIRED');
  repository={name:r.full_name,can_push:r.permissions?.push===true,archived:!!r.archived,default_branch:r.default_branch};
 }
 return {token,repository};
}
