@echo off
cd /d "%~dp0..\"
start "" /b npx electron electron_entry.js %1 >nul 2>&1
exit
