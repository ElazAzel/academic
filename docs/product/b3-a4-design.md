# B3 + A4 Design: Productivity Score Distribution & SMTP Production Wiring

> Дата: 2026-06-16
> Статус: approved

---

## B3: Productivity Score Distribution на странице отчётов Observer

### Цель

Показать наглядное распределение Productivity Score по уровням (Champion / Advanced / Practitioner / Beginner) на странице `/customer-observer/reports` с использованием существующего recharts-компонента.

### Архитектура

```
page.tsx → getProductivityDistribution() [Server Action]
         → calculateForUser() per scoped student
         → aggregate { champion, advanced, practitioner, beginner }
         → ProductivityDistributionChart [Client Component]
         → DistributionPieChart (recharts)
```

### Компоненты

#### 1. Server Action: `getProductivityDistribution(actor, scope)`

- **Где:** `server/actions/reports/productivity-distribution.ts` (новый файл)
- **Вход:** `actor: User`, `scope: ReportScope`
- **Логика:**
  1. Получить scoped student IDs через `getScopedStudentIdsForObserver(actor.id)` — для Observer
  2. Если scope не Observer — использовать стандартную логику resolve
  3. Для каждого студента вызвать `calculateForUser(studentId, courseId)`
  4. Агрегировать: посчитать количество студентов на каждом уровне
  5. Вычислить средний балл
- **Выход:**
  ```ts
  interface ProductivityDistribution {
    levels: { level: ProductivityLevel; count: number; percentage: number }[];
    averageScore: number;
    totalStudents: number;
  }
  ```

#### 2. Компонент: `ProductivityDistributionCard`

- **Где:** `components/lms/productivity-distribution-card.tsx` (новый файл)
- **Что делает:**
  - Запрашивает `getProductivityDistribution()` на клиенте через Server Action
  - Рендерит `DistributionPieChart` с уровнями
  - Показывает сводку: "Средний балл: X.X · N студентов"
  - Легенда: Champion (зелёный), Advanced (синий), Practitioner (янтарный), Beginner (красный)
- **Состояния:**
  - loading: `<PageSkeleton />`
  - empty (0 студентов): сообщение "Нет данных для отображения."
  - error: сообщение "Ошибка загрузки распределения Productivity Score"
  - данные: PieChart + сводка

#### 3. Интеграция в `app/customer-observer/reports/page.tsx`

- После существующей секции с MetricGrid + BarChart, перед ReportDesigner
- Новая секция `<ProductivityDistributionCard />` в отдельной card-обёртке

### Цветовая схема

| Level | Цвет | Hex |
|-------|------|-----|
| Champion | Зелёный | `#22c55e` |
| Advanced | Синий | `#3b82f6` |
| Practitioner | Янтарный | `#f59e0b` |
| Beginner | Красный | `#ef4444` |

### Error handling

- Server Action возвращает `null` при ошибке → компонент показывает fallback
- Если `calculateForUser()` падает на конкретном студенте — логируем и пропускаем (не валим весь запрос)
- RBAC проверки внутри `calculateForUser()` уже есть — дублировать не нужно

---

## A4: SMTP Production Wiring

### Цель

Подготовить production-ready SMTP транспортер, добавить переключатель в Admin UI и обновить документацию.

### Компоненты

#### 1. Transporter hardening

**Где:** `server/modules/notifications/service.ts`

**Изменения:**
- `pool: true` + `maxConnections: 5` — connection pooling для повторных отправок
- `connectionTimeout: 10000` — таймаут соединения 10с
- `greetingTimeout: 5000` — таймаут приветствия 5с
- `logger: true` — логирование в dev/prod
- Сохранить `secure: port === 465`

```ts
nodemailerTransporter = nodemailer.default.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  pool: true,
  maxConnections: 5,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  logger: true,
  auth: env.SMTP_USER ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD ?? "",
  } : undefined,
});
```

#### 2. Admin UI — feature flag

**Где:** `app/admin/settings/page.tsx`

**Изменение:**
Добавить `FEATURE_EMAIL_NOTIFICATIONS` в массив `FEATURE_FLAGS`:

```ts
{
  key: "FEATURE_EMAIL_NOTIFICATIONS",
  label: "Email-уведомления",
  description: "Отправка email-уведомлений через SMTP",
}
```

#### 3. Документация

**Где:** `.env.example`

**Изменение:** Раскомментировать секцию SMTP, добавить комментарий:
```env
# SMTP — production
FEATURE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="AI Strategic Academy <noreply@example.com>"
```

**Где:** `docs/deployment.md` — добавить раздел "Настройка SMTP"

### Что НЕ делаем

- ❌ HTML-шаблоны писем (plain text работает)
- ❌ Email-очередь через outbox
- ❌ Кнопка "Тест SMTP" в админке
- ❌ Аудит отправки в audit_log
- ❌ DKIM/SPF/DMARC конфигурация
- ❌ Rate limiting на password reset

---

## Tests

### B3
- **Новые тесты:** `tests/unit/productivity-distribution.test.ts`
  - Server Action возвращает корректную агрегацию
  - Пустой список студентов → `null`
  - RBAC: Observer без доступа → пусто

### A4
- **Существующие тесты:** `tests/unit/notifications-service.test.ts` — обновить при изменении транспортера
- **Ручная проверка:** включить флаг в Admin UI, проверить что `FEATURE_EMAIL_NOTIFICATIONS=true` применяется

## Release check

- `npm run lint` — 0 errors, 0 warnings
- `npm run typecheck` — clean
- `npm run test` — 933+ тестов
- `npm run build` — production build
