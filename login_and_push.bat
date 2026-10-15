@echo off
title GitHub One-Click Login & Push
cd /d "%~dp0"
set "GH_EXE=gh"
if exist "C:\Users\Krit Kumar\AppData\Local\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe" set "GH_EXE=C:\Users\Krit Kumar\AppData\Local\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe"
set "GIT_EXE=git"
if exist "C:\Users\Krit Kumar\mingit\cmd\git.exe" set "GIT_EXE=C:\Users\Krit Kumar\mingit\cmd\git.exe"

echo ========================================================
echo GitHub Authorization & Push for SIGHTRA
echo ========================================================
echo.
echo 1. Browser will open for a one-click GitHub login.
echo 2. Once authorized, git credentials will be configured automatically.
echo 3. The repository will be pushed to:
echo    https://github.com/kritkumar835/SIGHTRA-AI-Copilot-for-Independent-Navigation.git
echo.

"%GH_EXE%" auth login --web -h github.com -p https
"%GH_EXE%" auth setup-git
"%GIT_EXE%" push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Project successfully pushed to GitHub!
) else (
    echo [NOTICE] If browser login was cancelled, you can also paste a Personal Access Token.
)
echo ========================================================
pause
