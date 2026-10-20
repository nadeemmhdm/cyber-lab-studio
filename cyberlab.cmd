@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cyberlab.ps1" %*
exit /b %ERRORLEVEL%
