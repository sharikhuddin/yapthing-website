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
const settings=document.createElement('details');settings.id='yap-menu-settings';const summary=document.createElement('summary');summary.textContent='Settings';settings.append(summary,actions);
const study=document.getElementById('yap-study-controls');if(study)settings.append(study);
drawer.append(settings);menu.append(drawer);top.prepend(menu);
// Keep account access in the header, not buried two menus deep.
const accountButton=actions.querySelector('#account-toggle');
if(accountButton){accountButton.classList.add('yap-account-entry');top.append(accountButton);}
const plans=actions.querySelector('a[href="../plans/"]');if(plans)plans.textContent='Plan & usage';
const mobile=window.matchMedia('(max-width:700px)');
const key='yapthing-sidebar-open';
let remembered=false;try{remembered=localStorage.getItem(key)==='true';}catch{}
menu.open=!mobile.matches&&remembered;
function sync(){const open=menu.open;document.body.classList.toggle('yap-sidebar-open',open);toggle.setAttribute('aria-expanded',String(open));try{if(!mobile.matches)localStorage.setItem(key,String(open));}catch{}}
toggle.addEventListener('click',event=>{event.preventDefault();menu.open=!menu.open;sync();});
menu.addEventListener('toggle',sync);sync();
document.addEventListener('click',e=>{if(mobile.matches&&!menu.contains(e.target))menu.open=false;});
drawer.addEventListener('click',e=>{if(mobile.matches&&!e.target.closest('.yap-project-navigation')&&e.target.closest('button,a')&&(!settings.contains(e.target)||e.target.closest('#account-toggle,a')))menu.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;toggle.focus();}});
mobile.addEventListener('change',()=>{menu.open=false;sync();});
})();
