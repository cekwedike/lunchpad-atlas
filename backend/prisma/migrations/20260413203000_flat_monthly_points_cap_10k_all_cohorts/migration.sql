-- Flat 10k/month for all fellows; lower any cohort-scaled caps (11k–26k) from prior logic
UPDATE "users"
SET "monthlyPointsCap" = 10000
WHERE "monthlyPointsCap" > 10000;
