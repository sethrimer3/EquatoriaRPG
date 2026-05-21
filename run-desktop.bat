@echo off
setlocal
pushd "%~dp0"

echo.
echo === Equatoria RPG Desktop Launcher ===
echo.

if not exist node_modules (
  echo Installing dependencies...
  if exist package-lock.json (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 goto error
)

echo Building and launching Electron...
call npm run desktop
if errorlevel 1 goto error

echo.
echo Electron closed.
pause
popd
exit /b 0

:error
echo.
echo Equatoria RPG desktop launch failed.
pause
popd
exit /b 1
