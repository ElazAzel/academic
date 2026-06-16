# Deployment Guide — AI Strategic Academy

## Variables окружения

### SMTP (email-уведомления)

```env
FEATURE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="AI Strategic Academy <noreply@example.com>"
```

**Порядок настройки:**
1. Установите переменные окружения (см. `.env.example`)
2. Включите `FEATURE_EMAIL_NOTIFICATIONS` в Admin UI: Настройки → Уведомления → Email-уведомления
3. Проверьте отправку: запросите сброс пароля — письмо придёт на email пользователя

**Требования к SMTP-серверу:**
- Поддержка STARTTLS (порт 587) или SSL (порт 465)
- Аутентификация по логину/паролю (не требуется для локального релея)

**Рекомендации:**
- Для высоких нагрузок увеличьте `maxConnections` в `server/modules/notifications/service.ts`
- DKIM/SPF/DMARC настройте на уровне SMTP-провайдера
