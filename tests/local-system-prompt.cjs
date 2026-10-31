'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../chat/chat.js'),'utf8');
const start=code.indexOf('const YAPTHING_IDENTITY_INSTRUCTION=');
const end=code.indexOf('function yapAnswerMarkup(el,m){',start);
assert(start>0 && end>start,'production chat must define local message normalizer');
const build=vm.runInNewContext(code.slice(start,end)+'\nyapLocalMessages');
function verify(label,prior){
 const result=build(prior);
 assert.equal(result[0].role,'system',label+' system at position zero');
 assert.equal(result.filter(m=>m.role==='system').length,1,label+' one system only');
 assert.deepEqual(Array.from(result.slice(1),m=>m.role),['user','assistant','user'],label+' turn order');
 assert.equal(result.at(-1).content,'Second question',label+' newest user last');
 return result;
}
const prior=[
 {role:'system',content:'Safety guidance'},
 {role:'system',content:'Personalization'},
 {role:'user',content:'First question'},
 {role:'assistant',content:'First answer'},
 {role:'system',content:'Original system prompt'},
 {role:'user',content:'Second question'}
];
const normalized=verify('normal chat',prior);
for(const phrase of ['YapThing','Safety guidance','Personalization','Original system prompt'])
 assert(normalized[0].content.includes(phrase));
assert(!normalized.slice(1).some(m=>m.role==='system'));
assert.equal(normalized.length,4);
const identity=vm.runInNewContext(code.slice(start,end)+'\nyapIdentityReply');
assert.equal(identity('What is your name?').text,"I'm YapThing.");
assert.doesNotMatch(identity('What is your name?').text,/AI|assistant/i);
assert.match(identity('Who are you?').text,/What's on your mind/);
assert.doesNotMatch(identity('Who are you?').text,/AI assistant/i);
assert.match(identity('Are you a human?').text,/not a person/);
assert.equal(identity('Who made you?').text,'The YapThing team built me.');
assert.match(identity('Are you Gemini?').text,/cloud features use Google/);
assert.equal(identity('Explain photosynthesis'),null,'ordinary questions must not bypass the AI model');
const legacy=vm.runInNewContext(code.slice(start,end)+'\nyapLegacyIdentityClaim');
assert.equal(legacy({role:'assistant',source:'ai',text:'I am made by Alibaba Cloud, which is a cloud computing company.'}),true);
assert.equal(legacy({role:'assistant',source:'ai',text:'I am named "SystematicAI" and I am part of Alibaba Cloud.'}),true);
assert.equal(legacy({role:'assistant',source:'ai',text:'Alibaba Cloud is a cloud computing provider.'}),false,'do not label ordinary factual content');
assert.equal(legacy({role:'user',text:'I am SystematicAI.'}),false,'do not label user messages');
assert.equal(identity('What is your name in Japanese?'),null,'do not intercept nontrivial instructions');
assert.match(identity('Are you an AI?').text,/AI-powered/,'answer a direct AI identity question honestly');
assert.match(normalized[0].content,/warm, natural, thoughtful conversational partner/,'local system prompt should specify a natural voice');
const legacyStart=code.indexOf('function repairChatMessages(){');
const initialMessages=[
 {role:'assistant',source:'yap-identity',text:"I'm YapThing, your AI assistant. I can help with questions, writing, research, and everyday tasks."},
 {role:'assistant',source:'yap-identity',text:"I'm YapThing, the AI assistant built for the YapThing platform."},
 {role:'assistant',source:'ai',text:"I'm YapThing, your AI assistant. I can help with questions, writing, research, and everyday tasks."}
];
assert(legacyStart>0,'existing chat repair must be present');
let writes=0;
const history=[{messages:initialMessages}];
vm.runInNewContext(code.slice(legacyStart,start),{chats:history,persist:()=>writes++});
assert.equal(history[0].messages[0].text,"I'm YapThing.");
assert.equal(history[0].messages[1].text,'The YapThing team built me.');
assert.match(history[0].messages[2].text,/your AI assistant/,'do not silently rewrite non-template AI replies');
assert.equal(writes,1,'update only old canned identity responses');
assert(code.includes('(!hasPhoto&&!doc?yapIdentityReply(text):null)'),'website shortcut runs before model inference');
assert(code.includes('messages:yapLocalMessages(context)'),'WebLLM must pass normalizer directly');
assert(code.includes('const promptMessages=yapLocalMessages(context)'),'WASM must use normalized messages');
const withInjected=[
 ...prior.slice(0,2),
 {role:'tool',content:'Untrusted role'},
 ...prior.slice(2),
 {role:'system',content:''}
];
const filtered=build(withInjected);
assert.equal(filtered.filter(m=>m.role==='system').length,1);
assert(!filtered.some(m=>m.role==='tool'));
console.log('PASS on-device system-first prompts: single merged system message, preserved chat order, unknown roles excluded, WebLLM and WASM integrated');
