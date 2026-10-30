@echo off
title YapThing Computer Connector
echo YapThing uses the official Desktop Commander agent to pair this computer.
echo Keep this window open while using computer tasks. Close it to disconnect.
echo The first run downloads the agent and asks you to approve device pairing.
echo Never share the pairing code with anyone.
where node >nul 2>nul
if errorlevel 1 (echo Install Node.js 20 or later, then run this file again. & pause & exit /b 1)
call npx.cmd @wonderwhy-er/desktop-commander@latest remote
pause
