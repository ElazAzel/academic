@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Фикс 500 ошибки - убираем краш при запуске
echo ============================================
echo.
pause

cd /d "%~dp0"
git add lib/env.ts
git commit -m "fix: replace CRON_SECRET crash with warning to prevent 500 on startup"
git push origin main

echo.
echo ============================================
echo   ГОТОВО! Vercel пересоберёт проект.
echo   Подожди 2-3 минуты и обнови сайт.
echo ============================================
echo.
pause
