Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting SightGuide Server on http://localhost:8000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot
& "C:\Users\Krit Kumar\python311\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
