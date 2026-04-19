@echo off
cd /d "%~dp0"
echo Lancement du jeu (serveur local + assets Kenney si presents)...
if not exist "node_modules\" (
  echo Installation des dependances (premiere fois)...
  call npm install
)
echo Ouvrez http://localhost:5173 dans le navigateur si ca ne souvre pas tout seul.
call npm run dev
pause
