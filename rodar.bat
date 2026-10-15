@echo off
title Sistemaponto
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rodar.ps1"
