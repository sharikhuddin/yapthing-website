'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../chat/chat.js'),'utf8');
const start=code.indexOf('function yapLocalMessages(context){');
const end=code.indexOf('function yapAnswerMarkup(el,m){',start);
assert(start>0 && end>start,'production chat must define local message normalizer');
const build=vm.runInNewContext('('+code.slice(start,end).trim()+')');
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
for(const phrase of ['Safety guidance','Personalization','Original system prompt'])
 assert(normalized[0].content.includes(phrase));
assert(!normalized.slice(1).some(m=>m.role==='system'));
assert.equal(normalized.length,4);
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
