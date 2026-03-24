@echo off
chcp 65001 > nul
title zCorvus - Entorno del Orquestador

echo ===================================================
echo      Iniciando el Ecosistema zCorvus (Agentes)     
echo ===================================================

:: 1. Iniciar el Servidor MCP en una ventana nueva minimizada
echo [1/3] Levantando Servidor MCP y WebSockets...
start "zCorvus MCP Server" /MIN cmd /c "cd AI_Workspace\MCP_Server && npm start"

:: 2. Esperar 3 segundos para dar tiempo a que levante el puerto 4311
timeout /t 3 /nobreak > nul

:: 3. Abrir el monitor visual en el navegador predeterminado
echo [2/3] Abriendo el Monitor Visual (AgentMonitor)...
start http://127.0.0.1:4311/monitor

:: 4. Ejecutar opencode (El Orquestador)
echo [3/3] Iniciando el Agente Orchestrator...
echo.

:: PROMPT INICIAL (V1)
:: Nota: Una vez que me pases el ID de la sesion, reemplazaremos esta linea
:: por el comando para retomar la sesion directamente.
opencode -s ses_2e1fa0eacffeGlHp22WXJUb7m3
echo.
echo Sesion finalizada. Cierra esta ventana cuando desees.
pause > nul
