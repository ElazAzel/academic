# Student Interaction Audit Framework

Документ фиксирует все взаимодействия ролей LMS со слушателем и используется как чеклист для проверки наличия, работоспособности, прав доступа, событий, уведомлений и данных.

## Цель

Проверить, что каждый сценарий взаимодействия со слушателем:

- реально существует в UI;
- связан с backend/service/action/API;
- защищён role-based доступом;
- работает на seeded/demo data;
- корректно пишет progress/status/audit/activity;
- создаёт нужные notifications;
- не даёт чужой роли увидеть или изменить чужие данные;
- имеет empty/error/loading states;
- покрыт тестом или smoke-сценарием.

## Статусы проверки

| Статус | Значение |
|---|---|
| done | Функция есть и работает end-to-end |
| partial | Есть UI или backend, но сценарий неполный |
| missing | Функции нет |
| broken | Функция есть, но не работает |
| unsafe | Функция работает, но есть риск доступа/данных |
| blocked | Нельзя проверить из-за build/env/db/deploy ошибки |
| deferred | Осознанно отложено за пределы MVP |

## Роли, взаимодействующие со слушателем

| Роль | Тип взаимодействия со слушателем |
|---|---|
| Admin | Создаёт, зачисляет, назначает роли/потоки/кураторов, управляет доступом, сертификатами и статусами |
| Instructor | Создаёт учебный контент, тесты, задания, отвечает на forwarded questions, анализирует результаты |
| Curator | Сопровождает слушателя, отвечает на вопросы, проверяет задания, управляет рисками |
| Super Curator | Управляет кураторами, распределением слушателей, рисками и SLA |
| Customer Observer | Наблюдает за прогрессом слушателей в рамках проекта/потока, без права изменения |
| Student | Проходит обучение, сдаёт задания/тесты, задаёт вопросы и получает сертификаты |

---

# 1. Admin ↔ Student

## 1.1. Создание слушателя

- UI: `/admin/users`
- Backend: user create action/API
- Data: `User`, `UserRole`, optional `ConsentLog`
- Access: admin only, или super_curator only if policy allows
- Audit: `user.created`
- Edge cases: duplicate email, invalid email, weak password, empty name
- Tests: admin can create student; non-admin cannot create student

## 1.2. Назначение роли student

- UI: user detail / roles page
- Backend: assign role action/API
- Data: `UserRole`
- Audit: `user.role_assigned`
- Edge cases: role already exists, user missing, role missing
- Tests: role assigned once, no duplicate rows

## 1.3. Зачисление слушателя на курс

- UI: `/admin/enrollments`
- Backend: enrollment create action/API
- Data: `Enrollment` with `ACTIVE` or `INVITED`
- Notification: `access_granted`, `course_opened`
- Audit: `enrollment.created`
- Edge cases: duplicate enrollment, archived course, inactive student, access dates
- Tests: student receives access only to enrolled course

## 1.4. Назначение слушателя в поток

- UI: `/admin/cohorts` or `/admin/enrollments`
- Backend: enrollment update / cohort assignment
- Data: `Enrollment.cohortId`
- Related: module deadlines from cohort become visible to student
- Edge cases: cohort belongs to different course, inactive cohort
- Tests: student sees correct cohort deadlines

## 1.5. Назначение куратора слушателю

- UI: `/admin/enrollments`, `/admin/cohorts`, `/super-curator/distribution`
- Backend: curator assignment action
- Data: `CuratorAssignment`
- Notification: `curator_assigned` to student, optional notification to curator
- Audit: `curator.assigned`
- Edge cases: duplicate active assignment, reassignment, inactive curator
- Tests: student question routes to assigned curator

## 1.6. Приостановка доступа слушателя

- UI: enrollment detail
- Backend: enrollment status update
- Data: `Enrollment.status = PAUSED/CANCELLED`
- Effect: student cannot open course/lesson/quiz/assignment
- Tests: paused student gets 403 for course lessons

## 1.7. Ручная корректировка прогресса

- UI: admin student progress view
- Backend: admin progress override action
- Data: `LessonProgress`, `ModuleProgress`, `CourseProgress`
- Audit: `progress.overridden` with reason
- Safety: reason required; previous value stored in metadata
- Tests: only admin can override progress

## 1.8. Выдача/отзыв сертификата

- UI: `/admin/certificates` or student profile
- Backend: certificate issue/revoke service
- Data: `Certificate`, `Certificate.revokedAt`
- Notification: `certificate_available`
- Audit: `certificate.issued`, `certificate.revoked`
- Tests: verification URL works; revoked cert invalid

---

# 2. Instructor ↔ Student

## 2.1. Публикация учебного контента

- UI: `/instructor/courses`, course editor
- Backend: lesson/module update actions
- Data: `Course`, `Module`, `Lesson`, `LessonMedia`
- Effect: student sees published content only
- Access: instructor only for assigned courses; admin all
- Tests: instructor cannot edit other instructor course

## 2.2. Создание теста

- UI: `/instructor/quizzes`
- Backend: quiz CRUD service/action
- Data: `Quiz`, `QuizQuestion`
- Effect: student sees quiz in lesson and quizzes list
- Edge cases: empty quiz, invalid correct answer, maxAttempts
- Tests: student can submit quiz; score calculated correctly

## 2.3. Создание задания

- UI: `/instructor/assignments`
- Backend: assignment CRUD service/action
- Data: `Assignment`
- Effect: student sees assignment in lesson and assignments list
- Edge cases: deadline past, maxAttempts, file requirement
- Tests: enrolled student can submit; unassigned student cannot

## 2.4. Аналитика по слушателям

- UI: `/instructor/analytics`
- Backend: analytics service scoped to instructor courses
- Data: enrollments, progress, quiz attempts, submissions
- Privacy: instructor sees only own courses
- Tests: instructor cannot see unrelated course students

## 2.5. Ответ на forwarded question

- UI: `/instructor/questions`
- Backend: forward/answer action
- Data: `LessonQuestion.status = FORWARDED/ANSWERED`
- Notification: answer goes to student and curator
- Audit: `question.answered_by_instructor`
- Tests: forwarded question can be answered by course instructor only

---

# 3. Curator ↔ Student

## 3.1. Просмотр назначенных слушателей

- UI: `/curator/students`
- Backend: query by `CuratorAssignment.curatorId`
- Data: assigned students, enrollments, progress, risks
- Access: curator sees only assigned students
- Tests: curator cannot see unassigned student

## 3.2. Карточка слушателя

- UI: `/curator/students/[studentId]` or equivalent
- Backend: student profile scoped to curator
- Data: profile, courses, progress, questions, submissions, risks
- Privacy: no unrelated course/user data
- Tests: unauthorized student profile returns 403

## 3.3. Ответ на вопрос слушателя

- UI: `/curator/questions`
- Backend: answer question action
- Data: `LessonQuestion.answer`, `answeredAt`, `status`
- Notification: `question_answered` to student
- Audit: `question.answered`
- Edge cases: already answered, question not assigned, empty answer
- Tests: student sees answer in lesson question history

## 3.4. Переадресация вопроса преподавателю

- UI: question detail action
- Backend: forward question action
- Data: `LessonQuestion.status = FORWARDED`
- Notification: instructor receives `question_forwarded`
- Audit: `question.forwarded`
- Tests: forwarded question appears for instructor

## 3.5. Проверка задания слушателя

- UI: `/curator/assignments`
- Backend: review submission action
- Data: `AssignmentSubmission.status`, `score`, `feedback`, `reviewedById`
- Notification: `assignment_reviewed` to student
- Audit: `assignment.reviewed`
- Edge cases: score range, empty feedback for revision, not assigned student
- Tests: student sees feedback and status

## 3.6. Риски по слушателю

- UI: `/curator/risks` or student card
- Backend: risk create/resolve action
- Data: `RiskFlag`
- Types: inactive_login, inactive_learning, behind_schedule, overdue_module, certificate_risk
- Audit: `risk.created`, `risk.resolved`
- Tests: risk appears/disappears correctly on curator dashboard

## 3.7. Уведомление слушателю

- UI: student card or notification form
- Backend: create notification action
- Data: `Notification`
- Channel: default in_app; email only explicit
- Tests: no accidental email on default notification

---

# 4. Super Curator ↔ Student

## 4.1. Просмотр слушателей через кураторов

- UI: `/super-curator/users`, `/super-curator/curators`
- Backend: scope by `superCuratorId` through `CuratorAssignment`
- Data: curator load, student progress, risks
- Access: super_curator sees assigned curator scope unless policy says otherwise
- Tests: super_curator cannot see unrelated cohort

## 4.2. Распределение слушателя к куратору

- UI: `/super-curator/distribution`
- Backend: create/update `CuratorAssignment`
- Data: curatorId, studentId, cohortId, superCuratorId
- Notification: student and curator notified
- Audit: `student.curator_reassigned`
- Tests: future student questions route to new curator

## 4.3. Эскалация риска слушателя

- UI: `/super-curator/risks`
- Backend: risk update action
- Data: risk severity/status/metadata
- Notification: curator notified
- Audit: `risk.escalated`
- Tests: escalated risk visible on super curator dashboard

## 4.4. Переназначение вопроса слушателя

- UI: `/super-curator/questions`
- Backend: question reassignment action
- Data: `LessonQuestion.curatorId`
- Notification: new curator receives notification
- Audit: `question.reassigned`
- Tests: old curator no longer sees question, new curator sees it

---

# 5. Customer Observer ↔ Student

## 5.1. Просмотр прогресса слушателей

- UI: `/customer-observer`
- Backend: reports/analytics scoped to project/cohort
- Data: aggregated progress, completion, certificates
- Privacy: no unnecessary PII unless explicitly allowed
- Access: read-only
- Tests: observer cannot mutate anything

## 5.2. Отчёты по слушателям

- UI: `/customer-observer/reports`
- Backend: scoped reports
- Export: CSV/XLSX/PDF if implemented
- Privacy: only own project/cohort/course
- Audit: `observer.report_viewed/downloaded`
- Tests: observer cannot export global platform data

## 5.3. Сертификаты слушателей

- UI: `/customer-observer/certificates`
- Backend: scoped certificate query
- Data: certificate number, student display name, course, issuedAt, verificationUrl
- Privacy: revoked status visible
- Tests: observer sees only scoped certificates

---

# 6. Student self-actions

## 6.1. Login and redirect

- UI: `/login`
- Backend: NextAuth credentials
- Data: session, lastLoginAt
- Result: student redirects to `/student`
- Tests: `student1@academy.local / Password123!` works

## 6.2. Dashboard

- UI: `/student`
- Data: active courses, progress, deadlines, questions, certificates
- Empty state: no active courses
- Tests: dashboard loads after seed

## 6.3. My courses

- UI: `/student/my-courses`
- Backend: active enrollments only
- Data: course cards, percent, next lesson
- Tests: paused/cancelled courses hidden or marked unavailable

## 6.4. Course page

- UI: `/student/courses/[courseId]`
- Backend: `getCourseForStudent`
- Access: active enrollment required
- Data: modules, lessons, locked states, deadlines
- Tests: non-enrolled course returns 403

## 6.5. Lesson page

- UI: `/student/lessons/[lessonId]`
- Backend: `getLessonForStudent`
- Access: active enrollment + sequential lock check
- Data: content, video, media, quizzes, assignments, questions
- Tests: locked lesson redirects/returns 403

## 6.6. Mark lesson completed

- UI: button in lesson view
- Backend: `/api/v1/progress` / `markLessonProgress`
- Data: lesson/module/course progress
- Rule: progress uses required lessons basis
- Tests: next required lesson unlocks

## 6.7. Submit quiz

- UI: `/student/quizzes/[quizId]`
- Backend: `submitQuizAction` / `submitQuizAttempt`
- Access: active enrollment/course/lesson access
- Data: `QuizAttempt`
- Result: score, passed, optional lesson completion
- Tests: max attempts, pass/fail, unauthorized quiz

## 6.8. Submit assignment

- UI: `/student/assignments/[assignmentId]`
- Backend: `submitAssignmentAction` / `submitAssignment`
- Access: active enrollment/course/lesson access
- Data: `AssignmentSubmission`
- Tests: max attempts, unauthorized assignment, revision resubmit

## 6.9. Ask curator question

- UI: lesson support block
- Backend: `/api/v1/lessons/[lessonId]/questions` / `askCuratorQuestion`
- Access: active enrollment + lesson access
- Data: `LessonQuestion`
- Notification: curator receives in_app notification
- Tests: question appears for curator and in student history

## 6.10. Certificates

- UI: `/student/certificates`
- Backend: certificate list scoped to user
- Data: own certificates only
- Tests: student cannot see another student's certificate unless public verification

---

# 7. Universal validation template

```md
## Function: <name>

- Role:
- Student impact:
- UI route/component:
- Server action/API/service:
- Prisma models:
- Required permissions:
- Existing implementation: done / partial / missing / broken / unsafe / blocked
- Manual test result:
- Automated test result:
- Access control result:
- Notifications result:
- Audit/activity result:
- Data integrity result:
- Empty/error state result:
- Bugs found:
- Fix required:
- Priority: P0 / P1 / P2 / P3
- Owner AI agent:
- Last checked:
```

# 8. Priority order

1. Build/deploy health
2. Login/seed/demo users
3. Student dashboard/course/lesson happy path
4. Progress correctness
5. Quiz/assignment access control
6. Curator question/review workflows
7. Admin enrollment/curator assignment workflows
8. Super curator distribution/risk workflows
9. Customer observer scoped reports
10. Notifications/audit/privacy
