'use strict';
(()=>{
const $=id=>document.getElementById(id);
const legacyKey='yapthing.web.preview.v1';
const ownerForSession=()=>{
 const s=window.YapSession?.get?.();
 return s?.access_token&&/^[a-f0-9-]{36}$/i.test(s?.user?.id||'')?s.user.id:null;
};
let owner=ownerForSession();
const chatKey=id=>'yapthing.web.chats.v2.'+id;
const activeKey=id=>chatKey(id)+'.active';
const readChats=id=>{
 if(!id)return [];
 try{
  const rows=JSON.parse(localStorage.getItem(chatKey(id))||'[]');
  return Array.isArray(rows)?rows.filter(c=>c&&typeof c.id==='string'&&Array.isArray(c.messages)).slice(0,80):[];
 }catch{return []}
};
const readActive=id=>{
 if(!id)return null;
 const saved=localStorage.getItem(activeKey(id));
 return chats.some(c=>c.id===saved)?saved:chats[0]?.id||null;
};
let chats=readChats(owner);
let active=readActive(owner),engine=null,busy=false,modelLoading=false,backend='';
let incognito=false,incognitoThread=null;
const currentChat=()=>incognito?incognitoThread:chats.find(c=>c.id===active);
const ensureCurrentChat=()=>{
 if(incognito){if(!incognitoThread)incognitoThread={id:crypto.randomUUID(),messages:[]};active=incognitoThread.id;return incognitoThread;}
 let c=chats.find(row=>row.id===active);if(!c){c={id:crypto.randomUUID(),messages:[]};chats.unshift(c);active=c.id;}return c;
};
const hero=document.createElement("section");hero.id="yap-empty-hero";hero.setAttribute("aria-label","New YapThing chat");
const greeting=document.createElement("h1");greeting.textContent="Let’s get yapping.";
const lead=document.createElement("p");lead.textContent="Bring a question, an idea or something you want to make.";
hero.append(greeting,lead);document.getElementById("form")?.before?.(hero);
function showLanding(){
 const empty=!currentChat()?.messages?.length;
 const show=empty&&!busy&&!modelLoading;
 document.querySelector(".workspace")?.classList.toggle("yap-empty-chat",show);
 hero.hidden=!show;document.getElementById("messages").hidden=show;
 document.body?.classList?.toggle?.("yap-incognito",incognito);
 window.dispatchEvent(new CustomEvent("yap:incognito-changed",{detail:{enabled:incognito}}));
}
function setIncognito(value){
 if(busy||modelLoading)return false;
 const enable=!!value;if(enable===incognito)return true;
 if(enable){incognito=true;incognitoThread={id:crypto.randomUUID(),messages:[]};active=incognitoThread.id;}
 else{incognito=false;incognitoThread=null;active=readActive(owner);}
 document.getElementById("prompt").value="";
 window.YapAttachments?.clearDocument?.();window.YapPhotoVision?.removePhoto?.();
 document.getElementById("yap-attachment-menu")?.removeAttribute("open");
 const mode=document.getElementById("yap-conversation-mode");
 if(enable&&mode&&mode.value!=="chat"){mode.value="chat";mode.dispatchEvent(new Event("change"));}
 render();updateUsage();document.getElementById("prompt").focus();return true;
}const modelId='Qwen2.5-0.5B-Instruct-q4f16_1-MLC';let progressLast=0;const dailyLimit=20,usageKey='yapthing.free.daily.v1';const today=()=>new Date().toISOString().slice(0,10);const resetAt=()=>{const d=new Date();d.setUTCHours(24,0,0,0);return d};const resetLabel=()=>resetAt().toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'});function usage(){try{const u=JSON.parse(localStorage.getItem(usageKey)||'null');return u&&u.day===today()?Math.max(0,Number(u.count)||0):0}catch{return 0}}function updateUsage(){const cloud=!!window.YapWebAccount?.getUserId(),q=window.YapWebAccount?.getQuota(),used=usage(),blocked=cloud?(q?Number(q.remaining)<=0:false):used>=dailyLimit;$('usage').textContent=cloud?(q?'Cloud: '+Math.max(0,Number(q.remaining)||0)+'/'+q.limit+' left today · UTC reset':'Cloud: checking remaining requests…'):'On-device: '+Math.max(0,dailyLimit-used)+' messages left · UTC reset '+resetLabel();const composing=!!$('prompt').value.trim()||!!window.YapPhotoVision?.hasPhoto();$('upgrade').hidden=!(blocked&&composing);$('send').disabled=busy||modelLoading||(blocked&&!window.YapLocation?.clockAnswer($('prompt').value||'')&&!window.YapResearchFallback?.supportAnswer($('prompt').value||'')&&!window.YapWorkChat?.willHandle?.($('prompt').value||'')&&!window.YapChatServices?.parse($('prompt').value||''));return blocked}function incrementUsage(){try{localStorage.setItem(usageKey,JSON.stringify({day:today(),count:usage()+1}))}catch{}updateUsage()}
const themeKey='yapthing.web.theme';const themeSelect=$('theme-choice');let selectedTheme='original';try{selectedTheme=localStorage.getItem(themeKey)==='dark'?'dark':'original'}catch{}function setTheme(value){const theme=value==='dark'?'dark':'original';document.documentElement.dataset.theme=theme;themeSelect.value=theme;try{localStorage.setItem(themeKey,theme)}catch{}}themeSelect.onchange=()=>setTheme(themeSelect.value);setTheme(selectedTheme);
const memoryKey=()=> 'yapthing.web.memory.v1.'+(window.YapWebAccount?.getUserId()||'guest');let cloudName='';async function syncName(){if(!window.YapWebAccount?.getUserId()){cloudName='';return}try{const name=await window.YapWebAccount.memoryName();if(name){cloudName=name;localStorage.setItem(memoryKey(),JSON.stringify({name}))}else{const local=getName();if(local){await window.YapWebAccount.saveName(local);cloudName=local}}}catch(e){console.warn('Memory sync unavailable',e)}}function getName(){try{return JSON.parse(localStorage.getItem(memoryKey())||'{}').name||''}catch{return ''}}function learnName(s){const match=String(s).match(/\b(?:my name is|call me)\s+([A-Za-z][A-Za-z '-]{0,38})/i);if(!match)return;const name=match[1].trim().split(/\s+(?:and|but|because|from|i am|i'm)\b/i)[0].replace(/[.!?,]+$/,'').trim();if(!name||name.split(/\s+/).length>4)return;try{localStorage.setItem(memoryKey(),JSON.stringify({name}))}catch{}}function forgetName(s){if(/\b(?:forget my name|don't remember my name)\b/i.test(s)){try{localStorage.removeItem(memoryKey())}catch{}return true}return false};const persist=()=>{
 if(incognito||!owner||owner!==ownerForSession())return; // Private and guest chats remain only in memory.
 const c=chats.find(x=>x.id===active);
 if(c)c.updated=Date.now();
 try{localStorage.setItem(chatKey(owner),JSON.stringify(chats.slice(0,80)))}
 catch{console.warn('Browser chat storage is full');return}
 window.dispatchEvent(new Event('yap:chat-local-saved'));
};function repairChatMessages(){let changed=false;for(const chat of chats){const filtered=[];for(const msg of chat.messages){if(msg.role==='system'&&typeof msg.text==='string'&&/^Your reply was interrupted: Last message should be from either/i.test(msg.text)){changed=true;continue}if(msg.role==='assistant'&&typeof msg.text==='string'){if(msg.text==='YAPTHING_WORKING'){changed=true;continue}if(msg.text.startsWith('YAPTHING_WORKING')){msg.text=msg.text.slice('YAPTHING_WORKING'.length);changed=true}if(msg.source==='yap-identity'){if(msg.text==="I'm YapThing, your AI assistant. I can help with questions, writing, research, and everyday tasks."){msg.text="I'm YapThing.";changed=true}else if(msg.text==="I'm YapThing, the AI assistant built for the YapThing platform."){msg.text="The YapThing team built me.";changed=true}}}filtered.push(msg)}chat.messages=filtered}if(changed)persist()}repairChatMessages();

const YAPTHING_IDENTITY_INSTRUCTION="You are Yapper, the assistant in YapThing. Be a warm, natural, thoughtful conversational partner: speak plainly, use contractions when they fit, match the user's tone, and focus on their question rather than introducing yourself or listing capabilities. Avoid robotic lines such as 'As an AI assistant' in ordinary replies. Your product identity is Yapper within YapThing, not the name or creator learned from an underlying model. YapThing built the assistant experience but did not train the base foundation models. Never claim to be trained by YapThing or another provider without context. Never pretend to be a human or invent personal experiences; if asked directly whether you're a person or AI, answer accurately. If asked about underlying model providers, answer transparently. Be clear about your limits and uncertainty.";
function yapIdentityReply(question){
 const q=String(question||'').trim().toLowerCase().replace(/[?.!]+$/,'').replace(/\s+/g,' ');
 const product="I'm Yapper, YapThing's AI assistant.";
 if(/^(?:what(?:'s| is) your name|tell me your name|what should i call you|who are you|introduce yourself|tell me about yourself)$/.test(q))
  return {text:product+" I can help with questions, research, writing and projects. What are you working on?",source:'yap-identity'};
 if(/^(?:who (?:made|built|created|developed) you|who is your (?:creator|developer)|who built yapthing|who built yapper)$/.test(q))
  return {text:"The YapThing team built the Yapper assistant experience, using supported AI models.",source:'yap-identity'};
 if(/^(?:are you (?:an? ai|a bot|human|a human|a real person|a person|real)|are you artificial intelligence|am i talking to (?:an? ai|a person|a human))$/.test(q))
  return {text:product+" I'm AI-powered, not a person.",source:'yap-identity'};
 if(/^(?:who trained you|who trains you|were you trained by (?:google|yapper|yapthing)|what (?:is|was) (?:your|the) training|how were you trained)$/.test(q))
  return {text:"Yapper is YapThing's assistant. The underlying AI models are developed and trained by their respective providers; YapThing did not train those foundation models from scratch.",source:'yap-identity'};
 if(/^(?:what(?:'s| is) (?:backing|hacking|powering|running) you(?: up)?|what (?:powers|runs|backs) you(?: up)?|what(?:'s| is) (?:your )?(?:backend|back end|engine|tech stack)|what (?:model|ai model|ai provider) (?:are you using|powers you|do you use)|which (?:model|ai model|provider) powers you|who provides your ai|are you (?:gemini|chatgpt|systematicai|an alibaba ai))$/.test(q))
  return {text:"Yapper runs inside YapThing. The YapThing platform handles the chat experience and tools; cloud replies may use Google Gemini and other AI services, while some devices can run local AI. I don't claim YapThing trained those underlying models.",source:'yap-identity'};
 return null;
}
function yapLocalMessages(context){
 const instructions=[],turns=[];
 for(const message of context){
  if(message?.role==='system'&&typeof message.content==='string'&&message.content.trim())instructions.push(message.content.trim());
  else if((message?.role==='user'||message?.role==='assistant')&&typeof message.content==='string'&&message.content.trim())turns.push({role:message.role,content:message.content});
 }
 // WebLLM expects one system message, in position zero, before user/assistant turns.
 return [{role:'system',content:YAPTHING_IDENTITY_INSTRUCTION+'\n\n'+instructions.join('\n\n')},...turns];
}
function yapLegacyIdentityClaim(message){
 if(message?.role!=='assistant'||message.source==='yap-identity')return false;
 const t=String(message.text||'').trim();
 if(/^(?:i am|i'm)\s+(?:a\s+)?large language model,?\s*trained by (?:google|openai|alibaba)/i.test(t))return true;
 return /^(?:(?:I am|I'm)\s+(?:(?:named\s+)?["']?SystematicAI\b|made by Alibaba Cloud\b|(?:an?\s+)?(?:AI assistant\s+)?(?:created|built|developed) by Alibaba Cloud\b)|My name is\s+["']?SystematicAI\b)/i.test(t);
}
function yapAnswerMarkup(el,m){const text=String(m.text||''),sources=Array.isArray(m.sources)?m.sources:[];el.replaceChildren();for(const part of text.split(/(```[\s\S]*?```)/g)){if(part.startsWith('```')&&part.endsWith('```')){const raw=part.slice(3,-3),nl=raw.indexOf('\n'),code=nl<0?raw:raw.slice(nl+1),lang=nl<0?'Code':raw.slice(0,nl);const wrap=document.createElement('div');wrap.style.cssText='border:1px solid #64748b;border-radius:10px;margin:10px 0;overflow:hidden';const header=document.createElement('div');header.style.cssText='display:flex;justify-content:space-between;padding:8px;background:#243044;color:white';const label=document.createElement('span');label.textContent=lang||'Code';const copy=document.createElement('button');copy.textContent='Copy code';copy.onclick=async()=>{try{await navigator.clipboard.writeText(code);copy.textContent='Copied'}catch{copy.textContent='Select text to copy'}};header.append(label,copy);const pre=document.createElement('pre');pre.style.cssText='padding:12px;overflow:auto;margin:0';const node=document.createElement('code');node.textContent=code;pre.append(node);wrap.append(header,pre);el.append(wrap)}else{let last=0;const re=/\[(\d{1,2})\]/g;let match;while((match=re.exec(part))){el.append(document.createTextNode(part.slice(last,match.index)));const src=sources[Number(match[1])-1];if(src?.url&&/^https:\/\//i.test(src.url)){const a=document.createElement('a');a.href=src.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=match[0];a.title=src.title||'Open source';el.append(a)}else el.append(document.createTextNode(match[0]));last=re.lastIndex}el.append(document.createTextNode(part.slice(last)))}}}
window.addEventListener('yap-image-sync-failed',()=>{
 const el=document.getElementById('chat-sync-status');
 if(el)el.textContent='Photo saved on this device. Cloud image storage is unavailable or full.';
});
window.addEventListener('yap-edited-image',async event=>{
  const image=event.detail?.url,prompt=event.detail?.prompt;
  if(incognito||!image||!/^data:image\/(png|jpeg|webp);base64,/.test(image))return;
  const actor=ownerForSession(),threadId=active,original=window.YapPhotoVision?.file?.();
  try{
   const [originalRef,editedRef]=await Promise.all([
    original?window.YapImageStore.store(original):Promise.resolve(null),
    window.YapImageStore.store(image)
   ]);
   if(ownerForSession()!==actor)return;
   let chat=chats.find(c=>c.id===threadId);
   if(!chat){chat={id:crypto.randomUUID(),messages:[]};chats.unshift(chat);active=chat.id}
   chat.messages.push({role:'user',text:prompt||'Edit image',...(originalRef||{})});
   chat.messages.push({role:'assistant',text:'Edited image ready.',...editedRef});
   persist();render();
  }catch(error){console.warn('Could not save edited image',error);status('Image edit succeeded but local saving failed. Download it from the preview.')}
 });
function render(){try{if(!incognito&&owner&&owner===ownerForSession()){if(active)localStorage.setItem(activeKey(owner),active);else localStorage.removeItem(activeKey(owner));}}catch{}const box=$('messages');box.replaceChildren();const chat=currentChat();const items=chat?.messages?.length?chat.messages:[];for(const m of items){const el=document.createElement('div');el.className='message '+(m.role==='user'?'user':'');if(m.imageKey||m.imagePath){
 const img=document.createElement('img');img.className='yap-chat-photo';img.alt=m.role==='user'?'Photo attached to this message':'Edited image';img.loading='lazy';el.append(img);
 window.YapImageStore?.attach(img,m).catch(()=>{});
 if(m.role==='assistant'){const a=document.createElement('button');a.type='button';a.textContent='Save edited image';a.onclick=()=>window.YapImageStore.download(m,'YapThing-edited.jpg').catch(e=>alert(e.message));el.append(a)}
 }else if(m.role==='assistant'&&m.editedPreview){const img=document.createElement('img');img.className='yap-chat-photo';img.src=m.editedPreview;img.alt='Edited image';el.append(img);const a=document.createElement('a');a.href=m.editedPreview;a.download='YapThing-edited.png';a.textContent='Save edited image';el.append(a)}
 else if(m.role==='user'&&m.photoPreview){const img=document.createElement('img');img.className='yap-chat-photo';img.src=m.photoPreview;img.alt='Photo attached to this message';img.loading='lazy';el.append(img)}if(m.role==='assistant'&&m.text==='YAPTHING_WORKING'){el.classList.add('yap-working');const logo=document.createElement('img');logo.src='yapthing-icon.svg';logo.alt='';logo.className='yap-working-logo';const ring=document.createElement('span');ring.className='yap-working-ring';ring.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='sr-only';label.textContent='YapThing is working';el.setAttribute('role','status');el.append(logo,ring,label)}else if(m.role==="assistant"){yapAnswerMarkup(el,m);el.classList.add("yap-assistant-reply");const avatar=document.createElement("img");avatar.className="yap-assistant-avatar";avatar.src="yapthing-icon.svg";avatar.alt="";avatar.setAttribute("aria-hidden","true");avatar.width=30;avatar.height=30;el.prepend(avatar);if(yapLegacyIdentityClaim(m)){const note=document.createElement('small');note.className='yap-legacy-identity-note';note.textContent='Correction: That older answer described an underlying model rather than the YapThing assistant. You are chatting with Yapper. For accurate provider details, ask what powers Yapper.';el.prepend(note);}if(m.mode){const meta=document.createElement('small');meta.className='yap-response-meta';meta.textContent=m.mode+(m.durationMs?' · '+(m.durationMs/1000).toFixed(1)+'s':'');el.append(meta);}}else{el.textContent=m.text}box.append(el);if(m.role==='assistant'&&m.searchSuggestions){const frame=document.createElement('iframe');frame.title='Google Search suggestions';frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.setAttribute('referrerpolicy','no-referrer');frame.srcdoc=m.searchSuggestions;frame.style.cssText='border:0;width:100%;min-height:100px;background:white';el.append(frame);}if(m.source==='location-question'&&m.localQuestion&&m===chat?.messages.at(-1)){const choices=document.createElement('div');choices.className='message-actions';const note=document.createElement('small');note.setAttribute('role','status');for(const [label,method] of [['Use approximate location','approximate'],['Use device location','precise']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{if(busy)return;const id=active,actor=window.YapWebAccount?.getUserId();b.disabled=true;note.textContent='';try{const ready=await window.YapLocation[method]();if(!ready||!window.YapLocation.snapshot().label)return;const current=chats.find(c=>c.id===id);if(active!==id||actor!==window.YapWebAccount?.getUserId()||current?.messages.at(-1)!==m)return;current.messages.splice(-2);persist();render();$('prompt').value=m.localQuestion;$('form').requestSubmit();}catch(error){note.textContent=error.message+' You can reply with your city instead.';}finally{b.disabled=false;}};choices.append(b);}el.append(choices,note);}if(m.role==='assistant'&&m.webSearchQuery){const a=document.createElement('a');a.href=window.YapResearchFallback.externalLink(m.webSearchQuery);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Search web in browser';el.append(a)}if(m.role==='assistant'&&Array.isArray(m.sources)&&m.sources.length){const sources=document.createElement('div');sources.className='yap-sources';const title=document.createElement('small');title.textContent=m.sources.length+' source'+(m.sources.length===1?'':'s')+' found';sources.append(title);for(const s of m.sources){try{const u=new URL(s.url);if(u.protocol!=='https:')continue;const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||u.hostname;const icon=window.YapActivity?.sourceIcon(u.href);if(icon)a.prepend(icon);sources.append(a)}catch{}}el.append(sources)}if(m.role==='assistant'&&m.text&&m.text!=='YAPTHING_WORKING'){const actions=document.createElement('div');actions.className='message-actions';const copy=document.createElement('button');copy.type='button';copy.textContent='Copy reply';copy.onclick=()=>navigator.clipboard?.writeText(m.text).catch(()=>{});actions.append(copy);if(/(?:LEASE AGREEMENT|RENTAL AGREEMENT|TENANCY AGREEMENT)/i.test(m.text)&&m.text.length>500){const download=document.createElement('button');download.type='button';download.textContent='Download draft';download.onclick=()=>{const blob=new Blob([m.text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='YapThing-Lease-Draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};actions.append(download)}el.append(actions)}}box.scrollTop=box.scrollHeight;showLanding();const hist=$('history');hist.replaceChildren();for(const c of chats.filter(c=>!c.projectId||c.projectOwner!==(window.YapWebAccount?.getUserId()||'guest'))){const b=document.createElement('button');b.type='button';b.textContent=c.messages.find(m=>m.role==='user')?.text.slice(0,34)||'New chat';b.onclick=()=>{if(incognito){incognito=false;incognitoThread=null;}active=c.id;render()};const row=document.createElement('div');row.className='yap-chat-entry';row.append(b);
const del=document.createElement('button');del.type='button';del.className='yap-delete-item';
del.textContent='×';del.title='Delete chat';del.setAttribute('aria-label','Delete chat');
del.onclick=()=>window.YapWebChat.deleteChat(c.id).catch(e=>alert(e.message));row.append(del);
hist.append(row)}const mobile=$('mobile-history');mobile.replaceChildren();for(const c of chats){const b=document.createElement('button');b.type='button';b.textContent=c.messages.find(m=>m.role==='user')?.text.slice(0,55)||'New chat';b.onclick=()=>{if(incognito){incognito=false;incognitoThread=null;}active=c.id;mobile.hidden=true;$('mobile-history-toggle').setAttribute('aria-expanded','false');render()};const row=document.createElement('div');row.className='yap-chat-entry';row.append(b);
const del=document.createElement('button');del.type='button';del.className='yap-delete-item';
del.textContent='×';del.setAttribute('aria-label','Delete chat');del.title='Delete chat';
del.onclick=()=>window.YapWebChat.deleteChat(c.id).catch(e=>alert(e.message));
row.append(del);mobile.append(row)}window.dispatchEvent(new Event('yap:chats-updated'));}
const needsWebSearch=text=>/\b(latest|today|tonight|currently|current|recent|news|weather|forecast|price|prices|stock|score|scores|schedule|available|availability|opening hours|near me|nearby|site plan|planning controls|zoning|setbacks|local council|building regulations|search|look up|lookup|find online|on the web|source|sources|cite|citation|verify|2026|2027)\b/i.test(text);const status=s=>{$('model-status').textContent='· '+s};function magic(show,message,percent){$('magic-loader').hidden=!show;$('messages').hidden=!!show;if(message)$('magic-message').textContent=message;const bar=$('magic-progress');if(Number.isFinite(percent)){bar.value=Math.min(100,Math.max(0,percent))}else bar.removeAttribute('value')}const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;function showAIHelp(title,detail){$('ai-help-title').textContent=title;$('ai-help-text').textContent=detail;$('ai-help').hidden=false}function hideAIHelp(){$('ai-help').hidden=true}$('retry-ai').onclick=()=>{$('load-model').click()};
$('new').onclick=()=>window.YapWebChat.newChat();$('mobile-new').onclick=()=>{$('new').click();$('mobile-history').hidden=true};$('mobile-history-toggle').onclick=()=>{const panel=$('mobile-history');panel.hidden=!panel.hidden;$('mobile-history-toggle').setAttribute('aria-expanded',String(!panel.hidden))};document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{$('prompt').value=b.dataset.quick;$('prompt').focus()});$('export-chats').onclick=()=>{const blob=new Blob([JSON.stringify(chats,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='yapthing-chats.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('prompt').addEventListener('input',()=>{if(!busy)updateUsage()});$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('form').requestSubmit()}});
const wasmModel='onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';
function revealRetry(){const b=$('load-model');b.hidden=true;b.disabled=false}
async function loadWasm(){status('Starting lightweight AI on your device');const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.numThreads=1;const generator=await pipeline('text-generation',wasmModel,{device:'wasm',dtype:'q4',progress_callback:p=>{if(p.status==='progress'&&p.progress!=null){const now=Date.now();if(now-progressLast>650){progressLast=now;status('Preparing AI · '+Math.round(p.progress)+'%');if(!window.YapWebAccount?.getUserId())magic(true,'Bringing your AI to life · '+Math.round(p.progress)+'%',p.progress)}}}});backend='wasm';return generator}
async function loadGPU(){const webllm=await import('https://esm.run/@mlc-ai/web-llm@0.2.80');const result=await webllm.CreateMLCEngine(modelId,{initProgressCallback:p=>{const now=Date.now();if(now-progressLast<650&&p.progress!==1)return;progressLast=now;status('Preparing AI · '+Math.round((p.progress||0)*100)+'%');if(!window.YapWebAccount?.getUserId())magic(true,'Unlocking the magic · '+Math.round((p.progress||0)*100)+'%',(p.progress||0)*100)}});backend='gpu';return result}
$('load-model').onclick=async()=>{if(modelLoading||engine)return;hideAIHelp();modelLoading=true;$('load-model').disabled=true;updateUsage();if(!window.YapWebAccount?.getUserId())magic(true,'Preparing your private AI on this device…');status('Connecting to private replies');try{if(isIOS||!navigator.gpu){engine=await loadWasm()}else{try{engine=await loadGPU()}catch(gpuError){console.warn('WebGPU failed; using WASM',gpuError);engine=await loadWasm()}}status('YapThing ready · on device');magic(false);$('load-model').hidden=true;hideAIHelp()}catch(e){console.error('The reply was interrupted',e);status('AI unavailable');magic(false);showAIHelp('AI could not start','The private replies download or initialization failed. Check free storage and internet access, then retry. Details: '+String(e?.message||e).slice(0,140));revealRetry()}finally{modelLoading=false;updateUsage()}};

$('form').onsubmit=async e=>{e.preventDefault();const responseMode=window.YapResponseModes?.current(),responseStarted=performance.now();const input=$('prompt'),text=input.value.trim();const doc=window.YapAttachments?.getDocument?.()||'';const hasPhoto=!!window.YapPhotoVision?.hasPhoto();const cloud=!!window.YapWebAccount?.getUserId();if((!text&&!hasPhoto&&!doc)||busy)return;
if(incognito&&(hasPhoto||doc)){status('Attachments are unavailable in Incognito. Switch to Chat to add files.');return;}
const direct=!incognito&&!hasPhoto&&!doc?window.YapChatServices?.parse(text):null;
if(direct){
 let target=ensureCurrentChat();
 const uid=window.YapWebAccount?.getUserId(),tid=active;target.messages.push({role:'user',text});input.value='';busy=true;persist();render();updateUsage();status('Getting your result');
 try{const result=await window.YapChatServices.run(direct);if(uid!==window.YapWebAccount?.getUserId())return;target.messages.push({role:'assistant',...result});}
 catch(error){if(uid===window.YapWebAccount?.getUserId())target.messages.push({role:'assistant',text:String(error.message||'Service unavailable'),source:'service-notice'});}
 finally{busy=false;persist();if(active===tid)render();updateUsage();status('Ready');}return;
}
const learnedPref=!hasPhoto&&!doc?window.YapChatServices?.learnExplicitStyle?.(text):null;const instant=(!hasPhoto&&!doc?yapIdentityReply(text):null)||(learnedPref?{text:learnedPref,source:'yap-preference'}:null)||window.YapResearchFallback?.supportAnswer(text)||(!hasPhoto&&!doc?window.YapLocation?.clockAnswer(text):null);if(instant){let chat=ensureCurrentChat();chat.messages.push({role:'user',text},{role:'assistant',text:instant.text,source:instant.source||'clock',at:instant.at});input.value='';persist();render();updateUsage();return;}if(hasPhoto&&text&&($('yap-image-action')?.value==='edit'||($('yap-image-action')?.value!=='analyze'&&/\b(edit|modify|replace|remove|erase|add|insert|retouch|enhance|eiffel tower)\b/i.test(text)))){$('edit-preset').value='original';$('edit-run').click();return;}if(hasPhoto&&!cloud){$('account-panel').hidden=false;status('Sign in to analyze photos');$('account-state').textContent='Sign in to analyze your attached photo. It will stay attached until you send.';$('account-email').focus();return}const prior=currentChat()?.messages||[];const effectiveText=!hasPhoto&&!doc?(window.YapLocation?.resolveTurn(text,prior)||text):text;const localMissing=!hasPhoto&&!doc&&window.YapLocation?.localIntent(effectiveText)&&!window.YapLocation.snapshot().label;if(localMissing){let chat=ensureCurrentChat();chat.messages.push({role:'user',text},{role:'assistant',text:'Which city or region should I use? Reply with your city, or use a location option below. I’ll use it for local questions in this session.',source:'location-question',localQuestion:effectiveText});input.value='';persist();render();updateUsage();return;}const searchQuery=window.YapLocation?.queryFor(effectiveText,prior)||effectiveText;const localContext=window.YapLocation?.contextFor(effectiveText)||'';const task=window.YapTaskDrafts;const leaseRequest=!hasPhoto&&!!task?.leaseIntent(text);const chosenSearch=document.getElementById('search-source')?.value||'auto';const researchRequest=!hasPhoto&&(chosenSearch!=='auto'||!!window.YapLocation?.localIntent(effectiveText)||!!window.YapResearchFallback?.shouldSearch(searchQuery));if(!cloud&&!engine&&!leaseRequest&&!researchRequest){if(modelLoading)return;await $('load-model').onclick();if(!engine)return;}if(updateUsage()){ $('upgrade').hidden=false;$('upgrade').querySelector('strong').textContent='You have reached your plan limit';$('upgrade').querySelector('p').textContent='Upgrade to keep chatting, or wait until your allowance resets.';return;}let chat=ensureCurrentChat();if(!hasPhoto&&!cloud&&!leaseRequest&&!researchRequest)incrementUsage();const imageRef=hasPhoto&&!incognito?await window.YapImageStore.store(window.YapPhotoVision.file()):null;
 chat.messages.push({role:'user',text:doc?(text+'\n\nAttached document text:\n'+doc).slice(0,12000):hasPhoto?(text||'Describe this photo'):text,...(imageRef||{})});input.value='';if(doc)window.YapAttachments?.clearDocument?.();if(!incognito){if(forgetName(text)){cloudName='';if(cloud)window.YapWebAccount.deleteName().catch(console.warn)}else{learnName(text);if(cloud){const name=getName();if(name){cloudName=name;window.YapWebAccount.saveName(name).catch(console.warn)}}}}persist();render();busy=true;$('send').textContent='Working…';$('send').disabled=true;const searching=cloud&&!hasPhoto&&(needsWebSearch(text)||researchRequest);status(searching?'Searching for sources…':researchRequest?'Checking research options…':leaseRequest?'Preparing your lease draft…':'Working…');const activity=window.YapActivity?.start('yapthing',searching?'Looking for sources…':hasPhoto?'Reading your picture…':'Preparing your reply…');let responseComplete=false;try{const context=chat.messages.filter(m=>(m.role==='user'||m.role==='assistant')&&typeof m.text==='string'&&m.text.trim()&&m.text!=='YAPTHING_WORKING').slice(-16).map(m=>({role:m.role,content:m.text.replace(/^YAPTHING_WORKING/,'')}));if(context.at(-1)?.role!=='user')throw new Error('The latest user message was missing; please retry.');context.unshift({role:'system',content:"Speak like a thoughtful collaborator: lead with a useful answer or a usable draft, use the user’s stated goals and preferences, and keep follow-up questions to one essential question. For content requests, produce the content and invite a specific refinement. Avoid canned enthusiasm, robotic preambles, and repeated use of the user’s name. Be clear about uncertainty and never pretend to have taken actions."});if(chat.messages.slice(-4).some(m=>m.source==='support'))context.unshift({role:'system',content:'The recent conversation includes a safety support request. Respond with empathy and check immediate safety when relevant. Do not diagnose, prescribe, or invent regional emergency or helpline numbers. Offer human support; cite official resources only after a verified lookup and ask for country when needed.'});if(responseMode)context.unshift({role:'system',content:responseMode.instruction});const savedName=incognito?'':(cloudName||getName());if(savedName)context.unshift({role:'system',content:'The user previously introduced themselves as '+savedName+'. Use this only when relevant and do not repeatedly address them by name.'});if(localContext)context.unshift({role:'system',content:localContext});if(leaseRequest&&cloud)context.unshift({role:'system',content:task.taskInstruction(text)});if(/\b(site plan|plot layout|building layout|floor plan|zoning|planning controls)\b/i.test(text)){context.unshift({role:'system',content:'For site planning and building concepts, first identify location, local council, survey dimensions, orientation, access, easements and intended use. Search official local planning sources where live search is available. Do not invent zoning, setbacks, FSR, height limits, permissions, or exact plot dimensions. Separate confirmed planning controls from assumptions and show conceptual layouts only. Clearly state that a licensed local professional must verify compliance and any permit drawings.'});}const reply={role:'assistant',text:''};reply.text='YAPTHING_WORKING';chat.messages.push(reply);render();await new Promise(resolve=>requestAnimationFrame(()=>resolve()));reply.text='YAPTHING_WORKING';if(researchRequest&&!cloud){reply.text='Live web research requires a YapThing account. Sign in to retrieve current sources, or use the Search web link below to research this question yourself. I have not searched the web or verified any claims.';reply.webSearchQuery=searchQuery;}else if(leaseRequest&&!cloud){reply.text=task.leaseDraft(text);}else if(hasPhoto){const response=await window.YapPhotoVision.analyze(text||'Describe this photo',context.slice(0,-1));reply.text=String(response.answer||'No visual response returned.');await window.YapWebAccount?.status();}else if(cloud&&document.getElementById('yap-workspace')?.value==='medical-education'){
 const token=await window.YapWebAccount.getToken();
 const response=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/medical-education',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({question:text,responseMode:responseMode?.id||'balance',level:document.getElementById('yap-medical-level')?.value||'student'})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Medical education service unavailable');
 reply.text=String(data.answer||'')+'\n\n'+String(data.disclaimer||'For education only.');
 reply.sources=Array.isArray(data.sources)?data.sources:[];
 status('Medical education · literature reviewed');
 await window.YapWebAccount?.status();
 }else if(cloud&&researchRequest&&!doc){try{const result=await window.YapResearchFallback.research(searchQuery,chosenSearch,responseMode?.id);reply.mode=responseMode?.name;reply.durationMs=Math.round(performance.now()-responseStarted);reply.text=result.answer+(result.scope?'\n\n'+result.scope:'');reply.sources=result.sources;reply.searchSuggestions=result.searchSuggestions||'';status('Search complete · '+result.provider+(result.durationMs?' · '+(result.durationMs/1000).toFixed(1)+'s':''));}catch(error){
 const message=String(error?.message||'Search unavailable');
 const authenticationFailed=
   [401,403].includes(error?.status) ||
   /sign in|session expired|unauthorized/i.test(message);

 if(authenticationFailed){
   reply.text='Please sign in again to access live research.';
   reply.sources=[];
   reply.source='search-notice';
   reply.webSearchQuery=searchQuery;
   $('account-panel').hidden=false;
   status('Sign in required');
 }else{
   try{
     const fallbackPrompt=
       'Answer using general knowledge only. Do not claim to have '+
       'searched the internet or verified current facts. Clearly '+
       'explain when recent information cannot be confirmed. '+
       'User question: '+text;

     const response=await window.YapPhotoVision.ask(
       fallbackPrompt,
       context.slice(0,-1),
       false
     );

     reply.text=
       'Live research was unavailable. This is an AI answer '+
       'without verified current sources:\n\n'+
       String(response.answer||'No response returned.');

     reply.sources=[];
     reply.source='ungrounded-fallback';
     reply.webSearchQuery=searchQuery;
     reply.mode=responseMode?.name;
     reply.durationMs=Math.round(performance.now()-responseStarted);
   }catch(aiError){
     reply.text=
       'Live research and general AI chat are unavailable. '+
       String(aiError?.message||'Please try again.');
     reply.sources=[];
     reply.source='search-notice';
     reply.webSearchQuery=searchQuery;
   }
 }
}}else if(cloud){try{const response=await window.YapPhotoVision.ask(doc?(text+'\n\nAttached document text:\n'+doc).slice(0,14000):(localContext?text+'\n\n'+localContext:text),context.slice(0,-1),searching);reply.mode=responseMode?.name||'Yap Auto';reply.durationMs=Math.round(performance.now()-responseStarted);reply.text=String(response.answer||'No response returned.');reply.sources=Array.isArray(response.sources)?response.sources:[];window.YapWebAccount?.status();}catch(primaryError){if(!searching||!window.YapResearchFallback||hasPhoto||/quota|limit|429|sign in|session|401|expired/i.test(String(primaryError?.message||primaryError)))throw primaryError;status('Checking another research source…');try{const result=await window.YapResearchFallback.research(searchQuery);reply.text='Research fallback ('+result.provider+'):\n\n'+result.answer+(result.scope?'\n\nSource limitations: '+result.scope:'');reply.sources=result.sources;reply.searchSuggestions=result.searchSuggestions||'';}catch(fallbackError){throw Error(String(primaryError?.message||primaryError)+'; '+String(fallbackError?.message||fallbackError))}}}else if(backend==='wasm'){const promptMessages=yapLocalMessages(context);const result=await engine(promptMessages,{max_new_tokens:96,do_sample:false,return_full_text:false});const output=result?.[0]?.generated_text;reply.text=typeof output==='string'?output:Array.isArray(output)?output.filter(m=>m.role==='assistant').map(m=>m.content).join(''):'';}else{reply.text='';const stream=await engine.chat.completions.create({messages:yapLocalMessages(context),temperature:0.7,max_tokens:160,stream:true});let lastPaint=0;for await(const part of stream){const token=part.choices?.[0]?.delta?.content||'';reply.text+=token;const now=Date.now();if(now-lastPaint>90){lastPaint=now;const box=$('messages');const last=Array.from(box.querySelectorAll('.message')).at(-1);if(last&&last.classList.contains('message')){last.classList.remove('yap-working');last.textContent=reply.text;}box.scrollTop=box.scrollHeight}}}if(reply.text.startsWith('YAPTHING_WORKING'))reply.text=reply.text.slice('YAPTHING_WORKING'.length);if(!reply.text)reply.text='No response was generated.';else responseComplete=true;}catch(err){console.error(err);const reason=String(err?.message||err).slice(0,180);const last=chat.messages[chat.messages.length-1];if(last?.role==='assistant'&&(last.text==='YAPTHING_WORKING'||!last.text))chat.messages.pop();chat.messages.push({role:'system',text:(hasPhoto||cloud?'Your request was interrupted: ':'Your reply was interrupted: ')+reason});if((hasPhoto||cloud)&&!String(err.code||'').startsWith('PROVIDER_')&&/provider unavailable|quota|429|rate limit|cloud request failed/i.test(reason)){const upgrade=$('upgrade');if(upgrade){upgrade.hidden=false;upgrade.querySelector('strong').textContent=/quota|429|rate limit/i.test(reason)?'Cloud usage limit reached':'The response service is temporarily unavailable';upgrade.querySelector('p').textContent=/quota|429|rate limit/i.test(reason)?'Your current allowance may be exhausted. Explore YapThing plans or try again after the limit resets.':'The response service is unavailable. You can retry or explore plans; upgrading does not guarantee availability during an outage.';}}if(/sign in|session expired|401/i.test(reason)){$('account-panel').hidden=false;status('Sign in required')}}finally{activity?.finish(responseComplete?'Reply ready':'Reply interrupted',!responseComplete);persist();render();busy=false;$('send').textContent='Send';updateUsage();status(window.YapWebAccount?.getUserId()?'YapThing Cloud ready':'YapThing ready · on device')}};window.addEventListener('yap:quota',updateUsage);window.addEventListener('yap:session-change',()=>{
 const next=ownerForSession();
 if(next!==owner){
  incognito=false;incognitoThread=null;
  owner=next;
  chats=readChats(owner);
  active=readActive(owner);
  $('prompt').value='';
  $('mobile-history').hidden=true;
  $('mobile-history-toggle').setAttribute('aria-expanded','false');
  document.getElementById('yap-attachment-menu')?.removeAttribute('open');
  document.getElementById('yap-tools-menu')?.removeAttribute('open');
  window.YapAttachments?.clearDocument?.();
  window.YapPhotoVision?.removePhoto?.();
  render();
  window.dispatchEvent(new CustomEvent('yap:chat-owner-changed',{detail:{userId:owner}}));
 }
 updateUsage();syncName();
});syncName();render();updateUsage();setInterval(()=>{if(!busy)updateUsage()},60000);status('Ready when you are');magic(false)
window.YapWebChat={
 owner:()=>owner,
 isIncognito:()=>incognito,
 setIncognito,
 async deleteChat(id){
  const target=chats.find(c=>c.id===id);
  if(!target)return false;
  if(busy)throw Error('Finish the current reply before deleting this chat.');
  const title=String(target.name||target.messages.find(m=>m.role==='user')?.text||'this chat').slice(0,60);
  if(!confirm('Delete "'+title+'"? This removes the conversation from every signed-in device.'))return false;
  const actor=owner;
  if(actor){
   if(typeof window.YapChatCloud?.deleteThread!=='function')throw Error('Cloud deletion is unavailable. Please retry.');
   await window.YapChatCloud.deleteThread(id);
  }
  if(actor!==ownerForSession()||owner!==actor)throw Error('Account changed. Please try again.');
  const removed=chats.find(c=>c.id===id);
  chats=chats.filter(c=>c.id!==id);
  if(active===id)active=chats[0]?.id||null;
  persist();render();
  if(removed)window.YapImageStore?.removeMessages(removed.messages).catch(e=>console.warn('Image cleanup pending',e));
  return true;
 },
 applyCloudDeletions(rows){
  if(!owner||owner!==ownerForSession()||!Array.isArray(rows))return 0;
  const deleted=new Set(rows.filter(r=>r?.deleted_at).map(r=>String(r.thread_id||'').toLowerCase()));
  const prior=chats.length;
  chats=chats.filter(c=>!deleted.has(c.id.toLowerCase()));
  if(chats.length!==prior){
   if(!chats.some(c=>c.id===active))active=chats[0]?.id||null;
   localStorage.setItem(chatKey(owner),JSON.stringify(chats));
   render();
  }
  return prior-chats.length;
 },
 detachProject(id){
  let changed=0;
  for(const c of chats){
   if(c.projectId===id){c.projectId='';c.projectOwner=owner||'guest';changed++;}
  }
  if(changed){persist();render();}
  return changed;
 },
 snapshot:()=>owner&&owner===ownerForSession()?chats
  .filter(c=>Array.isArray(c.messages)&&c.messages.some(m=>m.role==='user'))
  .map(c=>({id:c.id,title:String(c.name||c.messages.find(m=>m.role==='user')?.text||'New chat').slice(0,100),
    updated:Number(c.updated)||0,messages:c.messages
      .filter(m=>['user','assistant','model','thing'].includes(m.role)&&typeof m.text==='string'&&m.text.trim()&&m.text!=='YAPTHING_WORKING')
      .slice(-65).map(m=>({role:m.role==='user'?'user':'assistant',text:m.text.slice(0,2000),...(window.YapImageStore?.validPath(m.imagePath)?{imagePath:m.imagePath}:{})}))})):[],
 mergeCloud(rows){
  if(!owner||owner!==ownerForSession()||!Array.isArray(rows))return 0;
  let changed=0;
  const valid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
  for(const row of rows.slice(0,80)){
   const id=String(row?.thread_id||'').toLowerCase();
   if(!valid.test(id)||!Array.isArray(row.messages))continue;
   const messages=row.messages.filter(m=>m&&typeof m.text==='string'&&
      ['user','assistant','model','thing'].includes(m.role))
      .slice(-65).map(m=>({role:m.role==='user'?'user':'assistant',text:m.text.slice(0,2000),...(window.YapImageStore?.validPath(m.imagePath)?{imagePath:m.imagePath}:{})}));
   if(!messages.length)continue;
   const existing=chats.find(c=>c.id.toLowerCase()===id);
   if(!existing){
    chats.push({id,messages,name:String(row.title||'').slice(0,100),
      updated:Date.parse(row.updated_at)||Date.now()});changed++;continue;
   }
   const localText=JSON.stringify(existing.messages.filter(m=>['user','assistant','model','thing'].includes(m.role))
    .map(m=>({role:m.role==='user'?'user':'assistant',text:String(m.text||'').slice(0,2000)})).slice(-65));
   const remoteText=JSON.stringify(messages);
   if(localText===remoteText){
    let patched=false;for(let i=0;i<messages.length;i++){
     if(messages[i].imagePath&&!existing.messages[i]?.imagePath){existing.messages[i].imagePath=messages[i].imagePath;patched=true}
    }
    if(patched)changed++;continue;
   }
   if(messages.length>existing.messages.length&&
      Number(existing.updated||0)<=Date.parse(row.updated_at||'')+2000){
    existing.messages=messages;existing.updated=Date.parse(row.updated_at)||Date.now();changed++;
   }
  }
  if(changed){
   chats=chats.slice(-80).sort((a,b)=>(b.updated||0)-(a.updated||0));
   try{localStorage.setItem(chatKey(owner),JSON.stringify(chats))}catch{}
   if(!chats.some(c=>c.id===active))active=chats[0]?.id||null;
   render();
  }
  return changed;
 },
 importLegacy(){
  if(!owner||owner!==ownerForSession())return 0;
  let old;try{old=JSON.parse(localStorage.getItem(legacyKey)||'[]')}catch{return 0}
  if(!Array.isArray(old))return 0;
  let added=0;
  for(const chat of old.slice(0,50)){
   if(!Array.isArray(chat?.messages)||!chat.messages.some(m=>m?.role==='user'))continue;
   const id=crypto.randomUUID();
   chats.push({id,updated:Date.now()+added,name:String(chat.name||'').slice(0,100),
     messages:chat.messages.filter(m=>m&&typeof m.text==='string'&&
       ['user','assistant','model','thing'].includes(m.role))
       .slice(-65).map(m=>({role:m.role==='user'?'user':'assistant',text:m.text.slice(0,2000)}))});
   added++;
  }
  if(added){active=chats[chats.length-added]?.id||active;persist();render()}
  return added;
 },
 listChats:()=>chats.map(c=>({id:c.id,name:c.name||'',preview:c.messages.find(m=>m.role==='user')?.text||'',updated:c.updated||0,projectId:c.projectOwner===(window.YapWebAccount?.getUserId()||'guest')?c.projectId||'':''})),getProjectId:()=>{if(incognito)return '';const c=currentChat();return c?.projectOwner===(window.YapWebAccount?.getUserId()||'guest')?c.projectId||'':'';},newChat(projectId=''){incognito=false;incognitoThread=null;const c={id:crypto.randomUUID(),messages:[],projectId,projectOwner:window.YapWebAccount?.getUserId()||'guest',updated:Date.now()};chats.unshift(c);active=c.id;$('prompt').value='';persist();render();$('prompt').focus();},openChat(id){if(!chats.some(c=>c.id===id))return false;incognito=false;incognitoThread=null;active=id;$('prompt').value='';render();return true;},setProjectId(projectId){if(incognito)return false;const c=currentChat();if(!c)return false;c.projectId=projectId;c.projectOwner=window.YapWebAccount?.getUserId()||'guest';persist();render();return true;},add(text,role='assistant'){let chat=ensureCurrentChat();chat.messages.push({role,text:String(text).slice(0,16000)});persist();render();},latest:()=>currentChat()?.messages?.filter(m=>m.role==='assistant').at(-1)?.text||''};
})();