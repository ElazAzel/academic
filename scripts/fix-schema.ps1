# Fix duplicated content in prisma/schema.prisma
# Replaces lines 114-291 with correct content

$schemaPath = Join-Path $PSScriptRoot ".." "prisma" "schema.prisma"
$lines = Get-Content $schemaPath

# Lines 1-113 are correct (0-indexed: 0-112)
$head = $lines[0..112]

# Lines 293+ are correct (0-indexed: 292+)
$tail = $lines[292..($lines.Length - 1)]

# The correct replacement block
$middle = @'
  CLOSED
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  image           String?
  passwordHash    String?   @map("password_hash")
  emailVerified   DateTime? @map("email_verified")
  locale          String    @default("ru")
  phone           String?
  organization    String?
  company         String?
  position        String?
  status          UserAccountStatus @default(ACTIVE)
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  accounts              Account[]
  sessions              Session[]
  roles                 UserRole[]
  courseInstructors     CourseInstructor[]
  enrollments           Enrollment[]
  lessonProgress        LessonProgress[]
  blockProgress         BlockProgress[]
  moduleProgress        ModuleProgress[]
  courseProgress        CourseProgress[]
  quizAttempts          QuizAttempt[]
  assignmentSubmissions AssignmentSubmission[]
  reviewedSubmissions   AssignmentSubmission[] @relation("SubmissionReviewer")
  certificates          Certificate[]
  notifications              Notification[]
  auditLogs                  AuditLog[] @relation("AuditActor")
  consentLogs                ConsentLog[]
  sentMessages               Message[] @relation("SentMessages")
  receivedMessages           Message[] @relation("ReceivedMessages")
  studentQuestions           LessonQuestion[] @relation("StudentQuestions")
  curatorQuestions           LessonQuestion[] @relation("CuratorQuestions")
  curatorAssignments         CuratorAssignment[] @relation("StudentCuratorAssignments")
  curatorAssignmentsAsCurator CuratorAssignment[] @relation("CuratorAssignments")
  superCuratorAssignments    CuratorAssignment[] @relation("SuperCuratorAssignments")
  riskFlags                  RiskFlag[]
  importJobsCreated          ImportJob[] @relation("ImportCreator")
  observerProjects           ObserverProject[]
  observerCohorts            ObserverCohort[]
  notificationPreferences    NotificationPreference[]
  lessonRatings              LessonRating[]
  activityLogs               ActivityLog[]
  createdPopups              AdminPopup[]
  popupViews                 PopupView[]
  pushSubscriptions          PushSubscription[]
  learningPathEnrollments    LearningPathEnrollment[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("oauth_accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model Role {
  id          String   @id @default(cuid())
  key         RoleKey  @unique
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  users       UserRole[]
  permissions RolePermission[]

  @@map("roles")
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  roles RolePermission[]

  @@map("permissions")
}

model UserRole {
  userId    String   @map("user_id")
  roleId    String   @map("role_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

model RolePermission {
  roleId       String   @map("role_id")
  permissionId String   @map("permission_id")
  createdAt    DateTime @default(now()) @map("created_at")

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
'@ -split "`n"

$result = $head + $middle + $tail
$result | Set-Content $schemaPath -Encoding UTF8

Write-Host "Schema fixed! Lines: $($head.Length) head + $($middle.Length) middle + $($tail.Length) tail = $($result.Length) total"
