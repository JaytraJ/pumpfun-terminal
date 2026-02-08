@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [Pump Terminal] Installer

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install Node.js 18+ and rerun this script.
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if "%NODE_MAJOR%"=="" (
  echo Unable to detect Node.js version.
  exit /b 1
)
if %NODE_MAJOR% LSS 18 (
  echo Node.js 18+ is required. Detected: v%NODE_MAJOR%
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example. Review values before running live trades.
  )
)

if not exist "data" mkdir "data"
if not exist "wallets" mkdir "wallets"

if exist "package-lock.json" (
  echo Installing dependencies with npm ci...
  call npm ci
) else (
  echo Installing dependencies with npm install...
  call npm install
)
if errorlevel 1 (
  echo Dependency install failed. Check the log above.
  exit /b 1
)

echo Building client bundle...
call npm run client:build
if errorlevel 1 (
  echo Client build failed. Check the log above.
  exit /b 1
)

echo.
echo Installation complete.
echo Next step: run "npm start" to serve Pump Terminal on port 3001.
endlocal
exit /b 0
