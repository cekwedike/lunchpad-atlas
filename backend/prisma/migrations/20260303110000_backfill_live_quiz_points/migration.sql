-- Backfill pointsLog entries for live quiz participants who completed quizzes
-- before the completeQuiz() fix was deployed (no pointsLog rows existed for them).
-- Safe to re-run: the NOT EXISTS guard prevents duplicate entries.

INSERT INTO "points_log" ("id", "userId", "liveQuizId", "eventType", "points", "description", "createdAt")
SELECT
  gen_random_uuid(),
  p."userId",
  p."liveQuizId",
  'QUIZ_SUBMIT'::"EventType",
  CASE
    WHEN p.rank = 1 THEN 3000
    WHEN p.rank = 2 THEN 2000
    WHEN p.rank = 3 THEN 1000
    WHEN p.rank <= 7 THEN 500
    ELSE 200
  END,
  'Live Quiz: ' || q.title || ' - Rank #' || p.rank || ' (score: ' || p."totalScore" || ' pts)',
  COALESCE(q."completedAt", NOW())
FROM "live_quiz_participants" p
JOIN "live_quizzes" q ON q.id = p."liveQuizId"
WHERE
  q.status = 'COMPLETED'
  AND p.rank IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "points_log" pl
    WHERE pl."liveQuizId" = p."liveQuizId"
      AND pl."userId" = p."userId"
  );
