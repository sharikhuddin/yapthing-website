@echo off
setlocal EnableExtensions DisableDelayedExpansion
title YapThing Computer Connector - No Admin Option
echo.
echo YapThing Computer Connector
echo Runs with your standard Windows account. Does not require administrator access.
echo You must be allowed to run these tools on this computer.
echo.
if not defined LOCALAPPDATA (echo ERROR: User app-data folder is unavailable. & goto :failed)
set "YAP_NODE_HOME=%LOCALAPPDATA%\YapThing\PortableNode"
set "YAP_NODE_DIR="
where node.exe >nul 2>nul
if errorlevel 1 goto :existing
where npx.cmd >nul 2>nul
if errorlevel 1 goto :existing
node.exe -e "var v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)" >nul 2>nul
if not errorlevel 1 goto :launch
echo Your available Node.js is too old for the recommended setup.
:existing
if not exist "%YAP_NODE_HOME%\node-path.txt" goto :offer_download
for /f "usebackq delims=" %%G in ("%YAP_NODE_HOME%\node-path.txt") do set "YAP_NODE_DIR=%%G"
if not defined YAP_NODE_DIR goto :offer_download
if not exist "%YAP_NODE_DIR%\node.exe" goto :offer_download
if not exist "%YAP_NODE_DIR%\npx.cmd" goto :offer_download
"%YAP_NODE_DIR%\node.exe" -e "var v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)" >nul 2>nul
if errorlevel 1 goto :offer_download
set "PATH=%YAP_NODE_DIR%;%PATH%"
goto :launch
:offer_download
echo Compatible Node.js and npm are not available on your PATH.
echo Portable Node.js 24 LTS can run from your user folder without an MSI install.
echo It downloads an official nodejs.org Windows ZIP and verifies SHA-256.
echo It will not change the system PATH, install services, or request admin rights.
echo.
choice /c YN /n /m "Download portable Node.js into your user folder? [Y/N] "
if errorlevel 2 goto :declined
if errorlevel 1 goto :portable
goto :declined
:portable
echo Downloading official Node.js ZIP into %YAP_NODE_HOME% ...
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;$yapProcessor=[Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString();$arch=if($yapProcessor -eq 'Arm64'){'arm64'}elseif($yapProcessor -eq 'X64'){'x64'}else{throw 'Unsupported Windows processor. Download an appropriate official Node.js ZIP manually.'};$base=Join-Path $env:LOCALAPPDATA 'YapThing\PortableNode';New-Item -ItemType Directory -Force -Path $base|Out-Null;$dir='https://nodejs.org/dist/latest-v24.x/';$sums=(Invoke-WebRequest -Uri ($dir+'SHASUMS256.txt') -UseBasicParsing).Content;$pattern='(?m)^([0-9a-fA-F]{64})\s+(node-v24\.[0-9]+\.[0-9]+-win-'+$arch+'\.zip)\s*$';$match=[regex]::Match($sums,$pattern);if(!$match.Success){throw 'Could not identify an official Node.js archive and checksum.'};$name=$match.Groups[2].Value;$zip=Join-Path $base $name;Invoke-WebRequest -Uri ($dir+$name) -OutFile $zip -UseBasicParsing;$hash=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash;if($hash -ine $match.Groups[1].Value){Remove-Item -LiteralPath $zip -Force;throw 'Node.js checksum verification FAILED.'};Expand-Archive -LiteralPath $zip -DestinationPath $base -Force;$yapNodeInstallDir=Join-Path $base ($name -replace '\.zip$','');if(!(Test-Path -LiteralPath (Join-Path $yapNodeInstallDir 'node.exe')) -or !(Test-Path -LiteralPath (Join-Path $yapNodeInstallDir 'npx.cmd'))){throw 'The verified Node.js ZIP did not contain the expected binaries.'};Set-Content -LiteralPath (Join-Path $base 'node-path.txt') -Value $yapNodeInstallDir -Encoding Ascii;Write-Host 'Verified portable Node.js in' $yapNodeInstallDir;exit 0}catch{[Console]::Error.WriteLine('Portable Node.js setup failed: '+$_.Exception.Message);exit 1}"
if errorlevel 1 goto :download_failed
if not exist "%YAP_NODE_HOME%\node-path.txt" goto :download_failed
for /f "usebackq delims=" %%G in ("%YAP_NODE_HOME%\node-path.txt") do set "YAP_NODE_DIR=%%G"
if not defined YAP_NODE_DIR goto :download_failed
if not exist "%YAP_NODE_DIR%\npx.cmd" goto :download_failed
set "PATH=%YAP_NODE_DIR%;%PATH%"
goto :launch
:launch
echo.
echo Starting Desktop Commander Remote using this Windows account.
echo Follow device verification in your browser. Check that the codes match.
echo Keep this window open. Press Ctrl+C to stop remote access.
echo This window connects your computer. Give coding tasks in YapThing chat.
echo Then open https://yapthing.com/chat/?connect=computer
echo Connect your account, choose a project, and ask YapThing to build or fix code.
echo.
set "npm_config_cache=%LOCALAPPDATA%\YapThing\npm-cache"
call npx.cmd @wonderwhy-er/desktop-commander@latest remote
if errorlevel 1 goto :connector_failed
goto :done
:declined
echo No download was performed. You can still use YapThing Chat without computer access.
goto :done
:download_failed
echo.
echo Node.js download failed. Check HTTPS access to nodejs.org, free disk space,
echo company download restrictions, antivirus rules, and your proxy settings.
echo No system installation or security policy change was attempted.
goto :failed
:connector_failed
echo.
echo Connector did not start. Check registry.npmjs.org access, company policy,
echo your user-folder permissions, and the error above.
echo Never disable corporate security controls to fix this.
goto :failed
:failed
echo.
echo See https://yapthing.com/desktop/ for help and browser-only alternatives.
pause
exit /b 1
:done
pause
exit /b 0
