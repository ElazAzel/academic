@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Откат ветки main к рабочему коммиту fb6e894
echo ============================================
echo.
echo Это удалит все сломанные коммиты и вернёт рабочую версию.
echo.
pause

cd /d "%~dp0"
git reset --hard fb6e894
if %errorlevel% neq 0 (
    echo.
    echo ОШИБКА: git reset не удался
    pause
    exit /b 1
)

echo.
echo Локальный откат выполнен. Отправляю на GitHub...
echo.
git push --force origin main
if %errorlevel% neq 0 (
    echo.
    echo ОШИБКА: git push не удался. Проверь доступ к GitHub.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   ГОТОВО! Ветка main откачена к fb6e894.
echo   Vercel автоматически пересоберёт проект.
echo ============================================
echo.
pause
