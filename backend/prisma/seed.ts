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
      name: 'Atlas Fellows 2024',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-06-15'),
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

  // Create sessions
  const session1 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 1,
      title: 'Introduction to Career Planning',
      description: 'Learn the basics of career planning and goal setting',
      scheduledDate: new Date('2024-02-01'),
      unlockDate: new Date('2024-01-24'),
    },
  });

  const session2 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 2,
      title: 'Resume Building Workshop',
      description: 'Master the art of crafting effective resumes',
      scheduledDate: new Date('2024-02-08'),
      unlockDate: new Date('2024-01-31'),
    },
  });

  console.log('✅ Created sessions');

  // Create resources
  const resource1 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.VIDEO,
      title: 'Career Planning 101 Video',
      description: 'Comprehensive video guide on career planning fundamentals',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration: 20,
      pointValue: 100,
      order: 1,
    },
  });

  const resource2 = await prisma.resource.create({
    data: {
      sessionId: session1.id,
      type: ResourceType.ARTICLE,
      title: 'Goal Setting Framework',
      description: 'Article on SMART goals and career objectives',
      url: 'https://example.com/goal-setting',
      duration: 10,
      pointValue: 50,
      order: 2,
    },
  });

  const resource3 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.VIDEO,
      title: 'Resume Writing Workshop Recording',
      description: 'Full workshop on crafting compelling resumes',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration: 30,
      pointValue: 150,
      order: 1,
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
        timeSpent: 1200,
        completedAt: new Date('2024-01-20'),
        pointsAwarded: 100,
      },
      {
        userId: fellow1.id,
        resourceId: resource2.id,
        state: 'COMPLETED',
        timeSpent: 600,
        completedAt: new Date('2024-01-21'),
        pointsAwarded: 50,
      },
      {
        userId: fellow2.id,
        resourceId: resource1.id,
        state: 'COMPLETED',
        timeSpent: 1150,
        completedAt: new Date('2024-01-20'),
        pointsAwarded: 100,
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
      resourceId: resource1.id,
      cohortId: cohort.id,
      userId: fellow1.id,
      title: 'How do you stay motivated during job search?',
      content: 'Job searching can be really tough. What are your strategies for staying positive and motivated throughout the process?',
      isPinned: true,
    },
  });

  const discussion2 = await prisma.discussion.create({
    data: {
      resourceId: resource1.id,
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
        points: 100,
        description: 'Completed: Career Planning 101 Video',
        createdAt: new Date('2024-01-20'),
      },
      {
        userId: fellow1.id,
        eventType: EventType.RESOURCE_COMPLETE,
        points: 50,
        description: 'Completed: Goal Setting Framework',
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
        points: 100,
        description: 'Completed: Career Planning 101 Video',
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
  console.log(`   - Sessions: 2`);
  console.log(`   - Resources: 3`);
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

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
