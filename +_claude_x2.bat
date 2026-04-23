@echo off
REM Portable launcher for Claude with theme injection
REM References the central .claudec0l0r folder for all theme and script assets
REM Can be copied to any repo root and will always read from the central location

REM Derive the project name from this .bat file's parent folder (portable ??? works wherever the .bat lives)
set "_SELFDIR=%~dp0"
set "_SELFDIR=%_SELFDIR:~0,-1%"
for %%I in ("%_SELFDIR%") do set CLAUDE_PROJECT_NAME=%%~nxI

set BEACON_DIR=C:\Users\Ben\NEXUS\_GRID\PLUGINS\AGENT ARMOURY\CLAUDE CLI\CLI_Terminal Beacon
start powershell.exe -NoExit -ExecutionPolicy Bypass -File "%BEACON_DIR%\Launch-Claude.ps1"