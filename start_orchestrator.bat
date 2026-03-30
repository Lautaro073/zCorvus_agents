@echo off
chcp 65001 > nul
title zCorvus - Entorno del Orquestador

echo ===================================================
echo      Iniciando el Ecosistema zCorvus (Agentes)     
echo ===================================================


:: 1. Iniciar el Servidor MCP en una ventana nueva minimizada
echo [1/3] Levantando Servidor MCP y WebSockets...
start "zCorvus MCP Server" /MIN cmd /c "cd AI_Workspace\MCP_Server && node monitor-server.js"

:: 2. Esperar 3 segundos para dar tiempo a que levante el puerto 4311
timeout /t 3 /nobreak > nul

:: 3. Abrir el monitor visual en el navegador predeterminado
echo [2/3] Abriendo el Monitor Visual (AgentMonitor)...
start http://127.0.0.1:4311/monitor

:: 4. Ejecutar opencode (El Orquestador)
echo [3/3] Iniciando los Agentes Orchestrator...
echo.

:: PROMPT INICIAL (V1)
:: Nota: Una vez que me pases el ID de la sesion, reemplazaremos esta linea
:: por el comando para retomar la sesion directamente. 
start cmd /k "opencode -s ses_2e1fa0eacffeGlHp22WXJUb7m3"
:: orchestrator 2
:: start cmd /k "opencode -s ses_2d29f6f48fferrQkTvsWdfdhLY"
start cmd /k "opencode -s ses_2d2b3a556ffeZApAX7b5wKem7U"
start cmd /k "opencode -s ses_2d2aef9d5ffeuyFCo1GAhsrfD6"
start cmd /k "opencode -s ses_2d2ad1bbfffeKSlW1FzB9A9vST"
start cmd /k "opencode -s ses_2d2a9e138ffePF5Lt4sTpKmfjk"
start cmd /k "opencode -s ses_2d2a38f49ffeIuock0vn7moQKl"
start cmd /k "opencode -s ses_2d2a258b5ffe51LQ5CJzSvXoNJ"
start cmd /k "opencode -s ses_2d2a11dc3ffeJ6q7BNIrQqyVeF"


echo.
echo Sesiones iniciadas. Cierra esta ventana cuando desees.
pause > nul
