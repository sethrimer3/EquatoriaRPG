@echo off
setlocal
pushd "%~dp0"

echo.
echo === Equatoria RPG Browser Dev Launcher ===
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

echo Starting Vite dev server at http://localhost:3000 ...
call npm run dev
if errorlevel 1 goto error

popd
exit /b 0

:error
echo.
echo Equatoria RPG browser dev launch failed.
pause
popd
exit /b 1
