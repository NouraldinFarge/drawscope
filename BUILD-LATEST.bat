@echo off
setlocal
set "DRAWSCOPE_WORKSPACE=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%DRAWSCOPE_WORKSPACE%BUILD-LATEST.ps1"
set "DRAWSCOPE_EXIT=%ERRORLEVEL%"
echo.
if "%DRAWSCOPE_EXIT%"=="0" (
  echo DrawScope portable build completed successfully.
) else (
  echo DrawScope portable build failed with exit code %DRAWSCOPE_EXIT%.
)
echo.
pause
exit /b %DRAWSCOPE_EXIT%
