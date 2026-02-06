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

  const session5 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 5,
      title: 'Career Exploration & Career Planning',
      description: 'Exploring career paths and creating a career road map.',
      scheduledDate: new Date('2026-05-09'), // Saturday, May 9, 2026
      unlockDate: new Date('2026-05-04'), // 5 days before session
    },
  });

  const session6 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 6,
      title: 'Remote & Cross-Cultural Collaboration',
      description: 'Working effectively across cultures and time zones.',
      scheduledDate: new Date('2026-05-16'), // Saturday, May 16, 2026
      unlockDate: new Date('2026-05-11'), // 5 days before session
    },
  });

  const session7 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 7,
      title: 'Execution at Work',
      description: 'Delivering results, managing up, giving/receiving feedback.',
      scheduledDate: new Date('2026-05-23'), // Saturday, May 23, 2026
      unlockDate: new Date('2026-05-18'), // 5 days before session
    },
  });

  const session8 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 8,
      title: 'Storytelling: Career Pivots & Transitions',
      description: 'Real stories of career changes, non-linear paths, and reinvention.',
      scheduledDate: new Date('2026-05-30'), // Saturday, May 30, 2026
      unlockDate: new Date('2026-05-25'), // 5 days before session
    },
  });

  const session9 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 9,
      title: 'Personal Branding & Networking',
      description: 'Building your online presence, LinkedIn optimization, and professional networks.',
      scheduledDate: new Date('2026-06-06'), // Saturday, June 6, 2026
      unlockDate: new Date('2026-06-01'), // 5 days before session
    },
  });

  const session10 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 10,
      title: 'Resume, Cover Letters & Interviews',
      description: 'Practical advice on resumes, cover letters, and interview preparation.',
      scheduledDate: new Date('2026-06-13'), // Saturday, June 13, 2026
      unlockDate: new Date('2026-06-08'), // 5 days before session
    },
  });

  const session11 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 11,
      title: 'Job Search Strategies',
      description: 'Navigating the hidden job market, referrals, and cold outreach.',
      scheduledDate: new Date('2026-06-20'), // Saturday, June 20, 2026
      unlockDate: new Date('2026-06-15'), // 5 days before session
    },
  });

  const session12 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 12,
      title: 'Building A Global Career from Africa',
      description: 'Remote work for global companies, visa sponsorship, and African tech success stories.',
      scheduledDate: new Date('2026-06-27'), // Saturday, June 27, 2026
      unlockDate: new Date('2026-06-22'), // 5 days before session
    },
  });

  const session13 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 13,
      title: 'AI for the Workplace',
      description: 'Using AI tools for productivity, learning, and work. Ethical considerations.',
      scheduledDate: new Date('2026-07-04'), // Saturday, July 4, 2026
      unlockDate: new Date('2026-06-29'), // 5 days before session
    },
  });

  const session14 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 14,
      title: 'Critical Thinking & Systems Thinking',
      description: 'Understanding complexity, first-principles thinking, and mental models.',
      scheduledDate: new Date('2026-07-11'), // Saturday, July 11, 2026
      unlockDate: new Date('2026-07-06'), // 5 days before session
    },
  });

  const session15 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 15,
      title: 'Design Thinking & Problem Solving',
      description: 'Human-centered design, frameworks for creative problem-solving.',
      scheduledDate: new Date('2026-07-18'), // Saturday, July 18, 2026
      unlockDate: new Date('2026-07-13'), // 5 days before session
    },
  });

  const session16 = await prisma.session.create({
    data: {
      cohortId: cohort.id,
      sessionNumber: 16,
      title: 'Career Sustainability & Long-Term Planning',
      description: 'Avoiding burnout, continuous learning, purpose-driven work, and long-term career vision.',
      scheduledDate: new Date('2026-07-25'), // Saturday, July 25, 2026
      unlockDate: new Date('2026-07-20'), // 5 days before session
    },
  });

  console.log('✅ Created 16 sessions');

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

  const resource12 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.ARTICLE,
      title: 'Deep work, focus, and managing attention in modern workplaces',
      description: 'Mastering your schedule: Effective time management strategies for success',
      url: 'https://lpsonline.sas.upenn.edu/features/mastering-your-schedule-effective-time-management-strategies-success',
      duration: 15,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource13 = await prisma.resource.create({
    data: {
      sessionId: session2.id,
      type: ResourceType.VIDEO,
      title: 'How to Build Your Ultimate Productivity System',
      description: 'Productivity systems that work for busy professionals',
      url: 'https://youtu.be/T6hmdrsLQj8',
      duration: 20,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 3: Effective Communication Skills
  const resource14 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.ARTICLE,
      title: 'Core communication skills for the workplace',
      description: 'Essential communication skills you need in the workplace',
      url: 'https://www.indeed.com/career-advice/career-development/communication-skills-in-the-workplace',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource15 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.ARTICLE,
      title: 'Listening, clarity, and feedback at work',
      description: 'The power of active listening in the workplace',
      url: 'https://lornawestonsmyth.com/power-of-active-listening-in-the-workplace/',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource16 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.VIDEO,
      title: 'The 3-2-1 Speaking Trick That Forces You To Stop Rambling!',
      description: 'Effective communication skills at work',
      url: 'https://youtu.be/5m-C5mwpmxU',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource17 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.VIDEO,
      title: '5 ways to listen better | Julian Treasure | TED',
      description: 'Common communication mistakes professionals make',
      url: 'https://youtu.be/cSohjlYQI2A',
      duration: 8,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource18 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.ARTICLE,
      title: 'Communicating with confidence in meetings and teams',
      description: 'Professional speaking confidence guide',
      url: 'https://www.planetspark.in/communication-skills/professional-speaking-confidence-guide',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource19 = await prisma.resource.create({
    data: {
      sessionId: session3.id,
      type: ResourceType.VIDEO,
      title: 'How to Speak So That People Want to Listen | Julian Treasure | TED',
      description: 'How great communicators think and speak',
      url: 'https://youtu.be/eIho2S0ZahI',
      duration: 10,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 4: Storytelling - Leading Early
  const resource20 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.ARTICLE,
      title: 'Early-career leadership lessons from professionals',
      description: 'Lessons from industry leaders: Essential early career advice',
      url: 'https://www.linkedin.com/pulse/lessons-from-industry-leaders-essential-early-career-espinosa-cpc-kbnhc',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource21 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.ARTICLE,
      title: 'Influence, initiative, and credibility at work',
      description: 'Leadership without authority: Examples and strategies',
      url: 'https://quarterdeck.co.uk/articles/leadership-without-authority-examples',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource22 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.VIDEO,
      title: 'Great leadership starts with self-leadership | Lars Sudmann | TEDx',
      description: 'Self-leadership fundamentals for career growth',
      url: 'https://youtu.be/vlpKyLklDDY',
      duration: 18,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource23 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.VIDEO,
      title: 'Monday Morning Team Motivation | Jack Ma Life Story',
      description: 'Ownership mindset stories from early career stages',
      url: 'https://youtu.be/D24Oo0B5AN8',
      duration: 20,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource24 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.ARTICLE,
      title: 'Personal stories on earning trust and responsibility',
      description: 'The ownership mindset: An essential ingredient for career success',
      url: 'https://eatyourcareer.com/2021/05/the-ownership-mindset-an-essential-ingredient-for-career-success/',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource25 = await prisma.resource.create({
    data: {
      sessionId: session4.id,
      type: ResourceType.VIDEO,
      title: '6 Leadership Lessons You\'ll Probably Learn the Hard Way',
      description: 'Leadership lessons learned the hard way',
      url: 'https://youtu.be/Uxx5jtAVLCQ',
      duration: 15,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  console.log('✅ Created Month 1 resources (Sessions 1-4)');

  // MONTH 2 - Session 5: Career Exploration & Strategic Career Planning
  const resource26 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.ARTICLE,
      title: 'Career exploration frameworks for early professionals',
      description: 'Comprehensive guide to career exploration strategies',
      url: 'https://www.indeed.com/career-advice/finding-a-job/career-exploration',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource27 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.ARTICLE,
      title: 'How to plan a career in uncertain job markets',
      description: 'Career planning strategies for uncertain times',
      url: 'https://www.hubhub.com/career-planning-in-uncertain-job-market-conditions/',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource28 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.VIDEO,
      title: 'How to Build an Effective Career Plan (Top 5 Tips)',
      description: 'Career planning explained with actionable tips',
      url: 'https://www.youtube.com/watch?v=jVssNpBk37k',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource29 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.VIDEO,
      title: 'A Plan Is Not a Strategy',
      description: 'Understanding the difference between planning and strategy',
      url: 'https://youtu.be/iuYlGRnC7J8',
      duration: 18,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource30 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.ARTICLE,
      title: 'Designing a career, not just chasing jobs',
      description: 'How to design a career that fits your life',
      url: 'https://www.linkedin.com/pulse/designing-career-fits-your-life-just-resume-d%C3%A9ja-white-n6vwc',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource31 = await prisma.resource.create({
    data: {
      sessionId: session5.id,
      type: ResourceType.VIDEO,
      title: 'The best career path isn\'t always a straight line | TED',
      description: 'Career path storytelling: unexpected journeys',
      url: 'https://youtu.be/1ALfKWG2nmw',
      duration: 16,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 6: Remote, Hybrid & Cross-Cultural Collaboration
  const resource32 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.ARTICLE,
      title: 'How to Work Effectively in Remote Teams',
      description: 'Best practices for remote team collaboration',
      url: 'https://www.headresourcing.com/blog/2016/08/how-to-work-effectively-with-remote-teams',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource33 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.ARTICLE,
      title: 'Cross-Cultural Communication',
      description: 'Essential skills for global HR teams and professionals',
      url: 'https://www.ignitehcm.com/blog/cross-cultural-communication-essential-skills-for-global-hr-teams',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource34 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.VIDEO,
      title: 'Remote Work Communications Training',
      description: 'Mastering communication in remote work environments',
      url: 'https://youtu.be/i7Pxvj-KSRI',
      duration: 20,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource35 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.VIDEO,
      title: 'Cross cultural communication | Pellegrino Riccardi | TEDxBergen',
      description: 'Understanding cross-cultural dynamics in the workplace',
      url: 'https://youtu.be/YMyofREc5Jk',
      duration: 18,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource36 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.ARTICLE,
      title: 'Asynchronous Communication at Work',
      description: 'Guide to async communication for distributed teams',
      url: 'https://www.coursera.org/articles/asynchronous-communication',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource37 = await prisma.resource.create({
    data: {
      sessionId: session6.id,
      type: ResourceType.VIDEO,
      title: 'How to Collaborate Effectively If Your Team Is Remote',
      description: 'Remote collaboration that actually works',
      url: 'https://youtu.be/vradYqcXfGQ',
      duration: 15,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 7: Execution at Work: From Tasks to Impact
  const resource38 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.ARTICLE,
      title: 'How the Best Leaders Focus on Execution',
      description: 'Leadership strategies for effective execution',
      url: 'https://learnloft.com/2022/09/01/how-the-best-leaders-focus-on-execution/',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource39 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.ARTICLE,
      title: 'Guide to managing up: What it means and why it\'s important',
      description: 'Essential guide to managing up in your career',
      url: 'https://www.cultureamp.com/blog/managing-up-importance',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource40 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.VIDEO,
      title: 'Execution and HOW to achieve results Faster',
      description: 'Execution and focus at work fundamentals',
      url: 'https://youtu.be/EwWqOfTlNcw',
      duration: 20,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource41 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.VIDEO,
      title: 'Maximize Productivity With These Time Management Tools | Dr. Cal Newport',
      description: 'Effective productivity strategies from experts',
      url: 'https://youtu.be/T4dser6ssp0',
      duration: 25,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource42 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.ARTICLE,
      title: 'How to Take Feedback without Getting Defensive',
      description: 'Strategies for receiving feedback constructively',
      url: 'https://nickwignall.com/how-to-take-feedback-without-getting-defensive/',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource43 = await prisma.resource.create({
    data: {
      sessionId: session7.id,
      type: ResourceType.VIDEO,
      title: 'Extreme Ownership Animated Summary',
      description: 'Taking ownership at work - key principles',
      url: 'https://youtu.be/KSW7LQaFHTg',
      duration: 15,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 8: Storytelling - Navigating Career Choices & Pivots
  const resource44 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.ARTICLE,
      title: 'Stories of career pivots and reinvention',
      description: 'Success stories of navigating career pivots',
      url: 'https://www.linkedin.com/pulse/stories-reinvention-success-navigating-career-pivots-personal-wilson-ugiqc',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource45 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.ARTICLE,
      title: 'Lessons from professionals who changed paths',
      description: 'Career transitions: Lessons learnt along the way',
      url: 'https://shecancode.io/career-transitions-lessons-learnt-along-the-way/',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource46 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.VIDEO,
      title: 'Career Change: The Questions You Need to Ask Yourself Now | TEDxHanoi',
      description: 'Career pivot storytelling session',
      url: 'https://youtu.be/MIjH8MCbONI',
      duration: 18,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource47 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.VIDEO,
      title: 'How to overcome your mistakes',
      description: 'Lessons learned from wrong career choices',
      url: 'https://youtu.be/eBz7iUJu9UM',
      duration: 15,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource48 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.ARTICLE,
      title: 'Embracing non-linear career paths',
      description: 'Why non-linear career paths are becoming the norm',
      url: 'https://insight.ieeeusa.org/articles/embracing-a-nonlinear-career-path/',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource49 = await prisma.resource.create({
    data: {
      sessionId: session8.id,
      type: ResourceType.VIDEO,
      title: 'Carl Jung - Life Begins When You Find Yourself',
      description: 'Fireside chat: career decisions and regrets',
      url: 'https://youtu.be/6oY3fb-RJFg',
      duration: 20,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  console.log('✅ Created Month 2 resources (Sessions 5-8)');

  // MONTH 3 - Session 9: Personal Branding & Networking
  const resource50 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.ARTICLE,
      title: 'Building a personal brand as a young professional',
      description: 'Tips from one young professional to another',
      url: 'https://www.linkedin.com/pulse/building-your-personal-brand-tips-from-one-young-another-lily-vater-zgzje',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource51 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.ARTICLE,
      title: 'Strategic networking for career growth',
      description: 'Indeed guide to effective networking strategies',
      url: 'https://www.indeed.com/career-advice/career-development/networking-strategies',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource52 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.VIDEO,
      title: '5 Steps to Building a Personal Brand You Feel Good About | TED',
      description: 'Personal branding for professionals',
      url: 'https://youtu.be/ozMCb0wOnMU',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource53 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.VIDEO,
      title: 'How to Network Like the Top 1% (6 Key Lessons)',
      description: 'Networking without feeling awkward',
      url: 'https://youtu.be/EC1ut0gmspk',
      duration: 18,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource54 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.ARTICLE,
      title: 'Using LinkedIn intentionally for career growth',
      description: 'How to make the best use of LinkedIn for your career',
      url: 'https://headhuntinternational.com/how-to-make-the-best-use-of-linkedin-for-your-career/',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource55 = await prisma.resource.create({
    data: {
      sessionId: session9.id,
      type: ResourceType.VIDEO,
      title: 'How To Treat Your Personal Brand Like A Business',
      description: 'You are also a business - personal branding insights',
      url: 'https://youtu.be/KcTiAR5oHPc',
      duration: 20,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 10: Resume Writing & Interview Preparation
  const resource56 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.ARTICLE,
      title: 'Writing resumes that work in modern hiring',
      description: '8 tips on how to write a resume for today\'s job market',
      url: 'https://www.iqpartners.com/blog/8-tips-on-how-to-write-a-resume-for-todays-job-market/',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource57 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.ARTICLE,
      title: 'Interview preparation strategies',
      description: 'How to prepare for an interview - Indeed guide',
      url: 'https://www.indeed.com/career-advice/interviewing/how-to-prepare-for-an-interview',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource58 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.VIDEO,
      title: 'Tips For How To Write A Better Resume (From A Recruiter\'s Perspective)',
      description: 'Resume tips recruiters actually care about',
      url: 'https://youtu.be/R3abknwWX7k',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource59 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.VIDEO,
      title: 'Doing This (Almost) GUARANTEES You Get Hired In A Job Interview!',
      description: 'Interview techniques for early-career professionals',
      url: 'https://youtu.be/0siE31sqz0Q',
      duration: 18,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource60 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.ARTICLE,
      title: 'Common resume and interview mistakes',
      description: 'Top resume mistakes to avoid',
      url: 'https://www.thebalancemoney.com/top-resume-mistakes-to-avoid-2063291',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource61 = await prisma.resource.create({
    data: {
      sessionId: session10.id,
      type: ResourceType.VIDEO,
      title: 'How to Ace Your Group Interview | Mock Job Interview | Indeed',
      description: 'Mock interview breakdowns',
      url: 'https://youtu.be/eLxA6hPaStw',
      duration: 20,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 11: Modern Job Search & Opportunity Discovery
  const resource62 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.ARTICLE,
      title: 'The Hidden Job Market: How 70% of Positions Are Filled Before They\'re Ever Posted',
      description: 'Understanding the hidden job market',
      url: 'https://blog.theinterviewguys.com/the-hidden-job-market/',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource63 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.ARTICLE,
      title: 'How to Leverage LinkedIn Job Referrals for Success in Your Job Search',
      description: 'Using referrals effectively in your job search',
      url: 'https://www.linkedin.com/posts/daniellehao_jobhunting-referrals-jobs-activity-7301280494275436544-156G',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource64 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.VIDEO,
      title: 'How to Get Hired in 2026: Beyond Technical Skills (by ex-Amazon)',
      description: 'How people actually get jobs in modern job market',
      url: 'https://youtu.be/1qJKcrIdL0s',
      duration: 20,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource65 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.VIDEO,
      title: 'Reach out to Recruiters on LinkedIn (the right way!)',
      description: 'Cold outreach and networking tips',
      url: 'https://youtu.be/jnzh5QTKbsw',
      duration: 15,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource66 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.ARTICLE,
      title: '5 Simple Tips to Strengthen Your Remote Job Search',
      description: 'Effective tips for remote job hunting',
      url: 'https://weworkremotely.com/5-simple-yet-effective-tips-to-strengthen-your-remote-job-search',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource67 = await prisma.resource.create({
    data: {
      sessionId: session11.id,
      type: ResourceType.VIDEO,
      title: 'How To Actually Achieve Your Goals in 2026 (Evidence-Based)',
      description: 'Building systems for job search and opportunities',
      url: 'https://youtu.be/WONRS7BLh4g',
      duration: 18,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 12: Building a Global Career from Africa
  const resource68 = await prisma.resource.create({
    data: {
      sessionId: session12.id,
      type: ResourceType.ARTICLE,
      title: 'Building Global Careers from Emerging Markets',
      description: 'The Digital Transformation of Talent: Adaptive Hiring Manifesto (Andela)',
      url: 'https://hire.andela.com/rs/449-UCH-555/images/Andela_Adaptive%20Hiring%20Manifesto%201.pdf',
      duration: 15,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource69 = await prisma.resource.create({
    data: {
      sessionId: session12.id,
      type: ResourceType.VIDEO,
      title: 'How to Land High-Paying Remote Tech Jobs from Africa',
      description: 'Positioning yourself for global opportunities',
      url: 'https://www.youtube.com/watch?v=aJOHkdh_3_g',
      duration: 25,
      pointValue: 100,
      order: 2,
      isCore: true,
    },
  });

  const resource70 = await prisma.resource.create({
    data: {
      sessionId: session12.id,
      type: ResourceType.VIDEO,
      title: 'Remote But Not Removed: African Techies Thriving in Global Roles',
      description: 'Working remotely for global companies from Africa',
      url: 'https://www.youtube.com/watch?v=MhBLNQvjaBA',
      duration: 20,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource71 = await prisma.resource.create({
    data: {
      sessionId: session12.id,
      type: ResourceType.VIDEO,
      title: 'Adedeji Loves Flutterwave\'s Remote Work Policy!',
      description: 'Flutterwave/Paystack insights on remote work',
      url: 'https://www.youtube.com/watch?v=xjmHKnsGyM8',
      duration: 15,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  console.log('✅ Created Month 3 resources (Sessions 9-12)');

  // MONTH 4 - Session 13: AI for the Workplace
  const resource72 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.ARTICLE,
      title: 'How Knowledge Workers Are Using AI',
      description: 'AI improves knowledge worker results',
      url: 'https://cuttingedgepr.com/articles/ai-improves-knowledge-worker-results/',
      duration: 10,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource73 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.ARTICLE,
      title: 'Ethical Use of AI at Work',
      description: 'Scaling trustworthy AI: How to turn ethical principles into global practice',
      url: 'https://www.weforum.org/stories/2026/01/scaling-trustworthy-ai-into-global-practice/',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource74 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.VIDEO,
      title: 'Principles for Using AI at Work, with Ethan Mollick',
      description: 'Using AI as a thought partner',
      url: 'https://www.youtube.com/watch?v=sAy7Q3yMsQc',
      duration: 25,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource75 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.VIDEO,
      title: 'The Future of Work & Education with AI (Ethan Mollick)',
      description: 'AI at work isn\'t optional anymore',
      url: 'https://www.youtube.com/watch?v=yjdovkJQRwk',
      duration: 30,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource76 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.ARTICLE,
      title: 'Prompting for Work, Not Hype',
      description: '5 best ways to use AI at work (LinkedIn insights)',
      url: 'https://www.linkedin.com/pulse/5-best-ways-use-ai-work-stephen-griffiths-i6p8c',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource77 = await prisma.resource.create({
    data: {
      sessionId: session13.id,
      type: ResourceType.VIDEO,
      title: 'AI and the Future of Work (CUNY Graduate Center)',
      description: 'AI productivity demos for professionals',
      url: 'https://www.youtube.com/watch?v=wpKkqJ7i6Co',
      duration: 40,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  // Session 14: Critical Thinking & Problem-Solving
  const resource78 = await prisma.resource.create({
    data: {
      sessionId: session14.id,
      type: ResourceType.ARTICLE,
      title: 'Thinking in Systems at Work',
      description: 'Systems thinking: What, why, when, where, and how?',
      url: 'https://thesystemsthinker.com/systems-thinking-what-why-when-where-and-how/',
      duration: 15,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource79 = await prisma.resource.create({
    data: {
      sessionId: session14.id,
      type: ResourceType.VIDEO,
      title: 'Science Isn\'t Really a Method—It\'s Your Brain Celebrating Danger and Uncertainty',
      description: 'How to think clearly under uncertainty',
      url: 'https://www.youtube.com/watch?v=4_BibNUzRSE',
      duration: 20,
      pointValue: 100,
      order: 2,
      isCore: true,
    },
  });

  const resource80 = await prisma.resource.create({
    data: {
      sessionId: session14.id,
      type: ResourceType.VIDEO,
      title: 'Improve your critical thinking skills in just 6 minutes (Big Think+)',
      description: 'Critical thinking skills for professionals',
      url: 'https://www.youtube.com/watch?v=BtqOeXsB36U',
      duration: 6,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  // Session 15: Design Thinking for Career & Workplace Innovation
  const resource81 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.ARTICLE,
      title: 'Design thinking fundamentals',
      description: 'What is design thinking and why is it so popular?',
      url: 'https://www.interaction-design.org/literature/article/what-is-design-thinking-and-why-is-it-so-popular',
      duration: 15,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource82 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.ARTICLE,
      title: 'Innovation and problem-solving at work',
      description: 'Design thinking - Nielsen Norman Group guide',
      url: 'https://www.nngroup.com/articles/design-thinking/',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource83 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.VIDEO,
      title: 'The Design Thinking Process',
      description: 'Design thinking explained',
      url: 'https://youtu.be/_r0VX-aU_T8',
      duration: 15,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource84 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.VIDEO,
      title: 'The Design Thinking Process Broken Down Step-by-Step',
      description: 'Step-by-step guide to design thinking',
      url: 'https://youtu.be/McTh-xzxfRE',
      duration: 18,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource85 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.VIDEO,
      title: 'Design Thinking in Practice: The Case of Wiener Linien',
      description: 'Applying design thinking in careers',
      url: 'https://youtu.be/baTclusSiCU',
      duration: 20,
      pointValue: 100,
      order: 5,
      isCore: true,
    },
  });

  const resource86 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.ARTICLE,
      title: 'Human-centered problem solving',
      description: 'What is design thinking? IDEO U guide',
      url: 'https://www.ideou.com/blogs/inspiration/what-is-design-thinking',
      duration: 10,
      pointValue: 30,
      order: 6,
      isCore: false,
    },
  });

  const resource87 = await prisma.resource.create({
    data: {
      sessionId: session15.id,
      type: ResourceType.VIDEO,
      title: 'Design Thinking in Netflix | Case Studio',
      description: 'Design thinking case study',
      url: 'https://youtu.be/8P8gspd_Bx8',
      duration: 12,
      pointValue: 50,
      order: 7,
      isCore: false,
    },
  });

  // Session 16: Storytelling - Sustaining Growth
  const resource88 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.ARTICLE,
      title: 'Long-term career growth stories',
      description: 'Stephen Warley career story and insights',
      url: 'https://www.lifeskillsthatmatter.com/blog/stephen-warley-career-story',
      duration: 15,
      pointValue: 50,
      order: 1,
      isCore: true,
    },
  });

  const resource89 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.ARTICLE,
      title: 'Building purpose and impact in careers',
      description: 'Career progression stories - Raymond Hua',
      url: 'https://jonassoftware.com/career-progression-stories-raymond-hua',
      duration: 12,
      pointValue: 50,
      order: 2,
      isCore: true,
    },
  });

  const resource90 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.VIDEO,
      title: 'Why the secret to success is setting the right goals | John Doerr | TED',
      description: 'Setting the right goals for career sustainability',
      url: 'https://youtu.be/L4N1q4RNi9I',
      duration: 18,
      pointValue: 100,
      order: 3,
      isCore: true,
    },
  });

  const resource91 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.VIDEO,
      title: '4 Steps to a Career in Sustainability | How to Build a Career in Sustainability',
      description: 'Career sustainability storytelling session',
      url: 'https://youtu.be/vsZW4kRFekI',
      duration: 20,
      pointValue: 100,
      order: 4,
      isCore: true,
    },
  });

  const resource92 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.ARTICLE,
      title: 'Defining success beyond job titles',
      description: 'Redefining success beyond money or title',
      url: 'https://medium.com/@udayan.banerjee/redefining-success-beyond-money-or-title-fe71aafda696',
      duration: 10,
      pointValue: 30,
      order: 5,
      isCore: false,
    },
  });

  const resource93 = await prisma.resource.create({
    data: {
      sessionId: session16.id,
      type: ResourceType.VIDEO,
      title: 'Three Questions to Build a Purpose-Driven Career | TEDx',
      description: 'Fireside chat: legacy, purpose, and growth',
      url: 'https://youtu.be/-xHcKGlA8vw',
      duration: 16,
      pointValue: 50,
      order: 6,
      isCore: false,
    },
  });

  console.log('✅ Created Month 4 resources (Sessions 13-16)');
  console.log(`✅ Total resources created: 93`);

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
