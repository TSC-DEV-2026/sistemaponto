@echo off
cd /d "%~dp0"
call flutter pub get && call flutter build apk --release
if errorlevel 1 (
  echo Falha ao gerar o APK.
  pause
  exit /b 1
)
set "OUT=%~dp0build\app\outputs\flutter-apk"
if exist "%OUT%\sistemapontorep.apk" del /f /q "%OUT%\sistemapontorep.apk"
copy /y "%OUT%\app-release.apk" "%OUT%\copia-app-release.apk"
if errorlevel 1 (
  echo Nao foi possivel copiar o APK.
  pause
  exit /b 1
)
ren "%OUT%\copia-app-release.apk" "sistemapontorep.apk"
explorer "%OUT%"
