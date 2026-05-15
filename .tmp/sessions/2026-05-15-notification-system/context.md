# Task Context: Notification System

Session ID: 2026-05-15-notification-system
Created: 2026-05-15T00:00:00.000Z
Status: in_progress

## Current Request
Настроить полностью систему уведомлений:
1. Уведомления о сообщениях от куратора и от слушателя
2. Admin popup (всплывающий попап) с настройкой под каждую роль пользователей
3. Popup показывается один раз при открытии платформы после отправки админом
4. Popup содержит: картинку, текст, ссылку
5. Кнопка "Принято" для скрытия попапа
6. Popup дублируется как уведомление в уведомлениях
7. Кнопка "Подробнее" у каждого уведомления
8. У сообщений "Подробнее" переводит на страницу чата
9. Popup-уведомление открывается из уведомлений по кнопке "Подробнее"
10. Уведомления о прохождении блока или модуля

## Context Files (Standards)
- Нет загруженных контекстных файлов

## Reference Files (Source Material)
- `prisma/schema.prisma` — Основная схема БД
- `server/modules/notifications/service.ts` — Существующий сервис уведомлений
- `server/modules/notifications/preferences.ts` — Настройки уведомлений
- `server/modules/notifications/push.ts` — Push-уведомления
- `app/api/v1/notifications/route.ts` — API уведомлений
- `components/lms/notifications-dropdown.tsx` — Dropdown уведомлений
- `app/student/notifications/page.tsx` — Страница уведомлений студента
- `server/actions/chat.ts` — Чат server actions
- `components/lms/chat-panel.tsx` — Чат компонент
- `components/layout/app-shell.tsx` — Оболочка приложения
- `components/layout/site-header.tsx` — Шапка сайта
- `components/providers.tsx` — Провайдеры
- `lib/http.ts` — HTTP утилиты
- `lib/auth/session.ts` — Сессия
- `lib/auth/page-guards.ts` — Guard для страниц
- `lib/auth/rbac.ts` — Права доступа
- `types/domain.ts` — Типы

## Components to Build

### 1. Prisma Models
- **AdminPopup** — сущность попапа (title, message, imageUrl, linkUrl, targetRoles[], isActive)
- **PopupView** — отслеживание просмотров (userId, popupId, viewedAt)
- **Notification upgrade** — добавить refId, refType для ссылок

### 2. Popup Service (server/modules/popups/)
- createPopup, getActivePopupsForUser, acknowledgePopup
- fetchPopupsForRoles

### 3. API Routes
- POST /api/v1/popups — создать попап (admin)
- GET /api/v1/popups/active — получить активные попапы для текущего пользователя
- POST /api/v1/popups/acknowledge — отметить как просмотренный
- PATCH /api/v1/notifications — расширить (markRead для одного)

### 4. UI Components
- **PopupModal** — модалка для показа попапа
- **AdminPopupForm** — форма создания попапа (admin)
- **NotificationPage** — общая страница уведомлений для всех ролей
- **Enhanced NotificationsDropdown** — с кнопкой "Подробнее"

### 5. Integrations
- **Chat→Notification** — при отправке сообщения создавать уведомление
- **Progress→Notification** — при COMPLETED блок/модуль создавать уведомление

## Constraints
- Российский интерфейс (только русский язык)
- Next.js 16 App Router
- Prisma ORM + PostgreSQL (Supabase)
- TypeScript strict mode
- Zod validation
- Все роли: admin, super_curator, curator, instructor, student, customer_observer

## Exit Criteria
- [ ] Созданы и применены миграции Prisma (AdminPopup, PopupView, Notification upgrade)
- [ ] Admin может создавать попапы с выбором целевых ролей
- [ ] Popup показывается пользователю 1 раз при загрузке платформы
- [ ] Кнопка "Принято" скрывает попап и помечает как просмотренный
- [ ] Popup дублируется как уведомление в список уведомлений
- [ ] Кнопка "Подробнее" есть у каждого уведомления
- [ ] "Подробнее" для сообщений ведёт в чат
- [ ] "Подробнее" для попапа открывает попап повторно
- [ ] Уведомление о новом сообщении приходит и отправителю и получателю
- [ ] Уведомление о завершении блока/модуля приходит слушателю
- [ ] Страница уведомлений доступна для всех ролей
