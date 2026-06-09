@echo off
:: Ensure we are in the directory of this batch script
cd /d "%~dp0"

echo ==========================================
echo Starting AeroSend Bulk Mail Sender
echo ==========================================

:: 1. Start the backend server (Express on port 5000) in a separate minimized window
echo Starting backend server...
start "AeroSend Backend" /min ".\.node\node-v22.12.0-win-x64\node.exe" server/server.js

:: 2. Start the frontend server (Vite) in this window
echo Starting frontend dev server (Vite)...
".\.node\node-v22.12.0-win-x64\npm.cmd" run dev
