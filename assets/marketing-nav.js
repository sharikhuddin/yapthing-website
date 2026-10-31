'use strict';
(()=>{
 const menu=document.querySelector('.marketing-site .header .menu');
 const nav=document.querySelector('.marketing-site .header #site-links');
 if(!menu||!nav)return;
 const setOpen=open=>{
  const yes=!!open;nav.classList.toggle('open',yes);
  menu.setAttribute('aria-expanded',String(yes));
  menu.setAttribute('aria-label',yes?'Close navigation':'Open navigation');
  menu.querySelector('span')&&(menu.querySelector('span').textContent=yes?'×':'☰');
 };
 menu.addEventListener('click',()=>setOpen(!nav.classList.contains('open')));
 nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false)});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!nav.contains(event.target))setOpen(false)});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const was=nav.classList.contains('open');setOpen(false);if(was)menu.focus()}});
 window.matchMedia('(min-width:701px)').addEventListener('change',event=>{if(event.matches)setOpen(false)});
})();
