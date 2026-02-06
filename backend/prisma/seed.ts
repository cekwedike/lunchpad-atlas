import { PrismaClient, UserRole, ResourceType, CohortState, EventType, AchievementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data in correct order
  await prisma.adminAuditLog.deleteMany();
  await prisma.sessionAnalytics.deleteMany();
  await prisma.engagementEvent.deleteMany();
  await prisma.quizResponse.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.monthlyLeaderboard.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.pointsLog.deleteMany();
  await prisma.discussionComment.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.resourceProgress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cohort.deleteMany();

  console.log('✅ Cleared existing data');

  // Hashed password for all test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create cohort
  const cohort = await prisma.cohort.create({
    data: {
      name: 'LaunchPad Fellowship April 2026',
      startDate: new Date('2026-04-11'), // Saturday, April 11, 2026
      endDate: new Date('2026-08-11'), // 4 months later
      state: CohortState.ACTIVE,
    },
  });

  console.log('✅ Created cohort');

  // Create users
  const fellow1 = await prisma.user.create({
    data: {
      email: 'fellow@atlas.com',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Fellow',
      role: UserRole.FELLOW,
      cohortId: cohort.id,
    },
  });

  const fellow2 = await prisma.user.create({
    data: {
      email: 'jane@atlas.com',
      passwordHash: hashedPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: UserRole.FELLOW,
      cohortId: cohort.id,
    },
  });

  const facilitator = await prisma.user.create({
    data: {
      email: 'facilitator@atlas.com',
      passwordHash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Smith',
      role: UserRole.FACILITATOR,
      cohortId: cohort.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@atlas.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Created 4 users');

  // Create sessions (Saturdays starting April 11, 2026)
  const session1 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 1,
      title: 'Ownership Mindset & Leadership at Work',
      description: 'Taking responsibility regardless of role or seniority. Initiative, accountability, and influence at work.',
      scheduledDate: new Date('2026-04-11'), // Saturday, April 11, 2026
      unlockDate: new Date('2026-04-06'), // 5 days before session
    },
  });

  const session2 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 2,
      title: 'Goal Setting & Time Management',
      description: 'Priority management over busyness. Balancing work, learning, and personal commitments.',
      scheduledDate: new Date('2026-04-18'), // Saturday, April 18, 2026
      unlockDate: new Date('2026-04-13'), // 5 days before session
    },
  });

  const session3 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 3,
      title: 'Effective Communication Skills',
      description: 'Professional emails, meetings, and presentations. Communicating clearly and confidently.',
      scheduledDate: new Date('2026-04-25'), // Saturday, April 25, 2026
      unlockDate: new Date('2026-04-20'), // 5 days before session
    },
  });

  const session4 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 4,
      title: 'Storytelling: Leading Early - Growth Without a Title',
      description: 'How professionals grow and stand out early in their careers. Building trust and credibility without seniority.',
      scheduledDate: new Date('2026-05-02'), // Saturday, May 2, 2026
      unlockDate: new Date('2026-04-27'), // 5 days before session
    },
  });

  console.log('✅ Created sessions');

  // Create resources for Session 1: Ownership Mindset & Leadership at Work
  const resource1 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.ARTICLE,
      title: '360° Leadership: The Art of Influence Without Authority',
      description: 'Learn how to lead and influence others without formal authority',
      url: 'https://medium.com/@contact.jitendra07/360-leadership-the-art-of-influence-without-authority-3ace7b3e1a9b',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource2 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.ARTICLE,
      title: 'Developing an ownership mindset early in your career',
      description: 'Practical guide to building an ownership mentality at work',
      url: 'https://www.indeed.com/career-advice/career-development/ownership-mindset',
      duration: 8,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource3 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.ARTICLE,
      title: 'How Leaders Build Ownership Mindset',
      description: 'Insights from Atlassian on cultivating ownership culture',
      url: 'https://www.atlassian.com/blog/leadership/how-leaders-build-ownership-mindset',
      duration: 12,
      pointValue: 50,
      order: 3,
      isCore: true,
    },
  });

  const resource4 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.VIDEO,
      title: 'Leadership vs. Authority | Simon Sinek',
      description: 'Simon Sinek explains the difference between leadership and authority',
      url: 'https://www.youtube.com/watch?v=pkclW79ZoZU',
      duration: 15,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource5 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.VIDEO,
      title: 'DEVELOP AN OWNERSHIP MINDSET AT WORK',
      description: 'Why you need to take full ownership of your tasks at work',
      url: 'https://youtu.be/ORlTz8lJL7k',
      duration: 20,
      pointValue: 100,
      order: 5,
      isCore: true,
    },
  });

  const resource6 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.ARTICLE,
      title: 'Building influence without formal power',
      description: 'Harvard Business School guide on influencing without authority',
      url: 'https://online.hbs.edu/blog/post/influence-without-authority',
      duration: 10,
      pointValue: 30,
      order: 6,
      isCore: false,
    },
  });

  const resource7 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.VIDEO,
      title: 'Leading without authority | TEDx',
      description: 'Mary Meaney Haynes shares insights on leadership without formal authority',
      url: 'https://www.youtube.com/watch?v=LZ6EXX3hLLg',
      duration: 18,
      pointValue: 50,
      order: 7,
      isCore: false,
    },
  });

  // Create resources for Session 2: Goal Setting & Time Management
  const resource8 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.ARTICLE,
      title: 'SMART goal setting for professionals',
      description: 'Learn how to write SMART goals that drive results',
      url: 'https://www.indeed.com/career-advice/career-development/how-to-write-smart-goals',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource9 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.ARTICLE,
      title: 'Time management strategies for high-performing employees',
      description: 'Proven strategies to manage your time effectively',
      url: 'https://www.proofhub.com/articles/time-management-strategies',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource10 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.VIDEO,
      title: 'SMART Goals Explained',
      description: 'Specific, Measurable, Attainable, Realistic, Time-Bound goals explained',
      url: 'https://youtu.be/hj7Kw3fDNaw',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource11 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.VIDEO,
      title: 'Brian Tracy on Time Management',
      description: 'Time management strategies from productivity expert Brian Tracy',
      url: 'https://youtu.be/sJb2qmd5wsk',
      duration: 25,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  console.log('✅ Created resources');

  // Create resource progress
  await prisma.resourceProgress.createMany({
    data: [
      {
        userId: fellow1.id,
        resourceId: resource1.id,
        state: 'COMPLETED',
        timeSpent: 600,
        completedAt: new Date('2024-01-20'),
        pointsAwarded: 50,
      },
      {
        userId: fellow1.id,
        resourceId: resource4.id,
        state: 'COMPLETED',
        timeSpent: 900,
        completedAt: new Date('2024-01-21'),
        pointsAwarded: 100,
      },
      {
        userId: fellow2.id,
        resourceId: resource1.id,
        state: 'COMPLETED',
        timeSpent: 550,
        completedAt: new Date('2024-01-20'),
        pointsAwarded: 50,
      },
    ],
  });

  console.log('✅ Created resource progress');

  // Create quiz
  const quiz1 = await prisma.quiz.create({
    data: {
      sessionId: session1.id,
      title: 'Career Planning Fundamentals Quiz',
      description: 'Test your knowledge of career planning basics',
      timeLimit: 15,
      passingScore: 70,
      pointValue: 200,
    },
  });

  await prisma.quizQuestion.createMany({
    data: [
      {
        quizId: quiz1.id,
        question: 'What does SMART stand for in goal setting?',
        options: JSON.stringify([
          'Simple, Measurable, Achievable, Relevant, Timely',
          'Specific, Measurable, Achievable, Relevant, Time-bound',
          'Strategic, Meaningful, Actionable, Realistic, Trackable',
        ]),
        correctAnswer: 'Specific, Measurable, Achievable, Relevant, Time-bound',
        order: 1,
      },
      {
        quizId: quiz1.id,
        question: 'How often should you review your career goals?',
        options: JSON.stringify([
          'Once a year',
          'Every 5 years',
          'Quarterly or bi-annually',
          'Never',
        ]),
        correctAnswer: 'Quarterly or bi-annually',
        order: 2,
      },
    ],
  });

  console.log('✅ Created quiz with questions');

  // Create quiz responses
  await prisma.quizResponse.createMany({
    data: [
      {
        quizId: quiz1.id,
        userId: fellow1.id,
        answers: JSON.stringify({ '1': 'Specific, Measurable, Achievable, Relevant, Time-bound', '2': 'Quarterly or bi-annually' }),
        score: 100,
        passed: true,
        pointsAwarded: 200,
        completedAt: new Date('2024-01-20'),
      },
    ],
  });

  console.log('✅ Created quiz responses');

  // Create discussions
  const discussion1 = await prisma.discussion.create({
    data: {
      resourceId: resource4.id,
      cohortId: cohort.id,
      userId: fellow1.id,
      title: 'How do you stay motivated during job search?',
      content: 'Job searching can be really tough. What are your strategies for staying positive and motivated throughout the process?',
      isPinned: true,
    },
  });

  const discussion2 = await prisma.discussion.create({
    data: {
      resourceId: resource4.id,
      cohortId: cohort.id,
      userId: fellow2.id,
      title: 'Best resources for learning technical skills?',
      content: 'I want to improve my technical skills, especially in data analysis. What online courses do you recommend?',
      isPinned: false,
    },
  });

  console.log('✅ Created discussions');

  // Create discussion comments
  await prisma.discussionComment.createMany({
    data: [
      {
        discussionId: discussion1.id,
        userId: fellow2.id,
        content: 'Great question! I set small daily goals and celebrate tiny wins.',
      },
      {
        discussionId: discussion1.id,
        userId: facilitator.id,
        content: 'Remember that job searching is a marathon, not a sprint. Take breaks and practice self-care.',
      },
      {
        discussionId: discussion2.id,
        userId: fellow1.id,
        content: "I've been using Coursera and DataCamp. Both have great courses!",
      },
    ],
  });

  console.log('✅ Created discussion comments');

  // Create points logs
  await prisma.pointsLog.createMany({
    data: [
      {
        userId: fellow1.id,
        eventType: EventType.RESOURCE_COMPLETE,
        points: 50,
        description: 'Completed: 360° Leadership: The Art of Influence Without Authority',
        createdAt: new Date('2024-01-20'),
      },
      {
        userId: fellow1.id,
        eventType: EventType.RESOURCE_COMPLETE,
        points: 100,
        description: 'Completed: Leadership vs. Authority | Simon Sinek',
        createdAt: new Date('2024-01-21'),
      },
      {
        userId: fellow1.id,
        eventType: EventType.QUIZ_SUBMIT,
        points: 200,
        description: 'Passed: Career Planning Fundamentals Quiz (100%)',
        createdAt: new Date('2024-01-20'),
      },
      {
        userId: fellow2.id,
        eventType: EventType.RESOURCE_COMPLETE,
        points: 50,
        description: 'Completed: 360° Leadership: The Art of Influence Without Authority',
        createdAt: new Date('2024-01-20'),
      },
    ],
  });

  console.log('✅ Created points logs');

  // Create achievements
  const achievement1 = await prisma.achievement.create({
    data: {
      name: 'First Steps',
      description: 'Completed your first resource',
      type: AchievementType.MILESTONE,
      iconUrl: '🎯',
      pointValue: 50,
      criteria: JSON.stringify({ resourceCount: 1 }),
    },
  });

  const achievement2 = await prisma.achievement.create({
    data: {
      name: 'Quiz Master',
      description: 'Scored 100% on a quiz',
      type: AchievementType.MILESTONE,
      iconUrl: '🏆',
      pointValue: 100,
      criteria: JSON.stringify({ quizPerfectScore: true }),
    },
  });

  console.log('✅ Created achievements');

  // Unlock achievements for users
  await prisma.userAchievement.createMany({
    data: [
      {
        userId: fellow1.id,
        achievementId: achievement1.id,
        unlockedAt: new Date('2024-01-20'),
      },
      {
        userId: fellow1.id,
        achievementId: achievement2.id,
        unlockedAt: new Date('2024-01-20'),
      },
      {
        userId: fellow2.id,
        achievementId: achievement1.id,
        unlockedAt: new Date('2024-01-20'),
      },
    ],
  });

  console.log('✅ Unlocked achievements for users');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Cohorts: 1`);
  console.log(`   - Users: 4 (2 fellows, 1 facilitator, 1 admin)`);
  console.log(`   - Sessions: 4`);
  console.log(`   - Resources: 11`);
  console.log(`   - Quizzes: 1 (with 2 questions)`);
  console.log(`   - Discussions: 2`);
  console.log(`   - Comments: 3`);
  console.log(`   - Points Logs: 4`);
  console.log(`   - Achievements: 2`);
  console.log('\n🔑 Test Credentials:');
  console.log(`   Fellow 1: fellow@atlas.com / password123`);
  console.log(`   Fellow 2: jane@atlas.com / password123`);
  console.log(`   Facilitator: facilitator@atlas.com / password123`);
  console.log(`   Admin: admin@atlas.com / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
