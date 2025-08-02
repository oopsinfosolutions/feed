@echo off
cls
echo ===============================================
echo    Backend Server Connection Diagnostic Tool
echo ===============================================
echo.

echo 🔍 Checking system configuration...
echo.

echo ========== SYSTEM INFORMATION ==========
echo Computer Name: %COMPUTERNAME%
echo User: %USERNAME%
echo Platform: %OS%
echo.

echo ========== NETWORK CONFIGURATION ==========
echo Getting IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    setlocal enabledelayedexpansion
    set ip=!ip: =!
    echo Your IP Address: !ip!
    set MY_IP=!ip!
    endlocal & set MY_IP=%ip%
)
echo.

echo ========== PORT CHECK ==========
echo Checking if port 3000 is in use...
netstat -an | findstr :3000
if %errorlevel% == 0 (
    echo ✅ Port 3000 is in use - Server might be running
) else (
    echo ❌ Port 3000 is not in use - Server is NOT running
    echo.
    echo 🚀 TO START SERVER:
    echo    1. Open Command Prompt
    echo    2. Navigate to your backend directory: cd backend/Database
    echo    3. Run: npm start
    echo.
    goto :end
)
echo.

echo ========== PROCESS CHECK ==========
echo Finding process using port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Process ID: %%a
    tasklist /fi "PID eq %%a" 2>nul | findstr /v "INFO:"
)
echo.

echo ========== CONNECTION TESTS ==========
echo Testing server connectivity...
echo.

echo Testing localhost...
curl -s http://localhost:3000/health 2>nul
if %errorlevel% == 0 (
    echo ✅ localhost:3000 - Working
) else (
    echo ❌ localhost:3000 - Failed
)

echo Testing 127.0.0.1...
curl -s http://127.0.0.1:3000/health 2>nul
if %errorlevel% == 0 (
    echo ✅ 127.0.0.1:3000 - Working
) else (
    echo ❌ 127.0.0.1:3000 - Failed
)

if defined MY_IP (
    echo Testing network IP: %MY_IP%...
    curl -s http://%MY_IP%:3000/health 2>nul
    if %errorlevel% == 0 (
        echo ✅ %MY_IP%:3000 - Working
        echo.
        echo 📱 MOBILE APP CONFIGURATION:
        echo    Update your API_CONFIG.BASE_URL to: http://%MY_IP%:3000
        echo.
    ) else (
        echo ❌ %MY_IP%:3000 - Failed
        echo.
        echo 🔥 FIREWALL ISSUE DETECTED!
        echo.
        echo SOLUTIONS:
        echo 1. Temporarily disable Windows Firewall
        echo 2. Or add firewall rule for port 3000
        echo 3. Run as Administrator:
        echo    netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=3000
        echo.
    )
)

echo ========== FIREWALL CHECK ==========
echo Checking Windows Firewall status...
netsh advfirewall show allprofiles state | findstr "State"
echo.
echo If firewall is ON and mobile app can't connect:
echo 1. Temporarily turn OFF firewall for testing
echo 2. Or add firewall exception for port 3000
echo.

echo ========== WIFI CHECK ==========
echo Your WiFi network:
netsh wlan show profiles | findstr "All User Profile"
echo.
echo ⚠️  IMPORTANT: Your phone must be on the SAME WiFi network!
echo.

echo ========== RECOMMENDATIONS ==========
if defined MY_IP (
    echo 📱 Update your mobile app with this configuration:
    echo.
    echo    const API_CONFIG.BASE_URL = 'http://%MY_IP%:3000';
    echo.
    echo 🧪 Test in phone browser first:
    echo    Open browser on phone and go to: http://%MY_IP%:3000/health
    echo    You should see: {"success":true,"message":"Server is running"}
    echo.
)

echo 🔧 TROUBLESHOOTING STEPS:
echo 1. Ensure server is running: npm start
echo 2. Check firewall settings
echo 3. Verify phone and computer on same WiFi
echo 4. Test server URL in phone browser
echo 5. Update mobile app IP address
echo.

echo ========== QUICK FIXES ==========
echo If still having issues, try these:
echo.
echo 1. RESTART EVERYTHING:
echo    - Stop server (Ctrl+C)
echo    - Start server: npm start
echo    - Restart mobile app
echo.
echo 2. DISABLE FIREWALL (temporarily):
echo    - Go to Windows Security
echo    - Turn off firewall for private networks
echo    - Test mobile app
echo    - Turn firewall back on
echo.
echo 3. USE MOBILE HOTSPOT:
echo    - Enable hotspot on phone
echo    - Connect computer to phone's WiFi
echo    - Check IP address again
echo    - Update mobile app
echo.

:end
echo.
echo 🏁 Diagnostic complete!
echo.
echo Press any key to run advanced Node.js diagnostics...
pause >nul

if exist diagnose.js (
    echo Running Node.js diagnostic script...
    node diagnose.js
) else (
    echo ⚠️  diagnose.js not found in current directory
    echo Create the diagnose.js file first, then run this script again
)

echo.
echo Press any key to exit...
pause >nul