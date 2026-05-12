# Student Interaction Audit Results

## Summary

- **Overall status:** yellow — core flows work, but multiple security gaps exist
- **Critical blockers:** 5 unsafe/broken functions need P0 fixes before production
- **Unsafe functions:** 7 (data leakage across roles)
- **Broken functions:** 4 (UX bugs, missing error handling)
- **Missing functions:** 5 (student card, settings actions, file upload)
- **MVP-ready functions:** ~60% of checked interactions

## Matrix

### Admin ↔ Student

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Create student | `/admin/users` `CreateUserModal` | `createUserAction` → `users/service.createUser` | ✅ `requireRole(["admin","super_curator"])` + server-side `assignableRoles` check | ✅ | ❌ No notification | ✅ `user.created` | Partial | done | — | — |
| 2 | Assign student role | `UserRoleEditor` | `PATCH /api/v1/users/{id}/roles` → `setUserRoles` | ✅ Server enforces `assignableRoles` | ✅ | ❌ No notification | ✅ `user.roles_updated` | Partial | done | — | — |
| 3 | Enroll student in course | `/admin/enrollments` `EnrollStudentForm` | `enrollStudentAction` → `courses/service.enrollStudent` | ✅ `requireRole(["admin"])` on action | ✅ (upsert) | ❌ No notification (template `access_granted` exists but unused) | ✅ `enrollment.upserted` | Partial | partial | P2 | Add notification on enrollment |
| 4 | Assign student to cohort | `/admin/enrollments` (via `cohortId` in form) | Same as #3 (cohortId passed to enrollStudent) | ✅ Same as #3 | ✅ | ❌ No notification | ✅ Same | Partial | done | — | — |
| 5 | Assign curator to student | `/admin/enrollments`, `/super-curator/distribution` | `assignCuratorAction`, `assignCuratorFromSupervisorAction` | ✅ `requireRole(["admin"])` / `["super_curator","admin"]` | ✅ (upsert) | ❌ No notification to student (`curator_assigned` template exists but unused) | ✅ `curator.assigned` | Partial | partial | P2 | Add notification on curator assignment |
| 6 | Pause student access | ❌ Missing (no UI to change enrollment status individually) | ❌ No dedicated action | — | — | — | — | — | missing | P1 | Add enrollment status toggle |
| 7 | Resume student access | ❌ Missing | ❌ No dedicated action | — | — | — | — | — | missing | P1 | Add enrollment status toggle |
| 8 | Cancel enrollment | `/admin/enrollments` `DeleteEnrollmentButton` | `deleteEnrollmentAction` | ✅ `requireRole(["admin"])` | ✅ Deletes enrollment + curator assignments | ❌ No notification | ✅ `enrollment.deleted` | Partial | done | — | — |
| 9 | Manual progress correction | ❌ Missing | ❌ No service/action | — | — | — | — | — | missing | P3 | Deferred |
| 10 | View student card | ❌ Missing (no `/admin/students/[id]`) | ❌ No dedicated page | — | — | — | — | — | missing | P3 | Deferred |
| 11 | View student progress | Partially via enrollments table | N/A (enrollment list shows course + status) | ✅ Scoped to admin | — | — | — | — | partial | — | — |
| 12 | View student assignments | ❌ Missing (no admin assignments view) | — | — | — | — | — | — | missing | P3 | Deferred |
| 13 | View student quizzes | ❌ Missing | — | — | — | — | — | — | missing | P3 | Deferred |
| 14 | View student questions | `AdminDashboard` has general stats | `getAdminDashboard` | ✅ Admin-only | — | — | — | — | partial | — | — |
| 15 | Issue certificate | `POST /api/v1/certificates` | `issueCertificate` | ✅ `requireUser("certificates:issue")` (admin-only) | ✅ | ❌ No notification (`certificate_available` exists but unused in flow) | ✅ `certificate.issued` | Partial | partial | P2 | Add notification on certificate |
| 16 | Revoke certificate | ❌ Missing (no revoke API/action) | `Certificate.revokedAt` exists in schema but no API to set it | — | — | — | — | — | missing | P1 | Add revoke endpoint |
| 17 | Create invite link | `/admin/invites` | `createInviteAction` | ✅ `requireRole(["admin"])` | ✅ | ❌ No notification | ✅ `invite.created` | Partial | done | — | — |
| 18 | Restrict invite by email | Invite form has `allowedEmail` field | Invite schema supports `allowedEmail` | ✅ Server-side check on activation | ✅ | — | — | Partial | done | — | — |
| 19 | Audit log for student actions | `/admin/audit` | audit service | ✅ Admin-only | — | — | — | ✅ | done | — | — |

### Instructor ↔ Student

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Instructor sees only own courses | `/instructor/courses` | `listCourses(undefined, userId)` | ✅ `instructors: { some: { userId } }` | — | — | — | Partial | done | — | — |
| 2 | Instructor creates/edits module | `/instructor/courses/[id]/curriculum` | `createModule`, `updateModule` | ❌ **NO instructor ownership check** in service | ✅ | — | ✅ | ❌ | unsafe | P0 | Add instructor check to module CRUD |
| 3 | Instructor creates/edits lesson | `/instructor/lessons/[id]/edit` | `createLesson`, `updateLesson` | ❌ **NO instructor ownership check** in service | ✅ | — | ✅ | ❌ | unsafe | P0 | Add instructor check to lesson CRUD |
| 4 | Instructor publishes content | Lesson edit form PATCH via API | `updateLesson` (status change) | ❌ **NO instructor ownership check** in service | ✅ | — | ✅ `lesson.updated` | ❌ | unsafe | P0 | Same as #3 |
| 5 | Student sees published content | `getLessonForStudent` | `learning/service` | ✅ Enrollment + sequential lock | — | — | — | ✅ | done | — | — |
| 6 | Student does NOT see draft/archived | `getLessonForStudent` | Lesson accessible only via enrollment | ✅ Enrollment check prevents access to unenrolled courses | — | — | — | Partial | done | — | — |
| 7 | Instructor creates quiz | `/instructor/quizzes/[id]/edit` | `POST /api/v1/quizzes/{id}/questions` | ❌ `requireUser("quizzes:write")` but **NO course ownership check** | ✅ | — | — | ❌ | unsafe | P1 | Add course ownership check |
| 8 | Student sees quiz in lesson | `getLessonForStudent` → quizzes list | `learning/service` | ✅ Enrollment check | — | — | — | ✅ | done | — | — |
| 9 | Student takes quiz | `/student/quizzes/[id]` | `submitQuizAttempt` | ✅ Enrollment + lesson access check | ✅ | — | — | ✅ | done | — | — |
| 10 | Quiz result saved | `POST /api/v1/quizzes/{id}/attempts` | `submitQuizAttempt` | ✅ CourseId resolved from lesson | ✅ | — | — | ✅ | done | — | — |
| 11 | Progress updates after passed quiz | `submitQuizAttempt` calls `markLessonProgress` | `progress/service` | ✅ Students enrolled only | ✅ | — | — | ✅ | done | — | — |
| 12 | Instructor creates assignment | `/instructor/assignments/[id]/edit` | `POST /api/v1/assignments` | ❌ `requireUser("courses:write")` but **NO course ownership check** | ✅ | — | ✅ | ❌ | unsafe | P1 | Add course ownership check |
| 13 | Student sees assignment | `getLessonForStudent` → assignments | `learning/service` | ✅ Enrollment check | — | — | — | ✅ | done | — | — |
| 14 | Student submits assignment | `/student/assignments/[id]` | `submitAssignment` | ✅ Enrollment + courseId check | ✅ | — | ✅ | ✅ | done | — | — |
| 15 | Instructor/curator sees submission | `/curator/assignments` | Inline query scoped by curator | ✅ Scoped to curator's students | — | — | — | Partial | done | — | — |
| 16 | Instructor sees analytics | `/instructor/analytics` | `getInstructorAnalytics` | ✅ Scoped to instructor's courses | — | — | — | Partial | done | — | — |
| 17 | Instructor doesn't see other courses' students | `getInstructorAnalytics` | `instructors: { some: { userId } }` | ✅ Course-scoped | — | — | — | ❌ | done | — | — |
| 18 | Instructor receives forwarded question | `/instructor/questions` | `getForwardedQuestions` | ❌ **NO scope check — returns ALL forwarded questions** | — | — | — | ❌ | unsafe | P0 | Add course-scope filter to `getForwardedQuestions` |
| 19 | Instructor answers forwarded question | Inline in questions page | `answerForwardedQuestionAction` | ❌ **NO instructor course ownership check** | ✅ | ✅ (not awaited — fire-and-forget) | ✅ | ❌ | unsafe | P0 | Add course ownership check + await notification |
| 20 | Student sees answer | Lesson question history | `getLessonForStudent` | ✅ Scoped to student | — | ✅ | — | Partial | done | — | — |

### Curator ↔ Student

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Curator sees only assigned students | `/curator/students` | `getCuratorStudents` | ✅ `curatorAssignment WHERE curatorId = user.id` | — | — | — | ❌ | done | — | — |
| 2 | Curator doesn't see other students | Same as #1 | Same | ✅ Same filter | — | — | — | ❌ | done | — | — |
| 3 | Curator opens student card | ❌ **MISSING** (`/curator/students/[id]` does not exist) | ❌ | — | — | — | — | — | missing | P2 | Add student detail page |
| 4 | Curator sees student progress | `/curator/students` table shows progress % per enrollment | Inline query | ✅ Scoped | — | — | — | ❌ | partial | — | — |
| 5 | Curator sees student questions | `/curator/questions` | `getCuratorQuestions` | ✅ `curatorId: user.id` | — | — | — | ❌ | done | — | — |
| 6 | Curator sees student assignments | `/curator/assignments` | Inline query scoped by studentIds | ✅ Scoped by curator's student assignments | — | — | — | ❌ | done | — | — |
| 7 | Curator sees student risks | `/curator/risks` | Inline query scoped by studentIds | ✅ Scoped by curator's student assignments | — | — | — | ❌ | done | — | — |
| 8 | Student asks question from lesson | Lesson support block | `askCuratorQuestion` | ✅ Enrollment + lesson access | ✅ | ✅ (now awaited after fix) | ✅ | ❌ | done | — | — |
| 9 | Question reaches assigned curator | `askCuratorQuestion` sets `curatorId` | Learning service | ✅ Correct curator from assignment | ✅ | ✅ | ✅ | ❌ | done | — | — |
| 10 | Curator answers question | `/curator/questions` (inline) | `answerQuestionAction` | ❌ **NO curator-scope check** — can answer any question by ID | ✅ | ✅ (in_app) | ✅ | ❌ | unsafe | P0 | Add curator-scope check |
| 11 | Student sees answer in lesson | Lesson question history | `getLessonForStudent` | ✅ Scoped to student's own questions | — | ✅ | — | ❌ | done | — | — |
| 12 | Student receives notification | In-app notification | `createNotification` | ✅ | — | ✅ | — | ❌ | done | — | — |
| 13 | Curator forwards question to instructor | `/curator/questions` (inline) | `forwardQuestionAction` | ❌ **NO curator-scope check** | ✅ | ✅ (not awaited — fire-and-forget) | ✅ | ❌ | unsafe | P1 | Add curator-scope check + await notification |
| 14 | Instructor sees forwarded question | `/instructor/questions` | `getForwardedQuestions` | ❌ **NO course-scope check** | — | — | — | ❌ | unsafe | P0 | Same as instructor #18 |
| 15 | Curator reviews assignment | `/curator/assignments` (inline) | `reviewSubmissionAction` | ❌ **NO curator-scope check** — can review any submission by ID | ✅ | ✅ (in_app) | ✅ | ❌ | unsafe | P0 | Add curator-scope check |
| 16 | Curator sets score | Same as #15 | `reviewSubmissionAction` | ❌ Same | ✅ | ✅ | ✅ | ❌ | unsafe | P0 | Same |
| 17 | Curator writes feedback | Same as #15 | `reviewSubmissionAction` | ❌ Same | ✅ | ✅ | ✅ | ❌ | unsafe | P0 | Same |
| 18 | Student sees feedback | `/student/assignments/[id]` | `getAssignmentForStudent` | ✅ Scoped by userId | — | ✅ | — | ❌ | done | — | — |
| 19 | Curator sends for revision | `reviewSubmissionAction({ status: "NEEDS_REVISION" })` | Same | ❌ **NO curator-scope check** | ✅ | ✅ | ✅ | ❌ | unsafe | P0 | Same |
| 20 | Student resubmits | `/student/assignments/[id]` | `submitAssignment` | ✅ Enrollment + attempt check | ✅ | — | ✅ | ❌ | done | — | — |
| 21 | Curator creates risk flag | `createRiskFlagAction` | `analytics.ts` | ❌ **NO curator-student relationship check** — can flag any student | ✅ | — | ✅ | ❌ | unsafe | P1 | Add scope check |
| 22 | Curator resolves risk flag | `resolveRiskFlagAction` | `analytics.ts` | ❌ **NO scope check** — can resolve any flag | ✅ | — | ✅ | ❌ | unsafe | P1 | Add scope check |
| 23 | Risks correctly shown on dashboard | `/curator` dashboard | `getCuratorDashboard` | ✅ Scoped by studentIds | — | — | — | ❌ | done | — | — |
| 24 | Curator notifies student | ❌ **MISSING** — no "notify student" action exists | ❌ | — | — | — | — | — | missing | P2 | Add manual notify action |

### Super Curator ↔ Student

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Super curator sees curator list | `/super-curator/curators` | `getSuperCuratorDashboard` | ✅ Scoped by `superCuratorId` | — | — | — | ❌ | done | — | — |
| 2 | Sees curator load | Dashboard curator cards | Same | ✅ Same scope | — | — | — | ❌ | done | — | — |
| 3 | Sees students via assigned curators | Same (dashboard aggregates) | Same | ✅ Through curator assignments | — | — | — | ❌ | done | — | — |
| 4 | Doesn't see unrelated cohorts | Reports API `getScopedStudentIds` | `reports/route.ts` | ✅ Scoped by `superCuratorId` | — | — | — | ✅ | done | — | — |
| 5 | Distributes student to curator | `/super-curator/distribution` | `assignCuratorFromSupervisorAction` | ✅ `requireRole(["super_curator","admin"])` | ✅ (upsert) | ❌ No notification | ✅ | ❌ | done | — | — |
| 6 | Reassigns student to another curator | Same (redistribution card) | Same (upsert) | ✅ Same | ✅ | ❌ No notification | ✅ | ❌ | done | — | — |
| 7 | After reassignment, new questions go to new curator | `askCuratorQuestion` queries current assignment | Learning service | ✅ Always reads current `curatorId` from active assignment | — | ✅ | — | ❌ | done | — | — |
| 8 | Old curator no longer sees new questions | `getCuratorQuestions` filters by `curatorId` | Dashboard | ✅ Correctly scoped | — | — | — | ❌ | done | — | — |
| 9 | Super curator sees unresolved questions | `/super-curator/questions` | `getSuperCuratorQuestions` | ✅ Scoped by their curators' IDs | — | — | — | ❌ | done | — | — |
| 10 | Super curator reassigns question | ❌ **MISSING** — no question reassignment action | — | — | — | — | — | ❌ | missing | P2 | Add reassign action |
| 11 | Super curator sees risks by cohort | `/super-curator/risks` | Inline query | ❌ **NO scope filter** — queries ALL unresolved risk flags globally | — | — | — | ❌ | unsafe | P1 | Add scope filter by cohort/curator relationship |
| 12 | Super curator escalates risk | ❌ **MISSING** — no escalation action | — | — | — | — | — | ❌ | missing | P2 | Add escalate action |
| 13 | Super curator resolves risk | Uses `resolveRiskFlagAction` | `analytics.ts` | ❌ **NO scope check** | ✅ | — | ✅ | ❌ | unsafe | P1 | Add scope check |
| 14 | SLA/response time calculated | ❌ **MISSING** — no SLA tracking | — | — | — | — | — | ❌ | missing | P3 | Deferred |
| 15 | Super curator reports scoped correctly | `/super-curator/reports` → `/api/v1/reports` | Reports API | ✅ **Correctly scoped** by `superCuratorId` | — | — | — | ✅ | done | — | — |

### Customer Observer ↔ Student

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Observer sees dashboard | `/customer-observer` | `getCustomerObserverDashboard` | ✅ `requireRolePage(["customer_observer"])` | — | — | — | ❌ | done | — | — |
| 2 | Sees aggregated progress | Dashboard shows cohort cards | `getCustomerObserverDashboard` | ❌ **Uses demo/hardcoded data** — `cohortsDemo` with static 42% | ❌ No real data | — | — | ❌ | broken | P1 | Connect real cohort progress query |
| 3 | Sees completion rate | Dashboard metric grid | Same | ❌ Same — likely demo data | — | — | — | ❌ | broken | P1 | Same |
| 4 | Sees certificate count | Dashboard certificates tab | `listCertificates()` called in demo mode | ❌ **NO scope filter** — lists ALL certificates globally | — | — | — | ❌ | unsafe | P1 | Add cohort/course scope filter for observer |
| 5 | Sees risks aggregated/scoped | ❌ No risks view on observer dashboard | — | — | — | — | — | ❌ | missing | P2 | Add scoped risks view |
| 6 | Sees reports by own scope | `/customer-observer/reports` | `/api/v1/reports` | ✅ Reports API scopes observer to empty array (deny all data) | — | — | — | ✅ | done | — | — |
| 7 | Cannot create/modify users | No UI for this | N/A | ✅ No `users:write` permission | — | — | — | ✅ | done | — | — |
| 8 | Cannot enroll students | No UI for this | N/A | ✅ No `enrollments:write` permission | — | — | — | ✅ | done | — | — |
| 9 | Cannot modify progress | No UI for this | N/A | ✅ No `progress:write` permission | — | — | — | ✅ | done | — | — |
| 10 | Cannot answer questions | No UI for this | N/A | ✅ No `notifications:write` permission | — | — | — | ✅ | done | — | — |
| 11 | Cannot review assignments | No UI for this | N/A | ✅ No `assignments:review` permission | — | — | — | ✅ | done | — | — |
| 12 | Cannot see global reports | Reports API scopes to empty array | `getScopedStudentIds` | ✅ Returns `[]` for observer | — | — | — | ✅ | done | — | — |
| 13 | Cannot export other's data | Reports API | Same | ✅ Same | — | — | — | ✅ | done | — | — |
| 14 | Sees certificates in own scope | `/customer-observer/certificates` | `listCertificates()` | ❌ **NO scope filter** — lists ALL certificates | — | — | — | ❌ | unsafe | P1 | Add scope filter |
| 15 | Revoked status visible | `listCertificates` includes `revokedAt` field | Certificates service | ✅ Field exists in DB | — | — | — | ❌ | partial | — | — |

### Student Self-Actions

| # | Function | UI | Backend | Access Control | Data Update | Notification | Audit | Tests | Status | Priority | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Login | `/login` | NextAuth credentials | ✅ Inactive user rejected | — | — | — | ✅ | done | — | — |
| 2 | Redirect to `/student` | Post-login | Role redirect | ✅ Server-side `role-redirect` | — | — | — | ✅ | done | — | — |
| 3 | Dashboard loads | `/student` | `getStudentDashboard` | ✅ `requireRolePage(["student"])` | — | — | — | ❌ | done | — | — |
| 4 | My courses loads | `/student/my-courses` | `getStudentCourseCards` | ✅ `requireRolePage(["student"])` | — | — | — | ❌ | done | — | — |
| 5 | Course page opens | `/student/courses/[id]` | `getCourseForStudent` | ✅ Enrollment check | — | — | — | ❌ | done | — | — |
| 6 | Module timeline visible | In course page | `getCourseForStudent` → modules | ✅ Through enrollment | — | — | — | ❌ | done | — | — |
| 7 | Lesson list visible | In course page | Same | ✅ Same | — | — | — | ❌ | done | — | — |
| 8 | Locked/unlocked states | Course page shows lock icons | `buildLessonAccessMap` | ✅ Sequential lock based on required lessons | — | — | — | ❌ | done | — | — |
| 9 | Required/optional labels | Course page shows badges | Same | ✅ `isRequired` field displayed | — | — | — | ❌ | done | — | — |
| 10 | First lesson opens | `/student/lessons/[id]` | `getLessonForStudent` | ✅ Enrollment + lock check | — | — | — | ❌ | done | — | — |
| 11 | Video/text/media renders | `StudentLessonView` | `getLessonForStudent` | ✅ All through enrollment | — | — | — | ❌ | done | — | — |
| 12 | YouTube URL normalized | `normalizeVideoUrl` | Client-side | ✅ watch?v= → /embed/ | — | — | — | ❌ | done | — | — |
| 13 | Mark lesson completed | Mark button | `POST /api/v1/progress` | ✅ `requireUser("progress:write")` | ✅ | — | — | ❌ | done | — | — |
| 14 | Module progress updates | Auto | `markLessonProgress` transaction | ✅ | ✅ | — | — | ❌ | done | — | — |
| 15 | Course progress updates | Auto | Same transaction | ✅ | ✅ | — | — | ✅ | done | — | — |
| 16 | Next lesson unlocks | Auto after completion | `buildLessonAccessMap` recalculates | ✅ | ✅ | — | — | ❌ | done | — | — |
| 17 | Locked lesson returns 403 | API throws `ApiError("forbidden")` | `assertLessonAccess` | ✅ | — | — | — | ❌ | done | — | — |
| 18 | Quiz opens | `/student/quizzes/[id]` | `getQuizForStudent` | ✅ Lesson access check | — | — | — | ❌ | done | — | — |
| 19 | Quiz submit works | `quiz-view.tsx` POST | `submitQuizAttempt` | ✅ Enrollment + courseId check | ✅ | — | — | ✅ | done | — | — |
| 20 | Max attempts enforced | API | `submitQuizAttempt` | ✅ Attempt count check | — | — | — | ❌ | done | — | — |
| 21 | Passed quiz updates progress | Auto | `submitQuizAttempt` → `markLessonProgress` | ✅ | ✅ | — | — | ✅ | done | — | — |
| 22 | Assignment opens | `/student/assignments/[id]` | `getAssignmentForStudent` | ✅ Lesson access check | — | — | — | ❌ | done | — | — |
| 23 | Assignment submit works | `assignment-view.tsx` POST | `submitAssignment` | ✅ Enrollment + courseId check | ✅ | — | ✅ | ✅ | done | — | — |
| 24 | Max attempts enforced | API | `submitAssignment` | ✅ Attempt count check | — | — | — | ✅ | done | — | — |
| 25 | Revision resubmit works | UI allows resubmit when NEEDS_REVISION | `submitAssignment` creates new submission | ✅ | ✅ | — | ✅ | ❌ | done | — | — |
| 26 | Ask curator question | Lesson support block | `askCuratorQuestion` | ✅ Enrollment + lesson access | ✅ | ✅ (now awaited) | ✅ | ❌ | done | — | — |
| 27 | Question appears in student history | Lesson support block shows history | `getLessonForStudent` includes `myQuestions` | ✅ Scoped to student | — | — | — | ❌ | done | — | — |
| 28 | Question appears for assigned curator | `/curator/questions` | `getCuratorQuestions` | ✅ `curatorId: user.id` | — | ✅ | — | ❌ | done | — | — |
| 29 | Student sees curator answer | Lesson question history | `getLessonForStudent` | ✅ Scoped to student's own questions | — | — | — | ❌ | done | — | — |
| 30 | Student receives notification | `/student/notifications` | `listNotifications(user.id)` | ✅ Scoped by userId | — | ✅ | — | ❌ | done | — | — |
| 31 | Certificate appears when eligible | `/student/certificates` | `listCertificates(user.id)` | ✅ Scoped by userId | — | — | — | ❌ | done | — | — |
| 32 | Student can't see other students' data | All queries scoped by userId | Various | ✅ Scoped | — | — | — | ❌ | done | — | — |

### System Events

| # | Function | Implementation | Status | Priority | Fix |
|---|---|---|---|---|---|
| 1 | Notification created on action | Various `createNotification` calls | Partial — not awaited in `forwardQuestionAction` and `answerForwardedQuestionAction` | P1 | Await notifications |
| 2 | Email sent only per channel | `createNotification` checks `channel === "email"` or `"email_and_in_app"` | ✅ Done (PR-3 fix) | — | — |
| 3 | Default notification is in_app only | `channel ?? "in_app"` | ✅ Done | — | — |
| 4 | AuditLog for admin actions | All admin actions create audit | ✅ Done | — | — |
| 5 | AuditLog for curator actions | All curator actions create audit | ✅ Done | — | — |
| 6 | Error state handled | Various try-catch patterns | Partial — some API routes have bare error handlers | — | — |
| 7 | Empty state handled | Pages show "no data" messages | ✅ Done | — | — |
| 8 | Unauthorized returns 403 | `ApiError("forbidden", ..., 403)` | ✅ Done | — | — |
| 9 | Not found returns 404 | `ApiError("not_found", ..., 404)` | ✅ Done | — | — |
| 10 | Validation errors readable | Zod schemas with Russian messages | ✅ Done | — | — |

## Critical Blockers

### P0 — Fix Immediately

1. **Certificate PDF has NO ownership check** — `GET /api/v1/certificates/[id]/pdf` calls `requireUser()` but never verifies the user owns the certificate or has admin role. Any authenticated user can download any certificate PDF by ID.
   - **File:** `app/api/v1/certificates/[certificateId]/pdf/route.ts`

2. **`getForwardedQuestions()` returns ALL forwarded questions globally** — No filter by instructor's courses. Any instructor sees forwarded questions for ALL courses.
   - **File:** `server/actions/dashboard.ts:418`

3. **`answerForwardedQuestionAction()` does not verify instructor course ownership** — An instructor can answer forwarded questions for courses they don't teach.
   - **File:** `server/actions/curator.ts:156`

4. **Curator mutation actions lack scope checks** — `answerQuestionAction`, `reviewSubmissionAction`, `forwardQuestionAction` have role checks but NO check that the question/submission belongs to the curator's assigned students. Any curator can act on any student's data by ID.
   - **Files:** `server/actions/curator.ts`

5. **Instructor lesson/module CRUD lacks ownership checks** — `updateLesson`, `deleteLesson`, `createModule`, `updateModule`, `deleteModule`, `createLesson` in `server/modules/courses/service.ts` have NO instructor-course ownership verification.

### P1 — Fix This Session

6. **Curator risk actions lack scope checks** — `createRiskFlagAction` and `resolveRiskFlagAction` allow any curator to create/resolve risk flags for any student.
   - **File:** `server/actions/analytics.ts`

7. **Super curator risks page queries ALL unresolved risks globally** — No scope filter by cohort/curator relationship.
   - **File:** `app/super-curator/risks/page.tsx`

8. **Customer observer certificates page lists ALL certificates globally** — No cohort/project scope filter.
   - **File:** `app/customer-observer/certificates/page.tsx`

9. **Customer observer dashboard uses hardcoded/demo data** — Cohort progress shows static 42% and never connects to real data.
   - **File:** `app/customer-observer/page.tsx`

10. **Student quiz/assignment pages missing `forbidden` error handler** — Would return 500 instead of 403 on access denial.
    - **Files:** `app/student/quizzes/[quizId]/page.tsx`, `app/student/assignments/[assignmentId]/page.tsx`

11. **Module breadcrumb uses wrong ID** — `moduleId` instead of `courseId` in breadcrumb link → navigates to wrong page (404).
    - **File:** `app/student/modules/[moduleId]/page.tsx:78`

## Unsafe Access Risks

| Risk | Role | File | Impact |
|------|------|------|--------|
| Certificate PDF accessible by any authenticated user | All | `app/api/v1/certificates/[id]/pdf/route.ts` | Data leakage of student certificates |
| All forwarded questions visible to any instructor | Instructor | `server/actions/dashboard.ts:418` | Cross-course data leakage |
| Instructor can answer any forwarded question | Instructor | `server/actions/curator.ts:156` | Cross-course data modification |
| Curator can answer any question by ID | Curator | `server/actions/curator.ts:12` | Cross-curator data access |
| Curator can review any submission by ID | Curator | `server/actions/curator.ts:55` | Cross-curator data modification |
| Curator can forward any question | Curator | `server/actions/curator.ts:105` | Cross-curator data modification |
| Curator can flag any student with risk | Curator | `server/actions/analytics.ts:23` | Cross-curator harassment potential |
| Instructor can edit any lesson/module by ID | Instructor | `server/modules/courses/service.ts` | Cross-course content manipulation |
| Super curator sees ALL global risks | Super Curator | `app/super-curator/risks/page.tsx` | Global data exposure |
| Observer sees ALL certificates | Customer Observer | `app/customer-observer/certificates/page.tsx` | Global data exposure |

## Missing MVP Functions

| Function | Role | Notes |
|----------|------|-------|
| Pause/resume student enrollment | Admin | No enrollment status toggle UI or action |
| Revoke certificate | Admin | Schema has `revokedAt` but no API/action to set it |
| Student card (detail page) | Curator | `/curator/students/[id]` does not exist |
| Manual progress correction | Admin | No action/service |
| Question reassignment | Super Curator | No action to move question between curators |
| Risk escalation | Super Curator | No escalation action |
| Notify student manually | Curator | No dedicated notify action |
| File upload in assignment UI | Student | Dropzone is mocked, no actual upload |
| Settings page server actions | Student | All buttons do nothing (static demo data) |

## Broken User Flows

| Flow | Problem | File |
|------|---------|------|
| Module breadcrumb link | Uses `moduleId` instead of `courseId` → navigates to 404 | `app/student/modules/[moduleId]/page.tsx:78` |
| Quiz result page bypasses access control | Uses direct `prisma` query instead of service | `app/student/quizzes/[quizId]/result/page.tsx` |
| Observer dashboard shows no real data | `cohortsDemo` hardcoded with 42% progress | `app/customer-observer/page.tsx` |
| Student settings do nothing | All buttons are static with no server actions | `app/student/settings/page.tsx` |

## Recommended PR Sequence

### PR-A: Fix certificate PDF ownership check
- **Scope:** Add ownership verification to certificate PDF download
- **Files:** `app/api/v1/certificates/[certificateId]/pdf/route.ts`
- **Acceptance:** Any authenticated user can only download their own certificate PDF (or admin can download any)

### PR-B: Fix instructor forwarded question scope
- **Scope:** Add course-scope filter to `getForwardedQuestions()` and `answerForwardedQuestionAction()`
- **Files:** `server/actions/dashboard.ts`, `server/actions/curator.ts`
- **Acceptance:** Instructor sees only forwarded questions for courses they teach

### PR-C: Fix curator mutation scope checks
- **Scope:** Add curator-student relationship checks to `answerQuestionAction`, `reviewSubmissionAction`, `forwardQuestionAction`, `createRiskFlagAction`, `resolveRiskFlagAction`
- **Files:** `server/actions/curator.ts`, `server/actions/analytics.ts`
- **Acceptance:** Curator can only act on their own assigned students

### PR-D: Fix instructor lesson/module ownership checks
- **Scope:** Add instructor-course ownership checks to lesson/module CRUD operations
- **Files:** `server/modules/courses/service.ts`
- **Acceptance:** Instructor can only edit lessons/modules in courses they teach

### PR-E: Fix observer scope and data
- **Scope:** Add cohort/project scope filter to observer certificate list; replace hardcoded dashboard data with real queries
- **Files:** `app/customer-observer/page.tsx`, `app/customer-observer/certificates/page.tsx`
- **Acceptance:** Observer sees only scoped data

### PR-F: Fix student UX bugs
- **Scope:** Fix module breadcrumb, add forbidden error handler on quiz/assignment pages
- **Files:** `app/student/modules/[moduleId]/page.tsx`, `app/student/quizzes/[quizId]/page.tsx`, `app/student/assignments/[assignmentId]/page.tsx`
- **Acceptance:** Module breadcrumb navigates correctly; forbidden access returns 403 not 500

### PR-G: Audit follow-up (deferred fixes)
- **Scope:** Student card page, enrollment pause/resume, certificate revoke, question reassignment, notification addition to admin flows
- **Acceptance:** TBD per feature

## Smoke Test Script

### Pre-requisites
- Seeded database with demo users
- Running dev server

### Admin Flow
1. Login as `admin@academy.local` / `Password123!`
2. Open `/admin/users` → verify user list loads
3. Create new user → verify success
4. Open `/admin/enrollments` → verify enrollments list
5. Enroll student in course → verify enrollment appears
6. Open `/admin/cohorts` → verify cohorts list
7. Open cohort detail → verify edit form works
8. Open `/api/v1/certificates/{id}/pdf` for a certificate that is NOT yours → verify 403

### Instructor Flow
9. Login as `instructor@academy.local` / `Password123!`
10. Open `/instructor/courses` → verify own courses only
11. Open course curriculum → add module → verify
12. Open module → add lesson → save → verify
13. Open `/instructor/questions` → verify only this instructor's course questions (not all)
14. Create quiz → add question → verify
15. Create assignment → verify
16. Open `/instructor/analytics` → verify own course analytics

### Curator Flow
17. Login as `curator@academy.local` / `Password123!`
18. Open `/curator/students` → verify assigned students only
19. Open `/curator/questions` → verify assigned questions
20. Try answering question ID from another curator (via URL manipulation) → verify 403
21. Open `/curator/assignments` → verify assigned students' submissions
22. Try reviewing submission from unassigned student → verify 403
23. Open `/curator/risks` → verify assigned students' risks only

### Student Flow
24. Login as `student1@academy.local` / `Password123!`
25. Open `/student` → dashboard loads with metrics
26. Open `/student/my-courses` → enrolled courses visible
27. Open course → modules and lessons visible
28. Open first lesson → content renders
29. Mark lesson completed → progress updates
30. Open next lesson → unlocked (if required previous completed)
31. Open quiz → submit → score shown
32. Open assignment → submit → verify
33. Ask curator question → verify in history
34. Open `/student/certificates` → verify list (if eligible)
35. Try downloading another student's certificate PDF → verify 403

### Super Curator Flow
36. Login as `super_curator@academy.local` / `Password123!`
37. Open `/super-curator/curators` → verify load
38. Open `/super-curator/distribution` → assign student to curator
39. Reassign student to different curator → verify
40. Open `/super-curator/questions` → verify scoped questions
41. Open `/super-curator/risks` → verify scoped risks
42. Open `/super-curator/reports` → export progress report → verify scope

### Customer Observer Flow
43. Login as `observer@academy.local` / `Password123!`
44. Open `/customer-observer` → dashboard loads
45. Verify no create/edit/enroll functionality is visible
46. Open reports → export → verify scoped data
47. Verify cannot access `/admin`, `/instructor`, `/curator`

## Automated Tests Needed

### Security Tests
- [ ] Certificate PDF ownership test: user A cannot download user B's certificate
- [ ] Curator scope test: curator cannot answer question assigned to another curator
- [ ] Curator scope test: curator cannot review submission from unassigned student
- [ ] Instructor scope test: instructor cannot edit another instructor's course content
- [ ] Instructor scope test: instructor sees only own course forwarded questions
- [ ] Observer scope test: observer sees only scoped certificates
- [ ] Super curator scope test: risks page filters by own curators

### Integration Tests
- [ ] Student enrollment → course access → lesson access → progress flow
- [ ] Quiz submission → grading → progress update flow
- [ ] Assignment submission → review → feedback flow
- [ ] Question ask → notification → answer → student sees answer flow
- [ ] Curator distribution → student question routes to new curator
- [ ] Certificate issue → verification page works → revoke invalidates

### Unit Tests
- [ ] `getCompletionBasis` with mixed required/optional lessons
- [ ] `buildLessonAccessMap` sequential vs open mode
- [ ] `submitAssignment` enrollment validation
- [ ] `submitQuizAttempt` max attempts, pass threshold, progress sync
- [ ] `gradeObjectiveQuiz` correct/wrong scoring
