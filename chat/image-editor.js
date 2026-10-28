'use strict';
(()=>{
const $=id=>document.getElementById(id),input=$('photo-input'),controls=$('edit-controls'),run=$('edit-run'),result=$('edit-result'),status=$('edit-status');let busy=false;
const refresh=()=>{controls.hidden=!input.files?.length;result.hidden=true;status.textContent='';};
input.addEventListener('change',refresh);
$('photo-remove').addEventListener('click',()=>{controls.hidden=true;result.hidden=true;});
async function jpg(file){
 const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));if(!blob)throw Error('Cannot prepare photo.');
 const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}
run.addEventListener('click',async()=>{
 if(busy)return;const file=input.files?.[0],prompt=$('prompt').value.trim();
 if(!file){status.textContent='Attach a photo first.';return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){status.textContent='Use JPG, PNG or WebP under 8 MB.';return}
 if(prompt.length<3){status.textContent='Describe the change in the message box first.';$('prompt').focus();return}
 busy=true;run.disabled=true;status.textContent='Editing your photo…';result.hidden=true;
 try{
 const token=await window.YapWebAccount?.getToken();if(!token)throw Error('Sign in to use AI photo editing.');
 const response=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-image-edit',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ'},body:JSON.stringify({imageBase64:await jpg(file),prompt:prompt.slice(0,1200),preset:$('edit-preset').value})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Image edit failed.');
 if(!data.imageBase64||!['image/png','image/jpeg','image/webp'].includes(data.mimeType))throw Error('No edited image returned.');
 const uri='data:'+data.mimeType+';base64,'+data.imageBase64;
 $('edit-result-image').src=uri;$('edit-download').href=uri;$('edit-download').download='YapThing-edited-profile.'+(data.mimeType==='image/jpeg'?'jpg':data.mimeType==='image/webp'?'webp':'png');
 result.hidden=false;status.textContent='Edited image ready. '+(data.notice||'');
 window.dispatchEvent(new CustomEvent('yap-edited-image',{detail:{url:uri,prompt}}));
 window.YapWebAccount?.refreshQuota?.();
 }catch(error){status.textContent=error.message||'Unable to edit photo.';}finally{busy=false;run.disabled=false}
});
})();