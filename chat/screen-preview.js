'use strict';
/* User-initiated, local-only screen preview. Never transmits or records the stream. */
(()=>{let stream=null,overlay=null;
function stop(){if(stream){for(const track of stream.getTracks())track.stop();stream=null}overlay?.remove();overlay=null}
async function start(){
 if(!navigator.mediaDevices?.getDisplayMedia){alert('Screen sharing is not supported in this browser. Try desktop Chrome or Edge.');return}
 stop();
 try{stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
 overlay=document.createElement('section');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Your screen preview');overlay.style.cssText='position:fixed;inset:12px;z-index:9999;max-width:900px;max-height:85vh;margin:auto;padding:16px;background:#14221c;color:white;border:1px solid #8ea59a;border-radius:20px;box-shadow:0 20px 90px #0009;display:flex;flex-direction:column;gap:12px';
 const title=document.createElement('h3');title.textContent='✦ YapThing Screen Preview';title.style.margin='0';
 const notice=document.createElement('p');notice.textContent='Only you can see this local preview. Your screen is NOT sent to YapThing AI, stored, or shared with anyone. Stop sharing at any time.';notice.style.margin='0';
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.style.cssText='width:100%;max-height:65vh;object-fit:contain;background:#000;border-radius:12px';video.srcObject=stream;
 const button=document.createElement('button');button.textContent='Stop sharing';button.type='button';button.style.cssText='padding:12px 18px;border:0;border-radius:12px;background:#e7f8a1;color:#15261b;font-weight:bold;cursor:pointer';button.onclick=stop;
 overlay.append(title,notice,video,button);document.body.append(overlay);
 for(const track of stream.getVideoTracks())track.addEventListener('ended',stop,{once:true});
 }catch(e){stop();if(e.name!=='NotAllowedError')alert('Unable to preview screen: '+e.message)}
}
window.YapScreenPreview={start,stop};
window.addEventListener('pagehide',stop);
})();