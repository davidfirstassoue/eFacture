@echo off
chcp 65001 > nul
title Installation Raccourci Poste Client - BCI Hôpital
color 0A

echo ===================================================================
echo     INSTALLATION DU RACCOURCI APPLICATION SUR LE POSTE CLIENT
echo ===================================================================
echo.
set /p SERVER_IP="Entrez l'adresse IP du PC Serveur (ex: 192.168.1.235) : "

if "%SERVER_IP%"=="" (
    echo [ERREUR] L'adresse IP ne peut pas être vide.
    pause
    exit /b
)

set APP_URL=http://%SERVER_IP%:3000
set DESKTOP_PATH=%USERPROFILE%\Desktop
set SHORTCUT_PATH=%DESKTOP_PATH%\Bons de Commande Hôpital.lnk

echo.
echo Configuration du raccourci en Mode Application Dédiée vers : %APP_URL% ...

:: Script PowerShell pour créer le raccourci Windows avec msedge en mode --app et le logo officiel
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=%APP_URL%'; $ico = '%~dp0app_icon.ico'; if (Test-Path $ico) { $s.IconLocation = $ico }; $s.Description = 'Bons de Commande Internes Hôpital'; $s.Save()"

echo.
echo ===================================================================
echo   ✅ Le raccourci a été créé sur votre Bureau Windows !
echo   Vous pouvez maintenant double-cliquer sur "Bons de Commande Hôpital"
echo   pour ouvrir le logiciel sans aucune barre d'adresse.
echo ===================================================================
echo.
pause
