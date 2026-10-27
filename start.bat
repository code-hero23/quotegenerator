@echo off
echo ====================================================
echo   Starting Cookscape Quotation Generator
echo   Database: PostgreSQL (localhost:5433 / quotegenerator)
echo ====================================================

echo Starting Backend Server on port 5000...
start "Quotation Backend (Port 5000)" cmd /k "cd server && npm start"

echo Starting Frontend Dev Server on port 5173...
start "Quotation Frontend (Port 5173)" cmd /k "cd client && npm run dev"

echo.
echo Application starting!
echo Frontend will be available at: http://localhost:5173
echo Backend API available at:     http://localhost:5000
echo Database:                      PostgreSQL @ localhost:5433 (quotegenerator)
echo.
echo Demo Logins:
echo   Administrator:       admin      ^| password: admin123
echo   Business Head:       suresh_bh  ^| password: bh123
echo   Feasibility Arch:    abishek    ^| password: arch123
echo   Lead Architect:      aravindan  ^| password: arch123
echo ====================================================
pause
