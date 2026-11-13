@echo off
call "%~dp0runtime\Check Windows.cmd" %*
exit /b %ERRORLEVEL%
