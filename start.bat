@echo off
echo ====================================================
echo   Starting Cookscape Quotation Generator
echo ====================================================

echo Starting Backend Server on port 5000...
start "Quotation Backend (Port 5000)" cmd /k "cd server && npm start"

echo Starting Frontend Dev Server on port 5173...
start "Quotation Frontend (Port 5173)" cmd /k "cd client && npm run dev"

echo.
echo Application starting!
echo Frontend will be available at: http://localhost:5173
echo Backend API available at:     http://localhost:5000
echo.
echo Login with username: admin  ^|  password: admin123
echo ====================================================
pause
