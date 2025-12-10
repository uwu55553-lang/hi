@echo off
REM pad_to_size.bat - wrapper Windows simple
REM Usage: pad_to_size.bat "input.html" "output.html" 30M
REM Assure-toi que pad_to_size.ps1 est dans le même dossier que ce .bat

if "%~3"=="" (
  echo Usage: %~nx0 "input-file" "output-file" size
  echo Example: %~nx0 "index.html" "index_30mb.html" 30M
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%pad_to_size.ps1"

if not exist "%PS_SCRIPT%" (
  echo ERROR: pad_to_size.ps1 non trouvee dans %SCRIPT_DIR%
  echo Place pad_to_size.ps1 dans le meme dossier que ce .bat
  exit /b 2
)

REM Run PowerShell script with bypass policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -InputPath "%~1" -OutputPath "%~2" -Size "%~3"
if errorlevel 1 (
  echo PowerShell script a renvoyé une erreur. Voir message ci-dessus.
  exit /b 1
)

echo OK. Sortie: %~2
exit /b 0