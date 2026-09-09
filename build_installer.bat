@echo off
title AuraMusic Desktop - Build Windows Installer
echo ========================================================
echo Building AuraMusic Desktop (NSIS Installer ^& Portable EXE)
echo ========================================================
cd /d "%~dp0"
call pnpm build
call pnpm electron-builder --win -c.win.target=nsis -c.win.target=portable
echo.
echo Build complete! Check the dist folder for installer files.
pause
