@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
echo === HolyQuickPanel.aex exports ===
dumpbin /exports "C:\Users\Ben\NEXUS\_GRID\PLUGINS\HOLY EXPRESSOR\Holy-Expressor-Repo-2\aex\build\AEGP\HolyQuickPanel.aex"
echo.
echo === Panelator.aex exports (reference) ===
dumpbin /exports "C:\Users\Ben\NEXUS\_GRID\PLUGINS\HOLY EXPRESSOR\Holy-Expressor-Repo-2\aex\build\AEGP\Panelator.aex"
echo.
echo === HolyQuickPanel.aex resources ===
dumpbin /headers "C:\Users\Ben\NEXUS\_GRID\PLUGINS\HOLY EXPRESSOR\Holy-Expressor-Repo-2\aex\build\AEGP\HolyQuickPanel.aex" | findstr /C:".rsrc"
