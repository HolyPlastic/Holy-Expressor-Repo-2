@echo off
REM -------------------------------------------------------------------
REM  Copies the built .aex plugins into AE's Plug-ins folder.
REM  Must be run ELEVATED (right-click > Run as administrator)
REM  because Program Files is read-only for normal users.
REM
REM  /Y overwrites without prompting. Using plain copy (not hardlinks)
REM  avoids the broken-hardlink-after-relink problem: the linker creates
REM  a new inode on every build, which silently detaches an existing
REM  hardlink in the Plug-ins folder from the fresh build output.
REM -------------------------------------------------------------------

set AE_PLUGINS=C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Plug-ins
set BUILD_DIR=%~dp0..\build\AEGP

echo === Installing HolyQuickPanel.aex ===
copy /Y "%BUILD_DIR%\HolyQuickPanel.aex" "%AE_PLUGINS%\HolyQuickPanel.aex"
if errorlevel 1 goto :fail

echo === Installing Panelator.aex (diagnostic / SDK sample) ===
copy /Y "%BUILD_DIR%\Panelator.aex" "%AE_PLUGINS%\Panelator.aex"
if errorlevel 1 goto :fail

echo.
echo SUCCESS. Restart After Effects, then look in the Window menu for:
echo   - "!!! HOLY AEX SMOKETEST !!!"  (our plugin)
echo   - "Panelator!"                  (SDK sample, known-good control)
echo.
echo If ONLY Panelator shows up, it's our code.
echo If NEITHER shows up, the SDK is incompatible with AE 2026.
echo.
pause
exit /b 0

:fail
echo.
echo FAILED. This script must be run as Administrator.
echo Right-click this .bat and choose "Run as administrator".
echo.
pause
exit /b 1
