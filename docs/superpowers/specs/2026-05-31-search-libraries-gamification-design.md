# Design: Поиск, библиотеки, геймификация

**Дата:** 2026-05-31
**Статус:** Реализация начата и частично завершена; фактический прогресс фиксируется в `docs/updates.md`

> Актуализация 2026-05-31: библиотеки установлены, recharts частично внедрён в visit analytics, а геймификация в `XpCenterModal` доведена до финального `npm run verify`. Оставшиеся пункты этого design-документа нельзя считать pending без сверки с кодом и `docs/updates.md`.

---

## 1. 🔍 Глобальный поиск в CommandPalette

### Что меняем

`components/lms/command-palette.tsx` — существующий компонент (Cmd+K, навигация по разделам).

### Что добавляем

1. **API-поиск через debounce** — `useDebounce` из `usehooks-ts` (300ms)
2. **Вызов `/api/v1/search?q=...`** при изменении текста
3. **Три секции результатов:**
   - 📚 **Курсы** — иконка `GraduationCap`, клик → `/course/[id]`
   - 📖 **Уроки** — иконка `BookOpen`, клик → `/lesson/[id]`
   - 👤 **Студенты** — иконка `User` (только для admin, роль проверяется на бэке)
4. **Loading state** — спиннер при запросе
5. **Empty state** — «Ничего не найдено» при пустом результате
6. **Error state** — «Ошибка поиска» при network failure

### Логика отображения

- Пока search query пуст → показываем существующие nav-ссылки (как сейчас)
- Когда query введён → показываем результаты поиска с секциями
- Debounce 300ms, не дёргаем API на каждый символ

### Файлы

| Файл | Действие |
|---|---|
| `components/lms/command-palette.tsx` | Расширить: API-поиск + useDebounce |
| `server/modules/search/service.ts` | Опционально: расширить searchAcademy() для поддержки модулей, блоков |

---

## 2. 📊 Новые библиотеки

### 2.1. recharts — интерактивные графики

**Что:** Заменяем самодельные SVG-компоненты (`components/lms/bar-chart.tsx`) на recharts.

**Где используется:** `components/admin/visit-analytics-block.tsx` (10 вызовов BarChart).

**Новые компоненты:**

```
components/charts/activity-area-chart.tsx    — AreaChart активности по дням
components/charts/visit-bar-chart.tsx         — BarChart посещений с тултипами
components/charts/distribution-pie-chart.tsx  — PieChart распределения студентов
```

**recharts-специфика:**
- ResponsiveContainer для адаптивности
- Tooltip на всех графиках
- Легенда на PieChart
- Анимация при монтировании

**nuqs:** Параметры фильтров (диапазон дат `?from=...&to=...`, `?cohortId=...`) хранятся в URL через `useQueryState` из nuqs. Пользователь может скопировать URL с фильтрами.

### 2.2. vaul + usehooks-ts — мобильные Drawer

**Что:** В `XpCenterModal` на мобилках (<=768px) используем `Drawer` из vaul вместо `Dialog`.

**useMediaQuery** из usehooks-ts определяет breakpoint.

**Паттерн:**
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');
if (isMobile) return <Drawer>...</Drawer>;
return <Dialog>...</Dialog>;
```

### 2.3. hls.js — третий провайдер видео

**Что:** Добавляем провайдер `upload` в VideoBlock наравне с YouTube/Vimeo.

**Тип:** Расширяем `VideoProvider` в `types/domain.ts` — добавляем `"upload"`.

**Course Builder:**
- В выборе провайдера видео появляется `upload`
- Drag'n'drop / file picker для загрузки файла
- Файл загружается через существующую инфраструктуру:
  1. `POST /api/v1/media/uploads` (presigned URL) → получаем publicUrl
  2. Или `uploadFileToSupabase()` из `lib/storage.ts` для прямых загрузок
- URL сохраняется как `providerVideoId` через `uploadLessonMediaAction()` из `server/actions/files.ts`
- Поддерживаемые форматы: `.mp4`, `.m3u8`

**VideoBlock (`components/lms/video-block.tsx`):**
```tsx
if (provider === 'upload') {
  if (url.endsWith('.m3u8')) return <HlsPlayer url={url} />;
  return <video src={url} controls className="w-full h-full" />;
}
```

**HlsPlayer component (`components/lms/hls-player.tsx`):**
- Инициализирует hls.js при монтировании (`new Hls()` + `attachMedia()`)
- Destroy при размонтировании
- Fallback на нативный `<video>` если hls.js не поддерживается (Safari поддерживает HLS нативно)

### 2.4. usehooks-ts (остальное)

| Хук | Где используется |
|---|---|
| `useDebounce` | CommandPalette (поиск) |
| `useMediaQuery` | XpCenterModal (vaul vs dialog) |
| `useLocalStorage` | Настройки, last visited tab |

### 2.5. nuqs

Уже интегрирован в `providers.tsx` (NuqsAdapter).

Добавляем `useQueryState` в:
- страницы отчётов (фильтры в URL)
- аналитику (период, когорта, курс)

### Файлы

| Файл | Действие |
|---|---|
| `components/lms/bar-chart.tsx` | Удалить (заменён recharts) |
| `components/admin/visit-analytics-block.tsx` | Переписать графики на recharts |
| `components/charts/activity-area-chart.tsx` | Новый — AreaChart |
| `components/charts/visit-bar-chart.tsx` | Новый — BarChart |
| `components/charts/distribution-pie-chart.tsx` | Новый — PieChart |
| `components/lms/xp-center-modal.tsx` | Добавить vaul Drawer для мобилок |
| `types/domain.ts` | Добавить `"upload"` в VideoProvider |
| `components/lms/video-block.tsx` | Добавить провайдер `upload` + hls.js |
| `components/lms/hls-player.tsx` | Новый — плеер на hls.js |
| `components/lms/video-upload-field.tsx` | Новый — поле загрузки видео в Course Builder |

---

## 3. 🎮 Геймификация: Ачивки + Streaks

### 3.1. Модели Prisma

```prisma
model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  description String
  icon        String               // название lucide-иконки
  xpReward    Int      @default(0)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  achievementId String
  achievedAt    DateTime    @default(now())
  user          User        @relation(fields: [userId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  @@unique([userId, achievementId])
}

model DailyActivity {
  id       String   @id @default(cuid())
  userId   String
  date     DateTime @db(Date)
  xpEarned Int      @default(0)
  user     User     @relation(fields: [userId], references: [id])
  @@unique([userId, date])
}
```

### 3.2. Ачивки (константа + seed)

| Slug | Название | Условие | XP |
|---|---|---|---|
| `first_lesson` | Первый шаг | Пройти 1 урок | +50 |
| `five_lessons` | Усердный ученик | Пройти 5 уроков | +50 |
| `ten_lessons` | Настойчивый | Пройти 10 уроков | +100 |
| `xp_500` | Накопитель | Получить 500 XP | +50 |
| `xp_1000` | Тысячник | Получить 1000 XP | +100 |
| `xp_2000` | Мастер XP | Получить 2000 XP | +200 |
| `first_quiz_pass` | Проверка знаний | Пройти первый тест | +30 |
| `perfect_quiz` | Идеально | 100% правильных в тесте | +50 |
| `first_assignment` | Первое задание | Сдать первую ДЗ | +40 |
| `streak_3` | Три дня подряд | Серия 3 дня | +30 |
| `streak_7` | Неделя | Серия 7 дней | +100 |
| `streak_30` | Месяц | Серия 30 дней | +500 |
| `feedback_given` | Голос | Оценить 5 уроков | +30 |

### 3.3. Сервисы

**`server/modules/gamification/achievements.ts`**
- `ACHIEVEMENT_DEFINITIONS` — константа со всеми ачивками
- `checkAndAwardAchievement(userId, event)` — проверяет условия, создаёт UserAchievement, начисляет XP
- `getUserAchievements(userId)` — список ачивок пользователя
- `getAchievementStats(userId)` — статистика (получено / всего)

**`server/modules/gamification/streak.ts`**
- `recordStreakActivity(userId)` — записывает `DailyActivity` на сегодня
- `getStreak(userId)` — текущая серия (дней подряд от сегодня)
- `getLongestStreak(userId)` — макс. серия за всё время

**Check-точки:** Где проверяем условия для ачивок:
- После `awardXp('lesson_complete')` → `checkAndAward('lesson_complete')`
- После `submitQuizAttempt` с `passed: true` → `checkAndAward('quiz_pass')`
- После `submitAssignmentAction` → `checkAndAward('assignment_submit')`
- Ежедневно / при заходе → `checkAndAward('streak')`

### 3.4. Seed

`prisma/seed.ts` — добавить вставку 13 ачивок в таблицу `Achievement`.

### 3.5. UI

**`components/lms/xp-center-modal.tsx`** — расширяем:
- Вкладка **«Прогресс»** (уровень + XP — как сейчас)
- Вкладка **«Ачивки»** — сетка 3×N: полученные цветные, недоступные серые
- Вкладка **«Streak»** — виджет «N дней подряд» + тепловая карта 30 дней

**`components/gamification/achievements-grid.tsx`** — новый:
- Принимает список ачивок с флагом `achieved`
- Показывает иконку + название + описание
- Полученные — цветные с галочкой, недоступные — grayscale

**`components/gamification/streak-widget.tsx`** — новый:
- Текущая серия (огонь + число)
- Самая длинная серия
- Тепловая карта 30 дней (решетка 6×5)

### 3.6. Leaderboard

**`components/gamification/leaderboard-panel.tsx`** — новый:
- Вызов `getLeaderboard(20)` из `server/actions/xp.ts`
- Таблица: место, аватар, имя, уровень, XP
- Подсветка текущего пользователя

Интегрируем в XpCenterModal как отдельную вкладку.

### Файлы

| Файл | Действие |
|---|---|
| `prisma/schema.prisma` | Добавить модели Achievement, UserAchievement, DailyActivity |
| `prisma/seed.ts` | Сидировать 13 ачивок |
| `prisma/migrations/` | Новая миграция |
| `server/modules/gamification/achievements.ts` | Новый — сервис ачивок |
| `server/modules/gamification/streak.ts` | Новый — сервис streak |
| `server/actions/xp.ts` | Добавить вызов checkAndAward в точки начисления XP |
| `server/modules/learning/service.ts` | Добавить recordStreakActivity и checkAndAward при завершении урока |
| `server/modules/quizzes/service.ts` | Добавить checkAndAward при успешном тесте |
| `server/actions/student.ts` | Добавить checkAndAward при сдаче ДЗ |
| `components/lms/xp-center-modal.tsx` | Расширить вкладками (ачивки, streak, лидерборд) |
| `components/gamification/achievements-grid.tsx` | Новый — сетка ачивок |
| `components/gamification/streak-widget.tsx` | Новый — виджет streak + тепловая карта |
| `components/gamification/leaderboard-panel.tsx` | Новый — таблица лидерборда |

---

## Порядок реализации

### Batch 1 (независимые, параллельно)
1. **Глобальный поиск** — CommandPalette + useDebounce + API search
2. **recharts + nuqs** — замена графиков в analytics
3. **Prisma миграция** — модели Achievement, UserAchievement, DailyActivity

### Batch 2 (зависит от Batch 1)
4. **vaul + useMediaQuery** — мобильный Drawer в XpCenterModal
5. **hls.js** — upload провайдер + плеер
6. **Сервисы геймификации** — achievements.ts + streak.ts
7. **Seed ачивок**

### Batch 3 (зависит от Batch 2)
8. **UI геймификации** — ачивки, streak, лидерборд в XpCenterModal
9. **Интеграция checkAndAward** — точки вызова в уроки/тесты/задания
