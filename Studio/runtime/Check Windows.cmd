@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\node\node.exe" (
 echo Run Setup Windows.cmd first.
 pause
 exit /b 1
)
".runtime\node\node.exe" scripts\doctor.mjs
set "JSTUDIO_EXIT=%ERRORLEVEL%"
pause
exit /b %JSTUDIO_EXIT%
