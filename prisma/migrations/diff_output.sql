node.exe : Loaded Prisma config from prisma.config.ts.
строка:1 знак:1
+ & "C:\Program Files\nodejs/node.exe" "C:\Program Files\nodejs/node_mo ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Loaded Prisma c...isma.config.ts.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_cohort_id_fkey";

-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_course_id_fkey";

-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_project_id_fkey";

-- DropIndex
DROP INDEX "users_created_at_idx";

-- DropIndex
DROP INDEX "users_status_idx";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "glossary_entries" ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "ref_id" TEXT,
ADD COLUMN     "ref_type" TEXT;

-- DropTable
DROP TABLE "invite_links";

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_popups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "image_url" TEXT,
    "link_url" TEXT,
    "link_text" TEXT,
    "targetRoles" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popup_views" (
    "id" TEXT NOT NULL,
    "popup_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popup_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "admin_popups_is_active_created_at_idx" ON "admin_popups"("is_active", "created_at");

-- CreateIndex
CREATE INDEX "popup_views_user_id_idx" ON "popup_views"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "popup_views_popup_id_user_id_key" ON "popup_views"("popup_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_action_created_at_idx" ON "audit_logs"("entity", "action", "created_at");

-- CreateIndex
CREATE INDEX "curator_assignments_curator_id_active_idx" ON "curator_assignments"("curator_id", "active");

-- CreateIndex
CREATE INDEX "curator_assignments_student_id_active_idx" ON "curator_assignments"("student_id", "active");

-- CreateIndex
CREATE INDEX "enrollments_user_id_status_idx" ON "enrollments"("user_id", "status");

-- CreateIndex
CREATE INDEX "glossary_entries_direction_idx" ON "glossary_entries"("direction");

-- CreateIndex
CREATE INDEX "messages_sender_id_receiver_id_idx" ON "messages"("sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_ref_type_ref_id_idx" ON "notifications"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_user_id_idx" ON "quiz_attempts"("quiz_id", "user_id");

-- AddForeignKey
ALTER TABLE "admin_popups" ADD CONSTRAINT "admin_popups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popup_views" ADD CONSTRAINT "popup_views_popup_id_fkey" FOREIGN KEY ("popup_id") REFERENCES "admin_popups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popup_views" ADD CONSTRAINT "popup_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

