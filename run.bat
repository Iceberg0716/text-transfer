@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

if not exist ".venv" (
  python -m venv .venv
)

set PYTHON=%cd%\.venv\Scripts\python.exe

set STAMP=%cd%\.venv\.deps-stamp

for /f "tokens=1" %%H in ('certutil -hashfile server\requirements.txt SHA256 ^| findstr /r /c:"^[0-9A-F][0-9A-F]"') do set REQHASH=%%H

set NEEDINSTALL=1
if exist "%STAMP%" (
  set /p INSTHASH=<"%STAMP%"
  if /i "%INSTHASH%"=="%REQHASH%" set NEEDINSTALL=0
)

if "%NEEDINSTALL%"=="1" (
  "%PYTHON%" -m pip install -r server\requirements.txt
  if errorlevel 1 exit /b 1
  >"%STAMP%" echo %REQHASH%
)

if not exist "server\config.yaml" (
  copy "server\config.example.yaml" "server\config.yaml" >nul
  echo Created server\config.yaml. Please fill base_url/model/api_key then rerun.
  exit /b 1
)

findstr /c:"PUT_YOUR_KEY_HERE" "server\config.yaml" >nul
if %errorlevel%==0 (
  echo server\config.yaml still has placeholder api_key. Please fill it then rerun.
  exit /b 1
)

echo Starting server at http://127.0.0.1:8000/
start "" "http://127.0.0.1:8000/"
"%PYTHON%" -m uvicorn server.app:app --reload --host 127.0.0.1 --port 8000
