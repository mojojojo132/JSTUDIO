@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\setup-complete.json" (
 echo Run Setup Windows.cmd first.
 pause
 exit /b 1
)
set "PATH=%CD%\.runtime\node;%PATH%"
if not exist ".runtime\node\node.exe" (
 echo Portable Node is missing. Rerun Setup Windows.cmd.
 pause
 exit /b 1
)
".runtime\node\node.exe" scripts\launch.mjs %*
set "JSTUDIO_EXIT=%ERRORLEVEL%"
pause
exit /b %JSTUDIO_EXIT%
