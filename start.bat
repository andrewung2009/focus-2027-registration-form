@echo off
setlocal
cd /d "%~dp0"
title Focus 2027 Registration Form

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found on this computer.
  echo Install Node.js from https://nodejs.org and double-click this file again.
  echo.
  pause
  exit /b 1
)

node serve.js
if errorlevel 1 pause
