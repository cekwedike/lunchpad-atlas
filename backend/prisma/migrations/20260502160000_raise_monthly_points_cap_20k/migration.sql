-- Raise monthly earning cap to 20,000/fellow/month (mega quizzes + engagement).
ALTER TABLE "users" ALTER COLUMN "monthlyPointsCap" SET DEFAULT 20000;

UPDATE "users"
SET "monthlyPointsCap" = 20000
WHERE "monthlyPointsCap" > 0
  AND "monthlyPointsCap" < 20000;
