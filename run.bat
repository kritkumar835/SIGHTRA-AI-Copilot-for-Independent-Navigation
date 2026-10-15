@echo off
title SightGuide Server
echo ========================================================
echo Starting SightGuide Server on http://localhost:8000
echo ========================================================
cd /d "%~dp0"
"C:\Users\Krit Kumar\python311\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
