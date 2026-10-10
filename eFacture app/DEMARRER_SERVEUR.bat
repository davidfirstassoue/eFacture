@echo off
chcp 65001 > nul
title BCI Hôpital - Serveur Local
color 0B

echo ===================================================================
echo   🏥 SYSTÈME DE GESTION DES BONS DE COMMANDE INTERNES (BCI)
echo                     MODE LOCAL - 100%% HORS-LIGNE
echo ===================================================================
echo.
echo [1/2] Démarrage du serveur et de la base de données SQLite...

:: Démarrage de Node.js
start "Serveur BCI" /min node server.js

:: Petite pause pour s'assurer du démarrage
timeout /t 2 /nobreak > nul

echo [2/2] Ouverture de l'application dans votre navigateur...
start http://localhost:3000

echo.
echo ===================================================================
echo   ✅ Le serveur est actif et fonctionne en tâche de fond !
echo   Ne fermez pas cette fenêtre pour maintenir l'accès au réseau.
echo   Pour arrêter le serveur : appuyez sur Ctrl+C ou fermez la fenêtre.
echo ===================================================================
echo.
pause
