@echo off
echo ==========================================
echo   ProTrader AI - Starting Both Servers
echo ==========================================
echo.

echo [1/2] Starting Python Backend on port 8000...
start "Python Backend" cmd /k "cd python-service && venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/2] Waiting 3 seconds before starting Next.js...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Frontend on port 3000...
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo   Servers Starting...
echo ==========================================
echo   Python Backend:  http://localhost:8000
echo   API Docs:        http://localhost:8000/docs
echo   Next.js Frontend: http://localhost:3000
echo   Stock Screener:  http://localhost:3000/screener
echo ==========================================
echo.
echo Press any key to exit this window (servers will keep running)
pause >nul
