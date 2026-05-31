-- CreateTable: achievements
CREATE TABLE IF NOT EXISTS "achievements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "achievements_slug_key" ON "achievements"("slug");

-- CreateTable: user_achievements
CREATE TABLE IF NOT EXISTS "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements"("user_id");

ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: daily_activities
CREATE TABLE IF NOT EXISTS "daily_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_activities_user_id_date_key" ON "daily_activities"("user_id", "date");
CREATE INDEX IF NOT EXISTS "daily_activities_user_id_idx" ON "daily_activities"("user_id");

ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
