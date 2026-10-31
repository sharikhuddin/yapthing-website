const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'yap-draft-test-')),repo=path.join(root,'repo'),script=path.resolve(__dirname,'../scripts/propose-improvement.cjs'),mock=path.join(root,'mock.cjs');
fs.mkdirSync(path.join(repo,'chat'),{recursive:true});const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try{git(['init']);git(['config','user.name','Yap Test']);git(['config','user.email','test@example.invalid']);fs.writeFileSync(path.join(repo,'chat/example.js'),'const value=1;\n');git(['add','.']);git(['commit','-m','fixture']);
fs.writeFileSync(mock,"global.fetch=async()=>({ok:true,json:async()=>({message:{content:JSON.stringify({summary:'Test draft',files:[{path:'chat/example.js',content:'const value=2;\\n'}]})}})});");
const main=git(['rev-parse','HEAD']);const result=JSON.parse(execFileSync(process.execPath,['--require',mock,script,'--goal','Improve fixture','--files','chat/example.js','--model','fixture'],{cwd:repo,encoding:'utf8'}));
assert.match(result.branch,/^yap\/improvement-/);assert.equal(git(['rev-parse','HEAD']),main);assert.equal(git(['show',result.branch+':chat/example.js']),'const value=2;');assert.equal(fs.readFileSync(path.join(repo,'chat/example.js'),'utf8'),'const value=1;\n');
let failed=false;try{execFileSync(process.execPath,['--require',mock,script,'--goal','x','--files','chat/../secret.js','--model','fixture'],{cwd:repo,stdio:'pipe'});}catch{failed=true;}assert(failed);
console.log('PASS automatic code draft creates review branch, preserves working source and rejects traversal');
}finally{fs.rmSync(root,{recursive:true,force:true});}
