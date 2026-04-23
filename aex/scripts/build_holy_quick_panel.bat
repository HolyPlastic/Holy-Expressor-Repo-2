@echo off
setlocal
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
set AE_PLUGIN_BUILD_DIR=C:\Users\Ben\NEXUS\_GRID\PLUGINS\HOLY EXPRESSOR\Holy-Expressor-Repo-2\aex\build
cd /d "%~dp0\..\HolyQuickPanel\Win"
msbuild HolyQuickPanel.vcxproj /p:Configuration=Release /p:Platform=x64 /nologo /verbosity:minimal
exit /b %errorlevel%
