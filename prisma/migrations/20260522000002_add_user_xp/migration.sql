-- Add XP (experience points) for gamification (Phase 4.6)
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
