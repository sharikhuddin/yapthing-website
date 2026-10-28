'use strict';
(()=>{
 const select=document.getElementById('yap-workspace');
 const start=document.getElementById('yap-workspace-start');
 const hint=document.getElementById('yap-workspace-hint');
 const prompt=document.getElementById('prompt');
 if(!select||!start||!hint||!prompt)return;
 const tasks={
  general:{hint:'Ask anything, attach an image, or choose a search engine.',prompt:'Help me with this task. Ask only for information needed to get started: '},
  personal:{hint:'Plan routines, budgets, travel, decisions and daily responsibilities.',prompt:'Help me organize my personal life. First, help me prioritize what needs attention today, then make a realistic plan I can follow. My situation: '},
  work:{hint:'Draft emails, summarize tasks and improve workflows.',prompt:'Act as my work productivity assistant. Help me turn this goal into an actionable checklist, identify repetitive steps to automate, and draft any messages or documents needed. Goal: '},
  design:{hint:'Explore room layouts and building concepts; professional review required.',prompt:'Help me create a conceptual site plan for this property. Location (city, council/LGA, suburb): Sydney, NSW, Australia. Ask for the exact site address or lot/DP, surveyed dimensions, street frontage, north direction, slope, easements, zoning and desired building use. Search official NSW Planning Portal and local council planning controls, citing sources and dates. Distinguish verified requirements from assumptions. Give a dimensioned conceptual site layout and alternatives only after I provide enough details. Flag setbacks, FSR, site coverage, height, bushfire/flood/heritage overlays and BASIX as checks, not presumed approvals. This is not a survey, DA approval or signed architectural/engineering plan. My plot details: '},
  photo:{hint:'Attach a photo, describe the changes, then choose Edit with AI.',prompt:'Edit the attached photo while keeping important details consistent. Make these changes: '},
  research:{hint:'Choose Google, Brave or Parallel Sources for current information.',prompt:'Research this topic using reliable sources, compare evidence and explain what is confirmed versus uncertain: '}
 };
 try{const stored=localStorage.getItem('yapthing.workspace.preference');if(tasks[stored])select.value=stored}catch{}
 function update(){const t=tasks[select.value]||tasks.general;hint.textContent=t.hint;try{localStorage.setItem('yapthing.workspace.preference',select.value)}catch{}}
 select.addEventListener('change',update);
 start.addEventListener('click',()=>{
  const t=tasks[select.value]||tasks.general;
  if(!prompt.value.trim())prompt.value=t.prompt;
  if(select.value==='research'){const source=document.getElementById('search-source');if(source&&source.value==='auto')source.value='parallel'}
  if(select.value==='photo'&&!document.getElementById('photo-input')?.files?.length)hint.textContent='Attach a picture using + Attach, then use Edit with AI.';
  prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();
 });
 update();
})();