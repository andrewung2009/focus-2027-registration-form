@echo off
setlocal
cd /d "%~dp0"
title Focus 2027 - run tests

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found on this computer.
  echo Install Node.js from https://nodejs.org and double-click this file again.
  echo.
  pause
  exit /b 1
)

node --test
set result=%errorlevel%
echo.
if %result%==0 (
  echo All tests passed.
) else (
  echo Tests failed.
)
pause
exit /b %result%
