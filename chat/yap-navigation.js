'use strict';
/* YapThing navigation: Chat / Projects / Code, with Recents below.
   Built on the existing project and chat controls. */
(()=>{
 const root=document.getElementById('yap-tool-menu');
 if(!root||!document.getElementById('yap-desktop-menu')||document.getElementById('yap-nav-primary'))return;
 const sidebar=document.getElementById('yap-desktop-menu');
 const projects=root.querySelector('.yap-project-navigation');
 const recents=root.querySelector('.yap-recent-navigation');
 const newChat=document.getElementById('new');
 const settings=document.getElementById('yap-menu-settings');
 const nav=document.createElement('div');nav.id='yap-nav-primary';nav.setAttribute('aria-label','Main navigation');
 const item=(id,text,icon,fn)=>{
  const b=document.createElement('button');b.type='button';b.id=id;b.className='yap-nav-item';
  const symbol=document.createElement('span');symbol.className='yap-nav-symbol';symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent=text;b.append(symbol,label);b.addEventListener('click',fn);nav.append(b);return b;
 };
 const close=()=>{sidebar.open=false;sidebar.dispatchEvent(new Event('toggle'));};
 const chat=item('yap-nav-chat','Chat','◻',()=>{window.YapWorkChat?.setMode?.('chat');if(projects)projects.hidden=true;chat.setAttribute('aria-current','page');projectButton.removeAttribute('aria-current');close();document.getElementById('prompt')?.focus();});
 const projectButton=item('yap-nav-projects','Projects','▤',(event)=>{event.stopPropagation();
  if(!projects)return window.YapWorkChat?.projects?.();
  const showing=projects.hidden;
  projects.hidden=!showing;
  projectButton.setAttribute('aria-expanded',String(showing));
  if(showing){window.YapWorkChat?.setMode?.('work');projectButton.setAttribute('aria-current','page');chat.removeAttribute('aria-current');}
 });
 projectButton.setAttribute('aria-controls','yap-nav-project-list');projectButton.setAttribute('aria-expanded','false');
 item('yap-nav-code','Code','</>',()=>{
  close();
  if(typeof window.YapCode?.open==='function')window.YapCode.open();
  else {const status=document.getElementById('model-status');if(status)status.textContent='YapCode is unavailable in this build.';}
 });
 if(projects){projects.id='yap-nav-project-list';projects.hidden=true;nav.after(projects);}
 root.querySelector('.yap-sidebar-close')?.after(nav);
 if(newChat){newChat.classList.add('yap-nav-new');const parent=projects||nav;parent.after(newChat);newChat.textContent='+ New chat';newChat.addEventListener('click',close);}
 // Keep account settings in the quiet footer, below recent conversations.
 if(recents){
  recents.classList.add('yap-nav-recents');
  const heading=recents.querySelector('h3');if(heading)heading.textContent='Recents';
  const footer=root.querySelector('.yap-sidebar-footer');
  if(footer)root.insertBefore(recents,footer);else root.append(recents);
  // Account and Settings now stay together in the pinned footer.
  const history=document.getElementById('history');
  if(history)history.setAttribute('aria-label','Recent chats');
 }
 const update=()=>{const mode=document.getElementById('yap-conversation-mode')?.value||'chat';if(mode==='chat'){chat.setAttribute('aria-current','page');projectButton.removeAttribute('aria-current');}else{projectButton.setAttribute('aria-current','page');chat.removeAttribute('aria-current');}};
 document.getElementById('yap-conversation-mode')?.addEventListener('change',update);
 window.addEventListener('yap:session-change',()=>{if(projects)projects.hidden=true;projectButton.setAttribute('aria-expanded','false');});
 update();
})();
