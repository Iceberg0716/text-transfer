Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
  python -m venv .venv
}

$python = Join-Path $PSScriptRoot ".venv\\Scripts\\python.exe"

$stampPath = Join-Path $PSScriptRoot ".venv\\.deps-stamp"
$reqHash = (Get-FileHash -Algorithm SHA256 "server\\requirements.txt").Hash
$installedHash = ""
if (Test-Path $stampPath) {
  $installedHash = (Get-Content -Raw -Encoding UTF8 $stampPath).Trim()
}
if ($installedHash -ne $reqHash) {
  & $python -m pip install -r server\\requirements.txt
  Set-Content -Encoding UTF8 -NoNewline -Path $stampPath -Value $reqHash
}

if (-not (Test-Path "server\\config.yaml")) {
  Copy-Item "server\\config.example.yaml" "server\\config.yaml"
  Write-Host "Created server\\config.yaml. Please fill base_url/model/api_key then rerun." -ForegroundColor Yellow
  exit 1
}

$cfgText = Get-Content -Raw -Encoding UTF8 "server\\config.yaml"
if ($cfgText -match "PUT_YOUR_KEY_HERE") {
  Write-Host "server\\config.yaml still has placeholder api_key. Please fill it then rerun." -ForegroundColor Yellow
  exit 1
}

Start-Process "http://127.0.0.1:8000/"
& $python -m uvicorn server.app:app --reload --host 127.0.0.1 --port 8000
