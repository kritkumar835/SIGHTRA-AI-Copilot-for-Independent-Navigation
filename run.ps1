Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting SightGuide Server on http://localhost:8000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

