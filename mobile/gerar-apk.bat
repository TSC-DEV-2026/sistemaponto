@echo off
cd /d "%~dp0"
call flutter pub get && call flutter build apk --debug
if errorlevel 1 (
  echo Falha ao gerar o APK.
  pause
  exit /b 1
)
set "OUT=%~dp0build\app\outputs\flutter-apk"
if exist "%OUT%\sistemaponto.apk" del /f /q "%OUT%\sistemaponto.apk"
copy /y "%OUT%\app-debug.apk" "%OUT%\copia-app-debug.apk"
if errorlevel 1 (
  echo Nao foi possivel copiar o APK.
  pause
  exit /b 1
)
ren "%OUT%\copia-app-debug.apk" "sistemaponto.apk"
explorer "%OUT%"
