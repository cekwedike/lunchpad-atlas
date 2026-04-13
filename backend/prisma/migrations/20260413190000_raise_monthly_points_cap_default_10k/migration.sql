-- Default monthly points cap: 10,000 per fellow (aligns with getMonthlyCapForDuration floor)
ALTER TABLE "users" ALTER COLUMN "monthlyPointsCap" SET DEFAULT 10000;

-- Backfill legacy rows still on old defaults (1000, 2500, etc.); preserves 0 (unlimited) and caps >= 10,000
UPDATE "users"
SET "monthlyPointsCap" = 10000
WHERE "monthlyPointsCap" > 0
  AND "monthlyPointsCap" < 10000;
