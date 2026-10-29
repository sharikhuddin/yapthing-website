'use strict';
/* Opt-in chat continuation. Preserves original history and limits visible DOM. */
(()=>{
const key='yapthing.web.preview.v1',box=document.getElementById('messages'),prompt=document.getElementById('prompt'),newButton=document.getElementById('new');
if(!box||!prompt||!newButton)return;
const panel=document.createElement('div');panel.id='yap-continuation';panel.style.cssText='display:none;align-items:center;gap:9px;flex-wrap:wrap;padding:12px;margin:10px 0;border:1px solid #9cb5a1;border-radius:14px;background:rgba(146,195,150,.09);font:13px system-ui';
const label=document.createElement('span');label.textContent='✦ Long chat: continue in a fresh conversation with recent context.';
const action=document.createElement('button');action.type='button';action.textContent='Continue in new chat';action.style.cssText='padding:9px 13px;border:0;border-radius:10px;background:#d9f58b;color:#1a3825;font-weight:700;cursor:pointer';
const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Not now';dismiss.style.cssText='padding:9px;border-radius:10px';
panel.append(label,action,dismiss);box.parentElement.insertBefore(panel,box);
let dismissedId='',scheduled=false;
function getActive(){try{const chats=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(chats))return null;const displayed=box.querySelector('.message.user');const latest=Array.from(chats).find(c=>Array.isArray(c.messages)&&c.messages.length);if(!displayed)return latest||null;const sample=(displayed.textContent||'').slice(0,60);return chats.find(c=>c.messages?.some(m=>m.role==='user'&&String(m.text||'').includes(sample)))||latest||null}catch{return null}}
function update(){scheduled=false;const chat=getActive();if(!chat){panel.style.display='none';return}const count=chat.messages.length,chars=chat.messages.reduce((n,m)=>n+String(m.text||'').length,0);panel.style.display=(chat.id!==dismissedId&&(count>=60||chars>=45000))?'flex':'none';
 // DOM virtualization: retain newest 100 nodes only; stored chat remains untouched.
 const nodes=Array.from(box.children).filter(n=>n.classList?.contains('message'));if(nodes.length>100){const older=nodes.slice(0,nodes.length-100);older.forEach(n=>n.remove());let info=box.querySelector('#yap-older-notice');if(!info){info=document.createElement('div');info.id='yap-older-notice';info.style.cssText='font:12px system-ui;padding:10px;opacity:.8';box.prepend(info)}info.textContent='Showing latest 100 messages. Earlier messages remain in chat history.'}
}
function schedule(){if(!scheduled){scheduled=true;queueMicrotask(update)}}
const observer=new MutationObserver(schedule);observer.observe(box,{childList:true});window.addEventListener('storage',schedule);setTimeout(update,100);
dismiss.onclick=()=>{dismissedId=getActive()?.id||'';panel.style.display='none'};
action.onclick=()=>{const chat=getActive();if(!chat)return;const recent=chat.messages.filter(m=>(m.role==='user'||m.role==='assistant')&&typeof m.text==='string'&&m.text!=='YAPTHING_WORKING').slice(-10);const excerpts=recent.map(m=>(m.role==='user'?'User: ':'Assistant: ')+m.text.slice(0,700));let context=excerpts.join('\n').slice(-5000);if(!context.trim())return;const handoff='Continuing a previous YapThing conversation. Here are excerpts of the most recent messages (older history is not included, and this is not a complete summary):\n\n'+context+'\n\nPlease continue from this context. Ask me what I would like to do next.';newButton.click();prompt.value=handoff;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();panel.style.display='none'};
})();
