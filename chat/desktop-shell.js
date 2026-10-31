'use strict';
(()=>{
const top=document.querySelector('.topline'),actions=document.querySelector('.top-actions');
if(!top||!actions)return;
const menu=document.createElement('details');menu.id='yap-desktop-menu';
const toggle=document.createElement('summary');toggle.textContent='☰';toggle.setAttribute('aria-label','Toggle sidebar');toggle.setAttribute('aria-controls','yap-tool-menu');menu.append(toggle);
const drawer=document.createElement('nav');drawer.id='yap-tool-menu';drawer.setAttribute('aria-label','Chat sidebar');
const label=document.createElement('span');label.className='yap-sidebar-caption';label.textContent='WORKSPACE';drawer.append(label);
const close=document.createElement('button');close.type='button';close.className='yap-sidebar-close';close.textContent='Close sidebar';close.onclick=()=>{menu.open=false;toggle.focus();};drawer.append(close);
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
const key='yapthing-sidebar-open';
let remembered=true;try{const choice=localStorage.getItem(key);remembered=choice===null?true:choice==='true';}catch{}
menu.open=!mobile.matches&&remembered;
function sync(){const open=menu.open;document.body.classList.toggle('yap-sidebar-open',open);toggle.setAttribute('aria-expanded',String(open));
 if(!open&&accountPanel){accountPanel.hidden=true;accountButton?.setAttribute('aria-expanded','false');}
 try{if(!mobile.matches)localStorage.setItem(key,String(open));}catch{}}
toggle.addEventListener('click',event=>{event.preventDefault();menu.open=!menu.open;sync();});
menu.addEventListener('toggle',sync);sync();
document.addEventListener('click',e=>{if(mobile.matches&&!menu.contains(e.target))menu.open=false;});
drawer.addEventListener('click',e=>{
 if(!mobile.matches||!e.target.closest('button,a'))return;
 if(e.target.closest('#account-toggle,#account-panel,#yap-menu-settings,.yap-project-navigation'))return;
 menu.open=false;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;toggle.focus();}});
mobile.addEventListener('change',()=>{menu.open=false;sync();});
})();
