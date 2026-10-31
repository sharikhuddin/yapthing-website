'use strict';
(()=>{
const $=id=>document.getElementById(id);
let image=null,previewURL=null;
const reset=()=>{image=null;$('photo-input').value='';$('photo-preview').hidden=true;$('photo-thumb').removeAttribute('src');$('photo-name').textContent='';if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}};
$('photo-remove').onclick=reset;
$('photo-input').onchange=async()=>{
 const file=$('photo-input').files?.[0];if(!file){reset();return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){alert('Choose a JPG, PNG or WebP image.');reset();return}
 if(file.size>8*1024*1024){alert('Image must be under 8 MB.');reset();return}
 window.YapAttachments?.clearDocument?.();image=file;$('photo-remove').onclick=reset;$('photo-thumb').hidden=false;$('send').disabled=false;previewURL&&URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);
 $('photo-thumb').src=previewURL;$('photo-name').textContent=file.name;$('photo-preview').hidden=false;
};
async function prepare(file){
 const bitmap=typeof createImageBitmap==='function'?await createImageBitmap(file):await new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not open photo'))};img.src=url});
 const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
 if(!blob)throw Error('Could not process image');
 if(blob.size>2*1024*1024)throw Error('Image is too large after compression');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
async function cloudRequest(prompt,history,imageBase64,search=false){
  const token=await window.YapWebAccount?.getToken();
  if(!token)throw Error('Sign in to use YapThing Cloud.');
  const response=await window.YapWebAccount.authFetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/ios-chat',{
   method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,
    'apikey':'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},
   body:JSON.stringify({prompt,responseMode:window.YapResponseModes?.current()?.id||'auto',preferences:window.YapChatServices?.preferences()||{},history:history.filter(m=>m.role==='user'||m.role==='assistant').slice(-8).map(m=>({role:m.role==='assistant'?'model':m.role,text:m.content})),...(imageBase64?{imageBase64}:{}),search:!!search})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok){const e=Error(result.error||result.message||'YapThing Cloud unavailable ('+response.status+')');e.code=result.code;e.status=response.status;throw e;}
  return result;
}
window.YapPhotoVision={
 ask:(prompt,history,search=false)=>cloudRequest(prompt,history,null,search),
 hasPhoto:()=>!!image,
 file:()=>image,
 removePhoto:reset,
 analyze:async(prompt,history)=>{
  if(!image)throw Error('Attach a photo first');
  const imageBase64=await prepare(image);
  const result=await cloudRequest(prompt,history,imageBase64);
  reset();return result;
 }
};
})();