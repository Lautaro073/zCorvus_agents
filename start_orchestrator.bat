@echo off
chcp 65001 > nul
title zCorvus - Entorno del Orquestador
setlocal

set "DISPATCH_CONFIG=AI_Workspace\scripts\opencode-dispatch.config.json"

if not exist "%DISPATCH_CONFIG%" (
  echo [SETUP] Creando configuracion inicial del dispatcher...
  copy /Y AI_Workspace\scripts\opencode-dispatch.config.example.json "%DISPATCH_CONFIG%" > nul
)

echo ===================================================
echo      Iniciando el Ecosistema zCorvus (Agentes)     
echo ===================================================


:: 1. Iniciar el Servidor MCP en una ventana nueva minimizada
echo [1/4] Levantando Servidor MCP y WebSockets...
start "zCorvus MCP Server" /MIN cmd /c "cd AI_Workspace\MCP_Server && node monitor-server.js"

:: 2. Esperar 3 segundos para dar tiempo a que levante el puerto 4311
timeout /t 3 /nobreak > nul

:: 3. Abrir el monitor visual en el navegador predeterminado
echo [2/4] Abriendo el Monitor Visual (AgentMonitor)...
start http://127.0.0.1:4311/monitor

:: 4. Iniciar dispatcher automatico TASK_ASSIGNED -> opencode run
echo [3/4] Iniciando dispatcher autonomo de tareas...
start "zCorvus Task Dispatcher" /MIN cmd /c "node AI_Workspace\scripts\opencode-task-dispatcher.mjs --live --config %DISPATCH_CONFIG%"

:: 5. Ejecutar opencode (El Orquestador)
echo [4/4] Iniciando los Agentes Orchestrator...
echo.

:: SESIONES OPENCODE POR AGENTE (alineadas con dispatcher config)
:: ORCHESTRATOR PRINCIPAL:
start cmd /k "opencode -s ses_2e1fa0eacffeGlHp22WXJUb7m3"
:: ORCHESTRATOR SECUNDARIO (opcional)
:: start cmd /k "opencode -s ses_2d29f6f48fferrQkTvsWdfdhLY"
:: TESTER:
start cmd /k "opencode -s ses_2d2b3a556ffeZApAX7b5wKem7U"
:: PLANNER:
start cmd /k "opencode -s ses_2d2aef9d5ffeuyFCo1GAhsrfD6"
:: OBSERVER:
start cmd /k "opencode -s ses_2d2ad1bbfffeKSlW1FzB9A9vST"
:: OPTIMIZER:
start cmd /k "opencode -s ses_2d2a9e138ffePF5Lt4sTpKmfjk"
:: DOCUMENTER:
start cmd /k "opencode -s ses_2d2a38f49ffeIuock0vn7moQKl"
:: FRONTEND:
start cmd /k "opencode -s ses_2d2a258b5ffe51LQ5CJzSvXoNJ"
:: BACKEND:
start cmd /k "opencode -s ses_2d2a11dc3ffeJ6q7BNIrQqyVeF"


echo.
echo Sesiones iniciadas. Cierra esta ventana cuando desees.
pause > nul
