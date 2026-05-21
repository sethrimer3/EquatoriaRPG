@echo off
setlocal
pushd "%~dp0"

echo.
echo === Equatoria RPG Build ===
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

echo Running production build...
call npm run build
if errorlevel 1 goto error

echo.
echo Build complete. Output is in the dist folder.
pause
popd
exit /b 0

:error
echo.
echo Equatoria RPG build failed.
pause
popd
exit /b 1
