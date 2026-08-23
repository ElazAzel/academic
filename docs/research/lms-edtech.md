# Исследование UX/фич открытых LMS и EdTech для «AI Strategic Academy»

Цель: вытащить конкретные паттерны интерфейсов под роли
студент / куратор / преподаватель / админ / супер-куратор / заказчик.
Изучены через docs и web (см. конец). Код не копировали, берём только поведение и структуру экранов.

## 1. Ролевые дашборды

**Moodle** (`moodle/moodle`, `lib/classes/dashboard`, `blocks/`)
- Дашборд настраиваемый: блоки Course overview + Timeline + Calendar (drawer справа).
- Разделение: Dashboard = действия (недавнее, дедлайны), вкладка My courses = все зачисления.
  Это ловушка: возвращающиеся студенты не видят новых курсов. Для нас: на дашборде
  куратора держать и «мои потоки», и «все курсы» одновременно.
- Админ сбрасывает дашборд для всех (`Site admin > Appearance > Default Dashboard page`).

**Open edX** (`openedx/frontend-app-learner-dashboard`, `openedx/openedx-aspects`)
- Learner dashboard = React-MFE: карточки курсов, % завершения, дедлайны.
- Аналитика куратора/админа едет отдельно, в Superset: `individual_learner_dashboard`
  (Learner Summary + разбивка по страницам/видео/задачам), `learner_groups_dashboard`
  (at-risk), `course_overview_dashboard`. Куратор видит одного студента и зумит вглубь.

**Canvas** (`incompassing/canvas-lms`)
- Три вида: Card View (плитки с вкладками Announcements/Assignments/Discussions/Files),
  List View, Recent Activity.
- С мая 2026 опциональный виджетный дашборд: Coursework (все задания с фильтром
  Missing/Upcoming), To-Do, Instant Grades, People, Announcements. Студент тащит виджеты.
  Важно: только для чисто студенческой роли, совмещённым ролям не показывается.

**Chamilo** (`chamilo/chamilo-lms`)
- Дашборд = сессии (это их когорты), прогресс по таймлайну, Skills Wheel, соцлента.
- Куратор привязан к сессии (coach), админ видит глобальный мониторинг:
  студенты под надзором, кураторы, сессии, средние показатели.

**Opigno** (`opigno/opigno_lms` + `opigno_dashboard`)
- Дашборд собирается из drag-and-drop блоков; админ может сделать блоки обязательными.
- Роли из коробки: student, teacher, class coach, content manager, user manager, administrator.
  class coach = наш куратор. Роль вешается на уровне курса или всей платформы.

**ILIAS / Gibbon** (`ILIAS` ilias.de, `GibbonEdu/core`)
- ILIAS: персональный рабочий стол, роли зеркалят оргструктуру (начальник видит команду).
- Gibbon: Planner + Smart Blocks, домашка и оценка привязаны к уроку и Markbook.

> Вывод: bento (виджеты/блоки) берут Moodle, Opigno, Chamilo; Card View — Canvas, Open edX.
> Для академии: студенту — Card + виджет «мои задачи», куратору — обязательный блок
> «мои потоки + at-risk», заказчику — сводный дашборд как Aspects.

## 2. Страница курса и карточки прогресса

- **Moodle**: блок Course overview показывает прогресс и дедлайны по каждому курсу.
- **Open edX**: courseware + боковая навигация (стал дефолтом в Sumac-релизе) —
  дерево модулей слева, контент справа.
- **Canvas**: Modules + прогресс по модулю, цвет/никнейм курса настраиваются.
- **Masteriyo** (`Masteriyo`): distraction-free страница урока, превью урока до зачисления,
  content drip (отложенный выпуск уроков), prerequisite.
- **LifterLMS** (`LifterLMS/LifterLMS`): student dashboard, конспекты (note-taking),
  cohorts, drip, course tracks, prerequisites.

Карточка прогресса = минимум: % завершения, следующий дедлайн, счётчик непроверенных
заданий. Chamilo добавляет Skills Wheel — визуал компетенций, а не только %.

## 3. Lesson player

- **Open edX video player** (`edx-platform`, docs `SFD_video_player`): транскрипт
  справа с кликом по строке -> перемотка, CC, меню языка, скачивание видео/транскрипта,
  handouts, лицензия под плеером. Транскрипт скроллится синхронно.
- **H5P** (`h5p/h5p-php`, `h5p.org/interactive-video`): интерактивное видео — вопросы
  и попапы прямо во время просмотра (multiple choice, fill-in, текст).
- **Masteriyo**: picture-in-picture, субтитры, таймкоды, заметки внутри урока.
- **Sensei** (`senseilms/sensei`): Learning Mode, Featured Video, блок Lesson Actions,
  Conditional Content (часть контента видна только подгруппе).
- **Moodle**: VideoJS + H5P интерактив через плагин.

Паттерн плеера для академии: видео слева, транскрипт/заметки справа, вкладки
«Материалы / Задание / Вопрос куратору» под плеером. Кнопка «Отметить пройденным»
скрывается, если к уроку привязан обязательный квиз (как в Sensei: Pass required).

## 4. XP / прогресс / сертификаты / квизы / задания на проверку

- **myCred** (надстройка над LearnDash/LifterLMS/Tutor/Masteriyo/Sensei): очки, бейджи,
  лидерборды, Credly/Badgr. Геймификация вешается на события «урок пройден»,
  «квиз сдан», «курс завершён».
- **Chamilo**: сертификаты с QR-верификацией, Open Badges, Skills, gradebook; батч-генерация
  PDF для всех подошедших.
- **Masteriyo**: quiz builder (MCQ/true-false/matching/ordering), лимит времени и попыток,
  quiz review (где ошибка), Gradebook, Q&A на уроке.
- **LearnPress** (`LearnPress/learnpress`): аддоны Certificates (drag-drop шаблоны),
  Gradebook, Assignments (эссе на проверку).
- **Sensei**: страница Grading со статусами Ungraded / In Progress / Graded / Completed /
  Passed / Failed; ручная проверка вопросов (галочка/крестик) + кастомный фидбек.
  Quiz привязан к уроку, Pass required скрывает Complete Lesson.
- **LifterLMS**: assignments, quizzes, question banks, когорты, ретейки.
- **Open edX**: авто-сертификаты, брендированные, скачиваемые.

Задания на проверку (куратор/препод): очередь Ungraded -> боковая панель с документом
слева и оценкой/фидбеком справа (паттерн PressPrimer Assignment, Sensei Grading).
Для академии: отдельная вкладка «На проверке» у куратора с фильтром по потоку.

## 5. Потоки (cohorts), уведомления, вопросы куратору

- **Moodle**: Cohorts (сайт-或 категорийные группы) + Groups. Separate/Visible groups
  изолируют преподавателя от чужих сабмитов и уведомлений. Allocated markers — разные
  проверяющие на разные юниты. Коммуникация: Announcements (форум+рассылка), Quickmail
  (группам), Messaging (IM). Уведомления настраиваются per-event (quiz submitted,
  lesson essay graded, course completed).
  -> это прямо наши роли куратор/препод: Separate groups режут шум.
- **Chamilo**: сессии = когорты, у каждой свой coach, импорт CSV/XML, изоляция документов
  сессии.
- **Sensei**: Easy Groups & Cohorts (Pro) — доступ и разные треки по группам.
- **Opigno**: группы, live meetings, внутренние сообщения, соцлента (like/comment),
  форумы в курсе, push в мобильном.
- **Canvas**: Conferences = BigBlueButton, групповые конференции студентов.
- **BigBlueButton** (`BigBlueButton/bigbluebutton`): нативные интеграции с Moodle
  (`mod_bigbluebuttonbn`), Canvas, Chamilo, Open edX; запись и playback сессий.
- **Jitsi** (`jitsi/jitsi-meet`): плагин `mod_jitsi` для Moodle, iframe API, E2E-шифрование,
  self-host. Дешевле BBB, проще по функциям (без записи из коробки).
- **Вопрос куратору**: Masteriyo Q&A на уроке, LearnPress Q&A, Moodle Q&A forum + Messaging.
  Паттерн: кнопка «Спросить куратора» прямо в плеере -> тикет/тред, привязанный к уроку.

> Вывод по ролям:
> - студент: Card-дашборд + виджет задач, плеер с транскриптом, Q&A, прогресс/XP.
> - куратор: обязательный блок потоков, вкладка «на проверке», at-risk, Separate groups.
> - преподаватель: authoring (Studio-like), grading, announcements, live-сессия (BBB/Jitsi).
> - супер-куратор: глобальный мониторинг как Chamilo/Aspects, кросс-поточная сводка.
> - админ: роли/права, сброс дашбордов, сертификаты, интеграции.
> - заказчик: сводный дашборд (Enrollments, Completion, Drop-off) как Canvas Admin Analytics.

## Репозитории, которые изучили

Через docs/web (без клонирования кодовой базы целиком):
- `moodle/moodle` — дашборд, блоки, cohorts, notifications
- `openedx/edx-platform` + `openedx/frontend-app-learner-dashboard` + `openedx/openedx-aspects` — learner dashboard, courseware, Superset-аналитика
- `chamilo/chamilo-lms` — сессии/коhortы, skills, сертификаты, соцлента
- `GibbonEdu/core` — Planner, Smart Blocks, Markbook
- `LearnPress/learnpress` — curriculum, аддоны Certificates/Gradebook/Assignments
- `TipTopSoft/tutor-lms` — course/lesson builder, quiz, AI Studio (по docs)
- `senseilms/sensei` (Automattic) — Learning Mode, Grading, Conditional Content, Cohorts
- `Masteriyo` (нет в указанном gh-пути, изучен по WordPress.org/docs) — distraction-free player, Q&A, quiz review
- `LifterLMS/LifterLMS` — student dashboard, cohorts, drip, assignments
- `incompassing/canvas-lms` — Card/List виды, виджетный дашборд 2026, Conferences
- `ILIAS` (ilias.de, GPL) — роли под оргструктуру, персональный стол
- `opigno/opigno_lms` + `opigno_dashboard` — drag-drop дашборд, class coach, live meetings
- `BigBlueButton/bigbluebutton` — виртуальный класс, запись, интеграции
- `jitsi/jitsi-meet` — self-host видео, iframe API, E2E
- `h5p/h5p-php` + `h5p.org` — интерактивное видео и 50+ типов контента
- `brandonhimpfen/awesome-edtech` и связанные awesome-learning-management-systems / awesome-online-learning — для расширения списка платформ

Не нашёл внятного публичного репозитория `artofcode-org/...` из запроса; оставил за скобкой.
