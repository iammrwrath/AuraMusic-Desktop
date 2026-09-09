@echo off
title AuraMusic Desktop - Dev Mode
echo Starting AuraMusic Desktop...
cd /d "%~dp0"
call pnpm dev
pause
