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
  engineering:{hint:'Explore engineering concepts, calculations and technical documentation.',prompt:'Help me reason through this engineering problem. State assumptions, show calculations, cite applicable standards where verified, and flag any work requiring a licensed engineer or safety review. Problem: '},
  'professional-services':{hint:'Prepare professional drafts, research and structured workflows.',prompt:'Help me with this professional task. Identify the field, clarify assumptions, protect confidential information, and flag legal, financial or regulated advice that needs a qualified expert. Task: '},
  'student-study':{hint:'Study guides, exam practice and step-by-step explanations.',prompt:'Be my patient study tutor. Ask my subject and level, explain the concept clearly, then quiz me and provide feedback. Topic: '},
  design:{hint:'Plan spaces and conceptual site layouts anywhere.',prompt:'Help me plan a conceptual building or site layout. Ask for location, dimensions, orientation, local authority and intended use. Verify applicable rules with official sources and do not invent zoning, setbacks or approvals. Project: '},
  photo:{hint:'Attach a photo, describe the changes, then choose Edit with AI.',prompt:'Edit the attached photo while keeping important details consistent. Make these changes: '},
  research:{hint:'Choose Google, Brave or Parallel Sources for current information.',prompt:'Research this topic using reliable sources, compare evidence and explain what is confirmed versus uncertain: '},
  writing:{hint:'Write, edit and translate.',prompt:'Help me write a polished message or document for this audience and purpose: '},
  career:{hint:'Resumes, interviews and job research.',prompt:'Help me with this career goal. Do not invent my experience: '},
  data:{hint:'Data analysis and practical insights.',prompt:'Analyze this data or question, explaining assumptions and calculations: '},
  coding:{hint:'Build, debug and test software.',prompt:'Help me implement and test this software requirement: '},
  'medical-education':{hint:'Study anatomy, physiology, clinical reasoning and evidence-based medicine. Avoid identifiable patient details.',prompt:'Act as a medical education tutor for a student or licensed clinician. Teach this topic using evidence-based sources, explain uncertainty, and offer differential diagnosis frameworks or practice questions for learning only. Do not present educational material as a patient-specific diagnosis or treatment plan. Do not request or retain identifiable patient information. Topic: '},
  education:{hint:'Learn with explanations and exercises.',prompt:'Teach me this subject with examples and a practice exercise: '},
  business:{hint:'Operations, planning and growth.',prompt:'Help me solve this business problem with practical next steps: '},
  creative:{hint:'Original ideas and creative projects.',prompt:'Help me create and refine this original project: '}
 };
 try{const stored=localStorage.getItem('yapthing.workspace.preference');if(tasks[stored])select.value=stored}catch{}
 const medicalLevel=document.createElement('select');medicalLevel.id='yap-medical-level';medicalLevel.setAttribute('aria-label','Medical education learning level');medicalLevel.innerHTML='<option value="general">General learning</option><option value="student" selected>Medical student</option><option value="clinician">Clinical professional education</option>';medicalLevel.style.cssText='min-height:38px;max-width:260px;border-radius:10px;padding:6px;margin:6px;background:var(--panel);color:var(--fg);border:1px solid var(--border)';medicalLevel.hidden=true;hint.after(medicalLevel);
 function update(){const t=tasks[select.value]||tasks.general;hint.textContent=t.hint;medicalLevel.hidden=select.value!=='medical-education';try{localStorage.setItem('yapthing.workspace.preference',select.value)}catch{}}
 select.addEventListener('change',update);
 if(new URLSearchParams(location.search).get('workspace')==='medical-education')select.value='medical-education';
 start.addEventListener('click',()=>{
  const t=tasks[select.value]||tasks.general;
  if(!prompt.value.trim())prompt.value=t.prompt;
  if(select.value==='research'){const source=document.getElementById('search-source');if(source&&source.value==='auto')source.value='parallel'}
  if(select.value==='photo'&&!document.getElementById('photo-input')?.files?.length)hint.textContent='Attach a picture using + Attach, then use Edit with AI.';
  prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();
 });
 update();
})();