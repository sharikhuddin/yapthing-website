'use strict';
/* YapThing Study Mode: opt-in retrieval practice, no automatic answer disclosure. */
(()=>{
 const form=document.getElementById('form'),input=document.getElementById('prompt'),messages=document.getElementById('messages');
 if(!form||!input||!messages)return;
 let enabled=false;
 const controls=document.createElement('div');controls.id='yap-study-controls';controls.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0;font:13px system-ui';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='🎓 Study mode: Off';toggle.setAttribute('aria-pressed','false');toggle.style.cssText='border:1px solid #88a994;border-radius:999px;padding:9px 13px;background:transparent;color:inherit;cursor:pointer';
 const topic=document.createElement('input');topic.type='text';topic.placeholder='Topic or exam (e.g. USMLE, Python, biology)';topic.setAttribute('aria-label','Study topic');topic.style.cssText='flex:1 1 175px;min-width:120px;border:1px solid #8da49a;border-radius:12px;padding:9px;background:transparent;color:inherit';topic.hidden=true;
 const start=document.createElement('button');start.type='button';start.textContent='Start quiz';start.hidden=true;start.style.cssText='border:0;border-radius:12px;padding:9px 14px;background:#d9f78d;color:#193a29;font-weight:700;cursor:pointer';
 const hint=document.createElement('small');hint.textContent='One question at a time · answers stay hidden';hint.hidden=true;
 controls.append(toggle,topic,start,hint);
 // Study tools belong to the selected Student Study workflow, never the main sidebar.
 const workflow=document.getElementById('yap-workspace');
 form.insertBefore(controls,form.querySelector('.compose-row')||form.firstChild);
 const syncStudy=()=>{controls.hidden=workflow?.value!=='student-study';};
 workflow?.addEventListener('change',syncStudy);
 syncStudy();
 const instructions='You are YapThing interactive exam tutor. Ask exactly ONE exam-style question at a time for the topic below. Give 4 options (A-D) when suitable. DO NOT reveal the correct answer or rationale in this turn. Wait for the student to respond. After they answer, give supportive concise feedback, a clear explanation, and then ask the next question without revealing its answer. Adapt difficulty based on performance. For medical topics, use educational fictional cases only, not personal diagnosis. Topic: ';
 toggle.onclick=()=>{enabled=!enabled;toggle.textContent='🎓 Study mode: '+(enabled?'On':'Off');toggle.setAttribute('aria-pressed',String(enabled));topic.hidden=start.hidden=hint.hidden=!enabled;if(enabled)topic.focus()};
 start.onclick=()=>{const t=topic.value.trim();if(!t){topic.focus();return}input.value=instructions+t;input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));};
 // For responses containing an explicit Answer: section, conceal the answer until requested.
 function hideAnswer(el){if(el.dataset.studyProcessed||el.classList.contains('user')||el.classList.contains('yap-working'))return;el.dataset.studyProcessed='1';const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){const value=node.nodeValue||'';const match=value.match(/(?:^|\n)\s*(?:Correct answer|Answer|Self-check answer)\s*:\s*/i);if(!match)continue;const pos=match.index+match[0].length;if(pos>=value.length)continue;const before=value.slice(0,match.index);const answer=value.slice(pos);node.nodeValue=before;const details=document.createElement('details');details.className='yap-answer-reveal';details.style.cssText='margin:12px 0;padding:12px;border:1px solid #8da49a;border-radius:12px';const summary=document.createElement('summary');summary.textContent='Reveal answer and explanation';summary.style.cursor='pointer';const content=document.createElement('div');content.textContent=answer;content.style.cssText='white-space:pre-wrap;margin-top:9px';details.append(summary,content);node.parentNode.insertBefore(details,node.nextSibling);break;}}
 const observer=new MutationObserver(()=>{if(!enabled)return;for(const el of messages.querySelectorAll('.message:not([data-study-processed])'))hideAnswer(el)});
 observer.observe(messages,{childList:true,subtree:true});
 window.YapStudyMode={enable:()=>{if(!enabled)toggle.click();topic.focus()}};
})();
