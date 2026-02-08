@echo off
REM LocalGravity Launcher
cd /d "%~dp0"
start /min cmd /c "npm run electron:dev"
exit
