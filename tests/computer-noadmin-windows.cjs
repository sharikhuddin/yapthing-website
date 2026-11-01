'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
if(process.platform!=='win32'){console.log('SKIP Windows launcher execution: Windows required');process.exit(0);}
const source=fs.readFileSync(path.join(__dirname,'../desktop/YapThing-Computer-NoAdmin.cmd'),'utf8').replace(/\r\n/g,'\n');
const command=source.split('\n').find(l=>l.startsWith('powershell.exe -NoProfile -NonInteractive -Command '));
assert(command);const script=command.slice(command.indexOf(' -Command "')+11,-1);
assert(!/\$(?:home|codex_home)\s*=/i.test(script),'Reserved PowerShell variable assignment');
const root=fs.mkdtempSync(path.join(__dirname,'../.noadmin-test-')),quote=s=>"'"+s.replaceAll("'","''")+"'";
const ps=code=>cp.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(code,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:12000});
const arch=os.arch()==='arm64'?'arm64':'x64',name='node-v24.99.0-win-'+arch,packageRoot=path.join(root,name),archive=path.join(root,name+'.zip');
fs.mkdirSync(packageRoot);fs.writeFileSync(path.join(packageRoot,'node.exe'),'fixture binary');fs.writeFileSync(path.join(packageRoot,'npx.cmd'),'@echo fixture');
let result=ps('Compress-Archive -LiteralPath '+quote(packageRoot)+' -DestinationPath '+quote(archive));assert.equal(result.status,0,result.stderr);
const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
function downloadCase(folder,checksum){
 const target=path.join(root,folder);fs.mkdirSync(target);
 const actual=script.replace("Join-Path $env:LOCALAPPDATA 'YapThing\\PortableNode'",quote(target));
 assert.notEqual(actual,script,'test must isolate the install directory');
 const mock='function Invoke-WebRequest {param($Uri,$OutFile,[switch]$UseBasicParsing) if($OutFile){Copy-Item -LiteralPath '+quote(archive)+' -Destination $OutFile}else{[pscustomobject]@{Content='+quote(checksum+'  '+name+'.zip')+'}}};';
 return {result:ps(mock+actual),target};
}
const success=downloadCase('verified portable folder',hash);assert.equal(success.result.status,0,success.result.stderr);assert.equal(fs.readFileSync(path.join(success.target,'node-path.txt'),'utf8').trim(),path.join(success.target,name));assert(fs.existsSync(path.join(success.target,name,'node.exe')));assert.match(success.result.stdout,/Verified portable Node.js/);
const mismatch=downloadCase('checksum rejection','0'.repeat(64));assert.notEqual(mismatch.result.status,0);assert.match(mismatch.result.stderr,/checksum verification FAILED/);assert(!fs.existsSync(path.join(mismatch.target,'node-path.txt')));assert(!fs.existsSync(path.join(mismatch.target,name)));assert(!mismatch.result.stderr.includes('$ErrorActionPreference'));
// Exercise the actual batch cache path with no Node on PATH. Never launch the remote connector in a test.
const cached=path.join(root,'cache with spaces');fs.mkdirSync(cached);fs.writeFileSync(path.join(cached,'node-path.txt'),path.dirname(process.execPath));
let batch=source.replace('set "YAP_NODE_HOME=%LOCALAPPDATA%\\YapThing\\PortableNode"','set "YAP_NODE_HOME='+cached+'"').replace(/^choice .*$/m,'echo UNEXPECTED_DOWNLOAD\nexit /b 92').replace(/^call npx\.cmd .*$/m,'echo YAP_CACHED_NODE_REUSED\nexit /b 0');
const batchFile=path.join(root,'cache-test.cmd');batch='@echo off\nset "LOCALAPPDATA='+root+'"\nset "PATH='+path.join(process.env.SystemRoot||'C:\\Windows','System32')+'"\n'+batch;fs.writeFileSync(batchFile,batch.replace(/\n/g,'\r\n'));
result=cp.spawnSync(process.env.ComSpec||'cmd.exe',['/d','/c',batchFile],{encoding:'utf8',timeout:8000,windowsHide:true,env:{...process.env,LOCALAPPDATA:root,PATH:path.join(process.env.SystemRoot||'C:\\Windows','System32')}});
assert.equal(result.status,0,result.stderr+result.stdout);assert.match(result.stdout,/YAP_CACHED_NODE_REUSED/);assert(!result.stdout.includes('UNEXPECTED_DOWNLOAD'));
assert.equal(path.dirname(root),path.resolve(__dirname,'..'));assert(path.basename(root).startsWith('.noadmin-test-'));fs.rmSync(root,{recursive:true,force:true});
console.log('PASS actual Windows portable setup, reserved-variable regression, SHA rejection and cached Node reuse');
