'use strict';
(()=>{
const top=document.querySelector('.topline'),actions=document.querySelector('.top-actions');
if(!top||!actions)return;
const menu=document.createElement('details');menu.id='yap-desktop-menu';
const toggle=document.createElement('summary');toggle.textContent='\u2630';toggle.setAttribute('aria-label','Toggle sidebar');toggle.setAttribute('aria-controls','yap-tool-menu');menu.append(toggle);
const drawer=document.createElement('nav');drawer.id='yap-tool-menu';drawer.setAttribute('aria-label','Chat sidebar');
const label=document.createElement('span');label.className='yap-sidebar-caption';label.textContent='WORKSPACE';drawer.append(label);
const close=document.createElement('button');close.type='button';close.className='yap-sidebar-close';
close.setAttribute('aria-label','Collapse sidebar');close.title='Collapse sidebar';
close.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M17 9l-3 3 3 3"/></svg>';
close.onclick=()=>{menu.open=false;toggle.focus();};drawer.append(close);
const aside=document.querySelector('body>main>aside'),history=aside?.querySelector('#history'),fresh=aside?.querySelector('#new');
if(fresh){fresh.textContent='＋ New chat';drawer.append(fresh);}
if(history){const chats=document.createElement('section');chats.className='yap-recent-navigation';const heading=document.createElement('h3');heading.textContent='Recent chats';chats.append(heading,history);drawer.append(chats);}
if(aside)aside.hidden=true;
const settings=document.createElement('details');settings.id='yap-menu-settings';const summary=document.createElement('summary');summary.textContent='⚙  Settings';settings.append(summary,actions);
const study=document.getElementById('yap-study-controls');if(study)settings.append(study);
const footer=document.createElement('div');footer.className='yap-sidebar-footer';
footer.append(settings);
const accountButton=actions.querySelector('#account-toggle');
const accountPanel=document.getElementById('account-panel');
if(accountButton){
 accountButton.type='button';
 accountButton.className='yap-account-entry';
 accountButton.setAttribute('aria-controls','account-panel');
 accountButton.setAttribute('aria-haspopup','dialog');
 const logo=document.createElement('img');logo.src='yapthing-icon.svg';logo.alt='';
 const words=document.createElement('span');words.className='yap-account-identity';
 const name=document.createElement('span');name.className='yap-account-name';
 const signed=window.YapSession?.get?.()?.user;
 name.textContent=signed?.email||'Sign in';
 const sub=document.createElement('small');sub.className='yap-account-meta';
 sub.textContent=signed?'Manage your account':'Use YapThing across devices';
 words.append(name,sub);
 const arrow=document.createElement('span');arrow.className='yap-account-chevron';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
 accountButton.replaceChildren(logo,words,arrow);
 footer.append(accountButton);
}
if(accountPanel){accountPanel.setAttribute('role','dialog');accountPanel.setAttribute('aria-label','YapThing account');footer.append(accountPanel);}
drawer.append(footer);menu.append(drawer);top.prepend(menu);
const plans=actions.querySelector('a[href="../plans/"]');if(plans)plans.textContent='Plan & usage';
const mobile=window.matchMedia('(max-width:700px)');
// Resizing only affects desktop layout; persist the chosen width on this device.
const widthKey='yapthing.sidebar.width.v1',minWidth=224,maxWidth=440;
const clampWidth=w=>Math.round(Math.min(maxWidth,Math.max(minWidth,Number(w)||280)));
let sidebarWidth=280;
try{sidebarWidth=clampWidth(localStorage.getItem(widthKey)||280);}catch{}
document.documentElement.style.setProperty('--yap-sidebar-width',sidebarWidth+'px');
const grip=document.createElement('div');grip.className='yap-sidebar-resize';
grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','vertical');
grip.setAttribute('aria-label','Resize sidebar');grip.title='Drag to resize sidebar';
grip.setAttribute('aria-valuemin',String(minWidth));grip.setAttribute('aria-valuemax',String(maxWidth));
const setWidth=(width,persist=false)=>{
 sidebarWidth=clampWidth(width);
 document.documentElement.style.setProperty('--yap-sidebar-width',sidebarWidth+'px');
 grip.setAttribute('aria-valuenow',String(sidebarWidth));
 if(persist){try{localStorage.setItem(widthKey,String(sidebarWidth));}catch{}}
};
setWidth(sidebarWidth);
let drag=null;
grip.addEventListener('pointerdown',event=>{
 if(event.button!==0||mobile.matches)return;
 drag=event.pointerId;
 event.preventDefault();event.stopPropagation();
 grip.setPointerCapture?.(event.pointerId);
 document.body.classList.add('yap-sidebar-resizing');
});
grip.addEventListener('pointermove',event=>{if(drag===event.pointerId)setWidth(event.clientX);});
const endDrag=event=>{if(drag!==event.pointerId)return;drag=null;document.body.classList.remove('yap-sidebar-resizing');setWidth(sidebarWidth,true);};
grip.addEventListener('pointerup',endDrag);grip.addEventListener('pointercancel',endDrag);
grip.addEventListener('keydown',event=>{
 if(mobile.matches||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const target=event.key==='Home'?minWidth:event.key==='End'?maxWidth:sidebarWidth+(event.key==='ArrowLeft'?-16:16);
 setWidth(target,true);
});
drawer.append(grip);
const backdrop=document.createElement('button');backdrop.type='button';backdrop.id='yap-sidebar-backdrop';
backdrop.setAttribute('aria-label','Dismiss sidebar');backdrop.tabIndex=-1;
backdrop.hidden=true;document.body.append(backdrop);
const key='yapthing-sidebar-open';
let remembered=true;try{const choice=localStorage.getItem(key);remembered=choice===null?true:choice==='true';}catch{}
menu.open=!mobile.matches&&remembered;
function sync(){const open=menu.open;document.body.classList.toggle('yap-sidebar-open',open);toggle.setAttribute('aria-expanded',String(open));backdrop.hidden=!(open&&mobile.matches);
 if(!open){if(accountPanel)accountPanel.hidden=true;accountButton?.setAttribute('aria-expanded','false');if(settings.open)settings.open=false;const sub=drawer.querySelector('.yap-project-navigation');if(sub)sub.hidden=true;const projectButton=drawer.querySelector('#yap-nav-projects');projectButton?.setAttribute('aria-expanded','false');}
 try{if(!mobile.matches)localStorage.setItem(key,String(open));}catch{}}
toggle.addEventListener('click',event=>{event.preventDefault();menu.open=!menu.open;sync();});
menu.addEventListener('toggle',sync);sync();
// Clicking the conversation dismisses the sidebar on either screen size.
backdrop.addEventListener('click',()=>{menu.open=false;sync();});
document.addEventListener('pointerdown',event=>{
 if(!menu.open||drag!==null)return;
 if(menu.contains(event.target)||event.target===backdrop)return;
 if(event.target.closest('.workspace')||mobile.matches){menu.open=false;sync();}
},{passive:true});
let swipe=null;
document.addEventListener('touchstart',event=>{
 if(!mobile.matches||event.touches.length!==1)return;
 const t=event.touches[0];swipe={x:t.clientX,y:t.clientY,inside:menu.contains(event.target),open:menu.open};
},{passive:true});
document.addEventListener('touchend',event=>{
 if(!mobile.matches||!swipe||event.changedTouches.length!==1)return;
 const t=event.changedTouches[0],dx=t.clientX-swipe.x,dy=Math.abs(t.clientY-swipe.y);
 if(dy<60&&Math.abs(dx)>85&&Math.abs(dx)>dy*1.6){
  if(swipe.open&&swipe.inside&&dx<0){menu.open=false;sync();}
  // Opening remains on the hamburger: browser edge-swipe is reserved for Back navigation.
 }
 swipe=null;
},{passive:true});
drawer.addEventListener('click',e=>{
 if(!mobile.matches||!e.target.closest('button,a'))return;
 if(e.target.closest('#account-toggle,#account-panel,#yap-menu-settings,.yap-project-navigation'))return;
 menu.open=false;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;toggle.focus();}});
mobile.addEventListener('change',()=>{menu.open=false;sync();});
})();
