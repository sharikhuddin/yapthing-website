'use strict';
(()=>{
 const chat=window.YapWebChat,controls=document.querySelector('.topline .yap-mode-controls');
 if(!chat||!controls||document.getElementById('yap-incognito-toggle'))return;
 const button=document.createElement('button');
 button.type='button';button.id='yap-incognito-toggle';
 button.setAttribute('aria-label','Start an Incognito Chat');
 button.setAttribute('aria-pressed','false');button.title='Incognito chat — not saved to history';
 const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');
 icon.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18M6 10l2-5h8l2 5"/><circle cx="8.5" cy="15" r="2.5"/><circle cx="15.5" cy="15" r="2.5"/><path d="M11 15h2"/></svg>';
 const label=document.createElement('span');label.textContent='Incognito';label.className='yap-incognito-label';
 button.append(icon,label);controls.append(button);
 const notice=document.createElement('div');notice.id='yap-incognito-notice';
 notice.setAttribute('role','status');notice.hidden=true;
 const badge=document.createElement('strong');badge.textContent='Incognito chat';
 const description=document.createElement('span');
 description.textContent='Not saved to YapThing history or memory. AI providers still process requests and service logs may apply. No file uploads or plugin actions.';
 notice.append(badge,description);
 document.querySelector('.workspace>.top')?.after(notice);
 const sync=()=>{
  const on=chat.isIncognito();
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',on?'Exit Incognito Chat':'Start an Incognito Chat');
  button.title=on?'Exit Incognito — discard this conversation':'Incognito chat — not saved to history';
  label.textContent=on?'Exit Incognito':'Incognito';
  notice.hidden=!on;
  const files=document.getElementById('yap-attachment-menu');
  if(files&&on)files.open=false;
 };
 button.addEventListener('click',()=>{
  if(chat.setIncognito(!chat.isIncognito()))sync();
 });
 const mode=document.getElementById('yap-conversation-mode');
 mode?.addEventListener('change',()=>{
  if(mode.value==='work'&&chat.isIncognito())chat.setIncognito(false);
 },true);
 window.addEventListener('yap:incognito-changed',sync);
 window.addEventListener('yap:session-change',sync);
 sync();
})();
