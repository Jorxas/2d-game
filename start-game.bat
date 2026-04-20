@echo off
cd /d "%~dp0"
echo Starte das Spiel (lokaler Server + Kenney-Assets, falls vorhanden)...
if not exist "node_modules\" (
  echo Installiere Abhaengigkeiten (beim ersten Mal)...
  call npm install
)
echo Browser: http://localhost:5173 oeffnen, falls sich nichts von selbst oeffnet.
call npm run dev
pause
