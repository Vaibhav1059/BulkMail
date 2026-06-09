@echo off
cd /d "%~dp0"
echo Stopping all background Node.js processes...
taskkill /F /IM node.exe
echo Done! Application stopped.
pause
