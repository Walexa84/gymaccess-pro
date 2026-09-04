@echo off
title GymAccess Pro - Sistema de Gestion de Gimnasios y Control Facial
color 0b
echo ========================================================
echo         GYMACCESS PRO - INICIANDO SISTEMA
echo ========================================================
echo.
echo 1. Verificando entorno local...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor instale Node.js LTS desde: https://nodejs.org/
    pause
    exit /b 1
)

echo 2. Abriendo navegador en http://localhost:3000...
start "" http://localhost:3000

echo 3. Iniciando servidor y demonio de sincronizacion biometrica...
node --import tsx src/server/index.ts
pause
