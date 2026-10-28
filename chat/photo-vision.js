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
 image=file;previewURL&&URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);
 $('photo-thumb').src=previewURL;$('photo-name').textContent=file.name;$('photo-preview').hidden=false;
};
async function prepare(file){
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
 if(!blob)throw Error('Could not process image');
 if(blob.size>2*1024*1024)throw Error('Image is too large after compression');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
window.YapPhotoVision={
 hasPhoto:()=>!!image,
 analyze:async(prompt,history)=>{
  if(!image)throw Error('Attach a photo first');
  const token=await window.YapWebAccount?.getToken();
  if(!token)throw Error('Sign in to analyze photos. Local AI cannot see images.');
  const imageBase64=await prepare(image);
  const response=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/ios-chat',{
   method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,
    'apikey':'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},
   body:JSON.stringify({prompt,history:history.slice(-4).map(m=>({role:m.role,text:m.content})),imageBase64,search:false})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||result.message||'Photo analysis unavailable ('+response.status+')');
  reset();return result;
 }
};
})();