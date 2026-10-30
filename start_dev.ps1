# Shoes Wise - PowerShell Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Starting Shoes Wise Platform" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host "Press Ctrl+C to terminate." -ForegroundColor Yellow
Write-Host ""

$env:PYTHONPATH="."
& ".\venv\Scripts\python.exe" run_server.py

