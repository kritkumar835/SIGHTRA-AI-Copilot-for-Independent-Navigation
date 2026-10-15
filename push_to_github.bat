@echo off
title Push SightGuide to GitHub
cd /d "%~dp0"
echo ========================================================
echo Pushing SightGuide to GitHub
echo Repo: https://github.com/kritkumar835/SIGHTRA-AI-Copilot-for-Independent-Navigation.git
echo ========================================================

echo.
echo If prompted, enter your GitHub Username and Personal Access Token (PAT).
echo.

set "GIT_CMD=git"
if exist "C:\Users\Krit Kumar\mingit\cmd\git.exe" set "GIT_CMD=C:\Users\Krit Kumar\mingit\cmd\git.exe"
%GIT_CMD% push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo Successfully pushed to GitHub!
) else (
    echo Push encountered an error. Please verify your credentials or Token.
)
echo ========================================================
pause
