'use strict';
/* Private chat images: compact files in IndexedDB, optional owner-only Supabase
 * backups. Chat JSON contains only the imagePath and imageKey references. */
(()=>{
 const BASE='https://uemjkfvcadggyvhbqqyp.supabase.co';
 const BUCKET='yap-chat-images';
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const actor=()=>window.YapSession?.get?.()?.user?.id||null;
 const validPath=path=>typeof path==='string'&&uuid.test(path.split('/')[0])&&
   /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/i.test(path);
 const open=()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('yapthing.chat.media.v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images')};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 async function get(key){
  const db=await open();
  return new Promise((resolve,reject)=>{const tx=db.transaction('images','readonly'),req=tx.objectStore('images').get(key);
   req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()});
 }
 async function put(key,blob){
  const db=await open();
  return new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,key);
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
 }
 async function discard(key){
  if(!key)return;const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('images','readwrite');tx.objectStore('images').delete(key);
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
 }
 async function jpeg(source){
  const image=typeof createImageBitmap==='function'?await createImageBitmap(source):await new Promise((resolve,reject)=>{
   const img=new Image(),url=URL.createObjectURL(source);img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
   img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Cannot read photo'))};img.src=url;
  });
  const scale=Math.min(1,1280/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.78));
  if(!blob||blob.size>2*1024*1024)throw Error('Image is too large after compression');
  return blob;
 }
 function fromDataUrl(raw){
  if(!/^data:image\/(png|jpeg|webp);base64,/i.test(raw||''))throw Error('Invalid image');
  const [header,encoded]=raw.split(',',2),bytes=atob(encoded);
  if(bytes.length>6*1024*1024)throw Error('Image is too large');
  const out=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)out[i]=bytes.charCodeAt(i);
  return new Blob([out],{type:header.match(/^data:([^;]+)/i)[1]});
 }
 async function upload(blob,path){
  if(!validPath(path)||path.split('/')[0]!==actor())throw Error('Account changed');
  const res=await window.YapSession.authFetch(BASE+'/storage/v1/object/'+BUCKET+'/'+path,{
   method:'POST',headers:{'content-type':blob.type,'x-upsert':'false'},body:blob,
   signal:AbortSignal.timeout(18000)});
  if(!res.ok)throw Error('Private image upload failed ('+res.status+')');
  return path;
 }
 async function store(source){
  const blob=await jpeg(typeof source==='string'?fromDataUrl(source):source);
  const owner=actor()||'guest',imageKey=owner+'/'+crypto.randomUUID();
  await put(imageKey,blob);
  let imagePath=null;
  if(uuid.test(owner)){
   const path=owner+'/'+crypto.randomUUID()+'.jpg';
   try{imagePath=await upload(blob,path)}
   catch(error){
    console.warn('Image is saved on this device; cloud backup unavailable',error.message);
    window.dispatchEvent(new CustomEvent('yap-image-sync-failed'));
   }
  }
  return {imageKey,imagePath};
 }
 async function fetchBlob(path){
  if(!validPath(path)||path.split('/')[0]!==actor())return null;
  const res=await window.YapSession.authFetch(BASE+'/storage/v1/object/authenticated/'+BUCKET+'/'+path,
   {method:'GET',signal:AbortSignal.timeout(18000)});
  if(!res.ok)throw Error('Could not load cloud image');
  return res.blob();
 }
 async function attach(img,msg){
  const owner=actor()||'guest';
  if(msg.imagePath&&(!validPath(msg.imagePath)||msg.imagePath.split('/')[0]!==owner))return;
  const localKey=msg.imageKey?.startsWith(owner+'/')?msg.imageKey:(msg.imagePath?'cloud:'+msg.imagePath:null);
  let blob=localKey?await get(localKey).catch(()=>null):null;
  if(!blob&&msg.imagePath){
   blob=await fetchBlob(msg.imagePath).catch(()=>null);
   if(blob&&localKey)await put(localKey,blob).catch(()=>{});
  }
  if(!img.isConnected||!blob)return;
  const url=URL.createObjectURL(blob);img.onload=()=>URL.revokeObjectURL(url);
  img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
 }
 async function removeMessages(messages){
  const owner=actor();
  for(const msg of messages||[]){
   if(msg.imageKey?.startsWith((owner||'guest')+'/'))await discard(msg.imageKey).catch(()=>{});
   if(msg.imagePath?.startsWith((owner||'guest')+'/'))await discard('cloud:'+msg.imagePath).catch(()=>{});
   if(!owner||!validPath(msg.imagePath)||msg.imagePath.split('/')[0]!==owner)continue;
   try{await window.YapSession.authFetch(BASE+'/storage/v1/object/'+BUCKET+'/'+msg.imagePath,{
    method:'DELETE',signal:AbortSignal.timeout(15000)});
   }catch(error){console.warn('Image cleanup will need retry',error.message)}
  }
 }
 async function download(msg,name){
  const owner=actor()||'guest';
  const key=msg.imageKey?.startsWith(owner+'/')?msg.imageKey:(msg.imagePath?.startsWith(owner+'/')?'cloud:'+msg.imagePath:null);
  const blob=(key?await get(key).catch(()=>null):null)||
   (msg.imagePath?.startsWith(owner+'/')?await fetchBlob(msg.imagePath).catch(()=>null):null);
  if(!blob)throw Error('Image is unavailable on this device');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name||'YapThing-image.jpg';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 window.YapImageStore={store,attach,download,removeMessages,validPath};
})();
