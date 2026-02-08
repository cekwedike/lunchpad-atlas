DELETE FROM discussion_comment_reactions
WHERE "commentId" IN (
  SELECT id FROM discussion_comments
  WHERE "discussionId" IN (
    SELECT id FROM discussions
    WHERE title IN (
      'How do you stay motivated during job search?',
      'Best resources for learning technical skills?'
    )
  )
);

DELETE FROM discussion_comments
WHERE "discussionId" IN (
  SELECT id FROM discussions
  WHERE title IN (
    'How do you stay motivated during job search?',
    'Best resources for learning technical skills?'
  )
);

DELETE FROM discussions
WHERE title IN (
  'How do you stay motivated during job search?',
  'Best resources for learning technical skills?'
);
