'use strict';
/*
 * YapThing Admin navigation shell.
 * Real, bookmarkable admin views use /admin/?view=<slug> so GitHub Pages can
 * serve all routes without a rewrite service. Every data request remains
 * subject to the existing Supabase administrator authorization checks.
 */
(()=>{
 const panel=document.getElementById('panel');if(!panel)return;
 const root='/admin/';
 const groups=[
  {name:'Workspace',items:[
   {view:'overview',label:'Overview',icon:'layout-dashboard',summary:'Your business at a glance'},
   {view:'customers',label:'Customers',icon:'users',summary:'Account directory and support'},
   {view:'customers-geography',label:'Registration geography',icon:'globe',summary:'Where accounts report registering from'},
   {view:'customers-access',label:'Plan overrides',icon:'shield-check',summary:'Controlled account adjustments'}]},
  {name:'Finance',items:[
   {view:'finance-costs',label:'AI & search costs',icon:'chart-no-axes-column',summary:'Usage and provider estimates'},
   {view:'finance-billing',label:'Billing & subscriptions',icon:'credit-card',summary:'RevenueCat and account billing'}]},
  {name:'AI systems',items:[
   {view:'ai-providers',label:'AI providers',icon:'plug',summary:'Provider configuration checks'},
   {view:'ai-knowledge',label:'YapKnowledge',icon:'book-open',summary:'Research routing and activity'}]},
  {name:'Marketing',items:[
   {view:'marketing',label:'Marketing overview',icon:'megaphone',summary:'Organic growth operations'},
   {view:'marketing-seo',label:'SEO & metadata',icon:'search-check',summary:'Public pages and metadata'},
   {view:'marketing-aeo',label:'AEO & AI Search',icon:'sparkles',summary:'Answer-engine readiness'},
   {view:'marketing-content',label:'Content & campaigns',icon:'file-pen-line',summary:'Human-reviewed marketing queue'},
   {view:'marketing-discovery',label:'Search discovery',icon:'globe',summary:'Crawler and indexing guidance'},
   {view:'marketing-website',label:'Website health',icon:'activity',summary:'On-demand public website checks'}]},
  {name:'Engineering',items:[
   {view:'engineering-code',label:'Code & deployments',icon:'git-branch',summary:'Repository status and releases'},
   {view:'engineering-launch',label:'Launch readiness',icon:'list-checks',summary:'Quality and release priorities'}]}
 ];
 const icons={
 'layout-dashboard':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 'users':'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 7a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.6"/>',
 'shield-check':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>',
 'chart-no-axes-column':'<path d="M5 20V12M12 20V5M19 20v-9"/>',
 'credit-card':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
 'plug':'<path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0V9zM12 18v4"/>',
 'book-open':'<path d="M12 7c-2-2-5-3-9-3v14c4 0 7 1 9 3 2-2 5-3 9-3V4c-4 0-7 1-9 3zM12 7v14"/>',
 'megaphone':'<path d="M3 11v4h4l11 5V6L7 11H3zM7 15l2 5h3M21 9l1-2M21 16l1 2"/>',
 'search-check':'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10l2 2 4-4"/>',
 'sparkles':'<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/>',
 'file-pen-line':'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M9 17h6M9 13h2M17 3l4 4-8 8-4 1 1-4 7-9z"/>',
 'globe':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',
 'activity':'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
 'git-branch':'<circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 6v12M18 9a6 6 0 0 1-6 6H6"/>',
 'list-checks':'<path d="m3 7 2 2 3-3M12 8h9M3 16l2 2 3-3M12 17h9"/>'
 };
 const svg=name=>'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons['layout-dashboard'])+'</svg>';
 const views=new Map();
 const oldNav=panel.querySelector(':scope > .admin-nav');
 const pageArea=document.createElement('div');pageArea.className='admin-view-area';
 const frame=document.createElement('div');frame.className='admin-workspace';
 const sidebar=document.createElement('aside');sidebar.className='admin-sidebar';sidebar.id='admin-sidebar';
 sidebar.setAttribute('aria-label','Admin navigation');
 const sidebarHead=document.createElement('div');sidebarHead.className='admin-sidebar-head';
 const logo=document.createElement('img');logo.src='/assets/yapthing-192.png';logo.alt='';logo.width=35;logo.height=35;
 const brand=document.createElement('strong');brand.textContent='YapThing';const tag=document.createElement('span');tag.textContent='Admin';
 sidebarHead.append(logo,brand,tag);sidebar.append(sidebarHead);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Admin sections');nav.className='admin-side-nav';sidebar.append(nav);
 const bottom=document.createElement('div');bottom.className='admin-sidebar-bottom';
 const back=document.createElement('a');back.href='/chat/';back.textContent='Back to YapThing';bottom.append(back);sidebar.append(bottom);
 const content=document.createElement('div');content.className='admin-main';
 const head=document.createElement('div');head.className='admin-page-header';
 const top=document.createElement('div');top.className='admin-page-top';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='admin-menu-toggle';toggle.setAttribute('aria-label','Open admin menu');toggle.setAttribute('aria-controls','admin-sidebar');toggle.setAttribute('aria-expanded','false');toggle.innerHTML=svg('layout-dashboard');
 const crumb=document.createElement('p');crumb.className='admin-breadcrumb';
 top.append(toggle,crumb);
 const heading=document.createElement('h2'),description=document.createElement('p');heading.id='admin-current-page';description.className='admin-page-description';
 head.append(top,heading,description);content.append(head,pageArea);
 const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='admin-nav-backdrop';backdrop.setAttribute('aria-label','Close admin menu');backdrop.hidden=true;
 frame.append(sidebar,content);panel.prepend(backdrop,frame);
 function viewNode(view){
  const node=document.createElement('div');node.className='admin-view';node.dataset.adminView=view;node.hidden=true;views.set(view,node);pageArea.append(node);return node;
 }
 for(const group of groups){
  const groupNode=document.createElement('div');groupNode.className='admin-nav-group';groupNode.dataset.group=group.name;
  const label=document.createElement('p');label.className='admin-nav-group-label';label.textContent=group.name;groupNode.append(label);
  for(const item of group.items){
   const link=document.createElement('a');link.href=root+'?view='+encodeURIComponent(item.view);link.dataset.adminLink=item.view;
   link.innerHTML=svg(item.icon);
   const title=document.createElement('span');title.textContent=item.label;link.append(title);
   groupNode.append(link);
  }
  nav.append(groupNode);
 }
 const sections={
  overview:document.getElementById('overview'),
  'finance-costs':document.getElementById('ai-costs'),
  'finance-billing':null,
  'ai-providers':document.getElementById('providers'),
  'ai-knowledge':document.getElementById('yapknowledge-admin'),
  'marketing-seo':document.getElementById('seo-marketing'),
  'marketing-aeo':document.getElementById('aeo-intelligence'),
  'marketing-discovery':document.getElementById('search-discovery'),
  'marketing-website':document.getElementById('aeo-title')?.closest('section'),
  'engineering-code':document.getElementById('code'),
  'engineering-launch':document.getElementById('launch'),
  customers:document.getElementById('customers')?.closest('section'),
  'customers-geography':document.getElementById('registration-geo'),
  'customers-access':document.getElementById('form')?.closest('section')
 };
 const allNative=[...panel.querySelectorAll(':scope > section')];
 sections['finance-billing']=allNative.find(s=>s.querySelector(':scope > h2')?.textContent.trim()==='Billing operations');
 for(const group of groups)for(const item of group.items){
  const page=viewNode(item.view);
  if(sections[item.view])page.append(sections[item.view]);
 }
 const campaigns=viewNode('marketing-content');
 const contentSection=document.createElement('section');contentSection.id='marketing-campaigns';
 const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='MARKETING PLANNING';
 const title=document.createElement('h2');title.textContent='Content & campaigns';
 const expl=document.createElement('p');expl.textContent='Research-led content ideas and organic campaign planning. Suggestions are automatically refreshed, but public articles and external posts require editorial approval.';
 contentSection.append(eyebrow,title,expl);
 const idea=document.getElementById('seo-ideas');
 if(idea){
  const intro=idea.previousElementSibling;
  const introHead=intro?.previousElementSibling;
  if(introHead?.tagName==='H3')introHead.remove();
  if(intro?.tagName==='P')intro.remove();
  contentSection.append(idea);
 }else contentSection.append(document.createTextNode('Ideas are not available.'));
 campaigns.append(contentSection);
 const marketing=viewNode('marketing');
 const marketingSection=document.createElement('section');marketingSection.id='marketing-hub';marketingSection.className='admin-marketing-hub';
 const label=document.createElement('p');label.className='eyebrow';label.textContent='GROWTH WORKSPACE';
 const intro=document.createElement('h2');intro.textContent='Make every marketing action count.';
 const subtitle=document.createElement('p');subtitle.textContent='SEO, answer-engine readiness, campaigns and website health are organized as separate pages. Automated reviews run daily; editorial publishing requires approval.';
 const cards=document.createElement('div');cards.className='admin-hub-cards';
 const map=[
  ['marketing-seo','SEO & metadata','Review page titles, descriptions, canonicals, sitemap changes and technical errors.','search-check'],
  ['marketing-aeo','AEO & AI Search','See answer-readiness findings, crawler access and suggested improvements.','sparkles'],
  ['marketing-content','Content & campaigns','Review marketing topics before publishing anything publicly.','file-pen-line'],
  ['marketing-discovery','Search discovery','Manage search-engine submission guidance and indexing diagnostics.','globe'],
  ['marketing-website','Website health','Run the existing public-page technical website audit.','activity']
 ];
 for(const [v,t,desc,ico] of map){
  const card=document.createElement('a');card.href=root+'?view='+v;card.dataset.adminLink=v;card.className='admin-hub-card';
  const symbol=document.createElement('span');symbol.innerHTML=svg(ico);const name=document.createElement('strong');name.textContent=t;
  const copy=document.createElement('small');copy.textContent=desc;const arrow=document.createElement('span');arrow.className='admin-hub-arrow';arrow.textContent='Open page';
  card.append(symbol,name,copy,arrow);cards.append(card);
 }
 marketingSection.append(label,intro,subtitle,cards);
 const note=document.createElement('div');note.className='admin-hub-note';
 note.textContent='The daily SEO & AEO maintenance workflow is separate from your browser session. AI-search citations, paid conversion and social reach require verified external analytics.';
 marketingSection.append(note);marketing.append(marketingSection);
 const metadata=new Map(groups.flatMap(g=>g.items.map(item=>[item.view,{...item,group:g.name}])));
 // Keep entry URLs from older admin bookmarks working.
 const aliases={'overview':'overview','ai-costs':'finance-costs','providers':'ai-providers','code':'engineering-code','seo-marketing':'marketing-seo','aeo-intelligence':'marketing-aeo','yapknowledge-admin':'ai-knowledge','search-discovery':'marketing-discovery','launch':'engineering-launch','aeo-title':'marketing-website','customers':'customers','marketing-campaigns':'marketing-content'};
 function fromUrl(){
  const url=new URL(location.href),raw=url.searchParams.get('view');
  if(raw&&views.has(raw))return raw;
  const hash=decodeURIComponent(url.hash.replace(/^#/,''));
  if(aliases[hash])return aliases[hash];
  return 'overview';
 }
 let current='';
 function setView(view,push){
  if(!views.has(view))view='overview';
  if(push){
   const url=new URL(location.href);url.searchParams.set('view',view);url.hash='';
   history.pushState({adminView:view},'',url.pathname+url.search);
  }
  current=view;
  for(const [name,node] of views){node.hidden=name!==view;node.setAttribute('aria-hidden',String(name!==view))}
  const info=metadata.get(view);
  const active=document.querySelectorAll('[data-admin-link]');
  for(const link of active){
   if(link.dataset.adminLink===view)link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  }
  crumb.textContent='YapThing Admin / '+info.group;
  heading.textContent=info.label;description.textContent=info.summary;
  document.title=info.label+' | YapThing Admin';
  closeMenu();
  window.dispatchEvent(new CustomEvent('yap-admin-view',{detail:{view}}));
  if(push)window.scrollTo(0,0);
 }
 function closeMenu(){
  sidebar.classList.remove('open');backdrop.hidden=true;
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open admin menu');
 }
 function toggleMenu(){
  const open=!sidebar.classList.contains('open');
  sidebar.classList.toggle('open',open);backdrop.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close admin menu':'Open admin menu');
 }
 toggle.addEventListener('click',toggleMenu);
 backdrop.addEventListener('click',()=>{closeMenu();toggle.focus()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('open')){closeMenu();toggle.focus()}});
 nav.addEventListener('click',e=>{
  const link=e.target.closest('a[data-admin-link]');if(!link)return;
  e.preventDefault();setView(link.dataset.adminLink,true);
 });
 cards.addEventListener('click',e=>{
  const link=e.target.closest('a[data-admin-link]');if(!link)return;
  e.preventDefault();setView(link.dataset.adminLink,true);
 });
 window.addEventListener('popstate',()=>setView(fromUrl(),false));
 window.addEventListener('hashchange',()=>setView(fromUrl(),false));
 if(oldNav)oldNav.remove();
 // All top-level sections must be assigned to a view, never silently exposed
 // below the new shell on the old long admin page.
 const unassigned=[...panel.querySelectorAll(':scope > section')];
 if(unassigned.length)throw Error('Admin sections missing view mapping: '+unassigned.map(n=>n.id||n.textContent.slice(0,35)).join(', '));
 setView(fromUrl(),false);
 window.YapAdminPages={getCurrent:()=>current,open:view=>setView(view,true)};
})();
