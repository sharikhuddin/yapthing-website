'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const file of ['chat/response-modes.js','chat/improvement-draft.js','chat/workspace-tools.js']){
 const text=read(file);
 assert(!/\b(?:Gemini|Google Search|Brave Search|Google model)\b/i.test(text),file+' leaks provider branding in UI copy');
}
const modes=read('chat/response-modes.js');
for(const label of ['Yap Auto','Yap Swift','Yap Balance','Yap Depth','Yap Story'])assert(modes.includes(label));
const chat=read('chat/chat.js');
assert(!chat.includes('const modelName='),'cloud reply must not show raw provider model');
assert(chat.includes("reply.mode=responseMode?.name||'Yap Auto'"),'reply uses YapThing label');
const work=read('chat/work-chat.js');
assert(work.includes("google:['Y','Yap Verify']")&&work.includes("brave:['Y','Yap Search']"));
const research=read('chat/research-fallback.js');
assert(research.includes("?'Yap Verify'")&&research.includes("?'Yap Search'"));
const html=read('chat/index.html');
assert(html.includes('<option value="google">Yap Verify</option>'));
assert(html.includes('<option value="brave">Yap Web</option>'));
const privacy=read('privacy/index.html');
assert(/Google's Gemini service/.test(privacy),'real external processing remains disclosed in Privacy Policy');
console.log('PASS YapThing-only website feature labels, hidden model IDs and truthful privacy disclosure');
