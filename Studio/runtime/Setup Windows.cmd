@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\node\node.exe" (
 powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $m=(Get-Content -Raw runtime-manifest.json | ConvertFrom-Json).node.'win32-x64'; New-Item -ItemType Directory -Force .runtime | Out-Null; $z=Join-Path '.runtime' $m.file; Invoke-WebRequest -Uri $m.url -OutFile $z; if ((Get-FileHash $z -Algorithm SHA256).Hash.ToLower() -ne $m.sha256) {throw 'Node checksum mismatch'}; Expand-Archive -LiteralPath $z -DestinationPath '.runtime' -Force; $folder=Join-Path '.runtime' ([IO.Path]::GetFileNameWithoutExtension($m.file)); if (Test-Path '.runtime/node') {Remove-Item -Recurse -Force '.runtime/node'}; Move-Item -LiteralPath $folder -Destination '.runtime/node'"
 if errorlevel 1 goto failed
)
set "PATH=%CD%\.runtime\node;%PATH%"
".runtime\node\node.exe" scripts\setup.mjs %*
if errorlevel 1 goto failed
echo Setup complete. Open Launch JStudio.cmd.
pause
exit /b 0
:failed
echo Setup failed. Read the error above; do not continue to launch.
pause
exit /b 1
