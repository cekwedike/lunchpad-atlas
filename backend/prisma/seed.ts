import { PrismaClient, UserRole, ResourceType, CohortState, AchievementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@thrivehub.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✓ Created admin user');

  // Create Facilitator
  const facilitatorPassword = await bcrypt.hash('facilitator123', 10);
  const facilitator = await prisma.user.create({
    data: {
      email: 'facilitator@thrivehub.com',
      passwordHash: facilitatorPassword,
      firstName: 'Jane',
      lastName: 'Facilitator',
      role: UserRole.FACILITATOR,
    },
  });
  console.log('✓ Created facilitator user');

  // Create Cohort
  const cohort = await prisma.cohort.create({
    data: {
      name: 'April 2026 Cohort A',
      startDate: new Date('2026-04-04'),
      endDate: new Date('2026-07-25'),
      state: CohortState.PENDING,
      facilitatorId: facilitator.id,
    },
  });
  console.log('✓ Created cohort');

  // Create Test Fellows
  for (let i = 1; i <= 3; i++) {
    const password = await bcrypt.hash('fellow123', 10);
    await prisma.user.create({
      data: {
        email: `fellow${i}@example.com`,
        passwordHash: password,
        firstName: `Fellow`,
        lastName: `${i}`,
        role: UserRole.FELLOW,
        cohortId: cohort.id,
      },
    });
  }
  console.log('✓ Created 3 test fellows');

  // Create 16 Sessions (4 months, 4 sessions each)
  const sessions = [
    { num: 1, title: 'Ownership Mindset & Leadership at Work', date: '2026-04-04' },
    { num: 2, title: 'Goal Setting & Time Management', date: '2026-04-11' },
    { num: 3, title: 'Effective Communication Skills', date: '2026-04-18' },
    { num: 4, title: 'Storytelling - Leading Early: Growth Without a Title', date: '2026-04-25' },
    { num: 5, title: 'Building Professional Networks', date: '2026-05-02' },
    { num: 6, title: 'Personal Branding Basics', date: '2026-05-09' },
    { num: 7, title: 'LinkedIn & Online Presence', date: '2026-05-16' },
    { num: 8, title: 'Career Development Planning', date: '2026-05-23' },
    { num: 9, title: 'Technical Skills Assessment', date: '2026-06-06' },
    { num: 10, title: 'Project Management Fundamentals', date: '2026-06-13' },
    { num: 11, title: 'Problem Solving & Critical Thinking', date: '2026-06-20' },
    { num: 12, title: 'Financial Literacy for Professionals', date: '2026-06-27' },
    { num: 13, title: 'Interview Preparation', date: '2026-07-04' },
    { num: 14, title: 'Negotiation Skills', date: '2026-07-11' },
    { num: 15, title: 'Workplace Ethics & Professionalism', date: '2026-07-18' },
    { num: 16, title: 'Next Steps: Career Transition', date: '2026-07-25' },
  ];

  for (const sess of sessions) {
    const scheduledDate = new Date(sess.date);
    const unlockDate = new Date(scheduledDate);
    unlockDate.setDate(unlockDate.getDate() - 8); // 8 days before

    await prisma.session.create({
      data: {
        cohortId: cohort.id,
        sessionNumber: sess.num,
        title: sess.title,
        description: `Session ${sess.num} of the LaunchPad Fellowship`,
        scheduledDate,
        unlockDate,
      },
    });
  }
  console.log('✓ Created 16 sessions');

  // Create Sample Resources for Session 1
  const session1 = await prisma.session.findFirst({
    where: { cohortId: cohort.id, sessionNumber: 1 },
  });

  if (session1) {
    const session1Resources = [
      {
        type: ResourceType.ARTICLE,
        title: '360° Leadership: The Art of Influence Without Authority',
        description: 'Learn how to lead effectively without formal authority',
        url: 'https://medium.com/@contact.jitendra07/360-leadership-the-art-of-influence-without-authority-3ace7b3e1a9b',
        duration: 10,
        pointValue: 100,
        order: 1,
      },
      {
        type: ResourceType.ARTICLE,
        title: 'Developing an ownership mindset early in your career',
        description: 'Build an ownership mindset from the start of your career',
        url: 'https://www.indeed.com/career-advice/career-development/ownership-mindset',
        duration: 8,
        pointValue: 100,
        order: 2,
      },
      {
        type: ResourceType.ARTICLE,
        title: 'Ownership Mindset',
        description: 'How leaders build an ownership mindset in their teams',
        url: 'https://www.atlassian.com/blog/leadership/how-leaders-build-ownership-mindset',
        duration: 12,
        pointValue: 100,
        order: 3,
      },
      {
        type: ResourceType.VIDEO,
        title: 'Leadership Vs. Authority',
        description: 'Simon Sinek explains the difference between leadership and authority',
        url: 'https://www.youtube.com/watch?v=pkclW79ZoZU',
        duration: 15,
        pointValue: 150,
        order: 4,
      },
      {
        type: ResourceType.VIDEO,
        title: 'What ownership mindset looks like in real workplaces',
        description: 'Develop an ownership mindset at work',
        url: 'https://youtu.be/ORlTz8lJL7k?si=ugc7Vd76qeRjWMp7',
        duration: 20,
        pointValue: 150,
        order: 5,
      },
      {
        type: ResourceType.ARTICLE,
        title: 'Building influence without formal power',
        description: 'Learn to influence others without formal authority',
        url: 'https://online.hbs.edu/blog/post/influence-without-authority',
        duration: 15,
        pointValue: 50,
        order: 6,
      },
      {
        type: ResourceType.VIDEO,
        title: 'Leadership Without Authority TEDx',
        description: 'TEDx talk on leading without authority',
        url: 'https://www.youtube.com/watch?v=LZ6EXX3hLLg',
        duration: 18,
        pointValue: 50,
        order: 7,
      },
    ];

    for (const resource of session1Resources) {
      await prisma.resource.create({
        data: {
          ...resource,
          sessionId: session1.id,
        },
      });
    }
    console.log('✓ Created 7 resources for Session 1');
  }

  // Create Achievements
  const achievements = [
    {
      name: 'First Steps',
      description: 'Complete your first resource',
      type: AchievementType.MILESTONE,
      pointValue: 50,
      criteria: { resourceCount: 1 },
    },
    {
      name: 'Getting Started',
      description: 'Complete 5 resources',
      type: AchievementType.MILESTONE,
      pointValue: 100,
      criteria: { resourceCount: 5 },
    },
    {
      name: 'On a Roll',
      description: 'Complete 10 resources',
      type: AchievementType.MILESTONE,
      pointValue: 200,
      criteria: { resourceCount: 10 },
    },
    {
      name: 'Halfway Hero',
      description: 'Complete 50% of all resources',
      type: AchievementType.MILESTONE,
      pointValue: 500,
      criteria: { resourceCount: 45 },
    },
    {
      name: 'Marathon Runner',
      description: 'Complete all 91 resources',
      type: AchievementType.MILESTONE,
      pointValue: 1000,
      criteria: { resourceCount: 91 },
    },
    {
      name: 'Consistent Learner',
      description: 'Complete resources for 7 days in a row',
      type: AchievementType.STREAK,
      pointValue: 300,
      criteria: { streakDays: 7 },
    },
    {
      name: 'Discussion Starter',
      description: 'Start 5 discussions',
      type: AchievementType.SOCIAL,
      pointValue: 150,
      criteria: { discussionCount: 5 },
    },
    {
      name: 'Helpful Helper',
      description: 'Post 20 comments helping others',
      type: AchievementType.SOCIAL,
      pointValue: 200,
      criteria: { commentCount: 20 },
    },
    {
      name: 'Top Performer',
      description: 'Finish in top 3 of monthly leaderboard',
      type: AchievementType.LEADERBOARD,
      pointValue: 500,
      criteria: { leaderboardRank: 3 },
    },
    {
      name: 'Champion',
      description: 'Finish #1 on monthly leaderboard',
      type: AchievementType.LEADERBOARD,
      pointValue: 1000,
      criteria: { leaderboardRank: 1 },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.create({ data: achievement });
  }
  console.log('✓ Created 10 achievements');

  // Create Sample Quiz for Session 1
  if (session1) {
    const quiz = await prisma.quiz.create({
      data: {
        sessionId: session1.id,
        title: 'Ownership Mindset Assessment',
        description: 'Test your understanding of ownership mindset and leadership',
        timeLimit: 15,
        passingScore: 70,
        pointValue: 200,
      },
    });

    const quizQuestions = [
      {
        question: 'What is the key difference between leadership and authority?',
        options: JSON.stringify([
          'Leadership requires a formal title',
          'Leadership is about influence, authority is about position',
          'Authority is more important than leadership',
          'There is no difference',
        ]),
        correctAnswer: 'Leadership is about influence, authority is about position',
        order: 1,
      },
      {
        question: 'Which characteristic best describes an ownership mindset?',
        options: JSON.stringify([
          'Waiting for instructions before acting',
          'Taking responsibility for outcomes',
          'Blaming others when things go wrong',
          'Only caring about your own tasks',
        ]),
        correctAnswer: 'Taking responsibility for outcomes',
        order: 2,
      },
      {
        question: 'How can you demonstrate leadership without formal authority?',
        options: JSON.stringify([
          'By demanding others follow you',
          'By taking initiative and influencing through example',
          'By avoiding responsibility',
          'By waiting for a promotion',
        ]),
        correctAnswer: 'By taking initiative and influencing through example',
        order: 3,
      },
    ];

    for (const question of quizQuestions) {
      await prisma.quizQuestion.create({
        data: {
          ...question,
          quizId: quiz.id,
        },
      });
    }
    console.log('✓ Created quiz with 3 questions for Session 1');
  }

  console.log('\n✨ Database seeding completed successfully!');
  console.log('\nTest Credentials:');
  console.log('Admin: admin@thrivehub.com / admin123');
  console.log('Facilitator: facilitator@thrivehub.com / facilitator123');
  console.log('Fellow: fellow1@example.com / fellow123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
