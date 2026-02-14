/**
 * seed-achievements.ts
 * Run with: npx ts-node prisma/seed-achievements.ts
 *
 * Replaces all achievement definitions with the full set of 50.
 * Does NOT touch users, cohorts, sessions, resources, or any other data.
 * Any existing UserAchievement rows are cleared first (they reference achievement IDs
 * that will be deleted) — fellows will need to re-earn them, or you can comment
 * out the userAchievement.deleteMany() call to keep existing unlocks.
 */

import { PrismaClient, AchievementType } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS: Array<{
  name: string;
  description: string;
  type: AchievementType;
  iconUrl: string;
  pointValue: number;
  criteria: Record<string, number | boolean>;
}> = [
  // ── MILESTONE (18) ──────────────────────────────────────────────────────────
  { name: 'First Step',         description: 'Complete your first resource',                                                              type: AchievementType.MILESTONE,   iconUrl: 'PlayCircle',    pointValue: 10,   criteria: { resourceCount: 1 } },
  { name: 'Getting Started',    description: 'Complete 5 resources',                                                                     type: AchievementType.MILESTONE,   iconUrl: 'BookOpen',      pointValue: 25,   criteria: { resourceCount: 5 } },
  { name: 'Resource Explorer',  description: 'Complete 10 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: 'Compass',       pointValue: 50,   criteria: { resourceCount: 10 } },
  { name: 'Halfway There',      description: 'Complete 25 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: 'Flag',          pointValue: 100,  criteria: { resourceCount: 25 } },
  { name: 'Resource Master',    description: 'Complete 50 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: 'GraduationCap', pointValue: 250,  criteria: { resourceCount: 50 } },
  { name: 'Quiz Rookie',        description: 'Pass your first quiz',                                                                     type: AchievementType.MILESTONE,   iconUrl: 'PenLine',       pointValue: 10,   criteria: { quizCount: 1 } },
  { name: 'Quiz Enthusiast',    description: 'Pass 5 quizzes',                                                                          type: AchievementType.MILESTONE,   iconUrl: 'Pencil',        pointValue: 50,   criteria: { quizCount: 5 } },
  { name: 'Quiz Expert',        description: 'Pass 10 quizzes',                                                                         type: AchievementType.MILESTONE,   iconUrl: 'Brain',         pointValue: 100,  criteria: { quizCount: 10 } },
  { name: 'Quiz Champion',      description: 'Pass 20 quizzes',                                                                         type: AchievementType.MILESTONE,   iconUrl: 'Medal',         pointValue: 200,  criteria: { quizCount: 20 } },
  { name: 'Perfectionist',      description: 'Score 100% on a quiz',                                                                    type: AchievementType.MILESTONE,   iconUrl: 'CheckCircle',   pointValue: 50,   criteria: { perfectQuizCount: 1 } },
  { name: 'Twice Perfect',      description: 'Score 100% on 2 quizzes',                                                                 type: AchievementType.MILESTONE,   iconUrl: 'Star',          pointValue: 100,  criteria: { perfectQuizCount: 2 } },
  { name: 'Flawless Five',      description: 'Score 100% on 5 quizzes',                                                                 type: AchievementType.MILESTONE,   iconUrl: 'Sparkles',      pointValue: 200,  criteria: { perfectQuizCount: 5 } },
  { name: 'Flawless Ten',       description: 'Score 100% on 10 quizzes',                                                                type: AchievementType.MILESTONE,   iconUrl: 'Award',         pointValue: 400,  criteria: { perfectQuizCount: 10 } },
  { name: 'Live Buzzer',        description: 'Participate in your first live quiz',                                                     type: AchievementType.MILESTONE,   iconUrl: 'Gamepad2',      pointValue: 25,   criteria: { liveQuizCount: 1 } },
  { name: 'Live Regular',       description: 'Participate in 5 live quizzes',                                                           type: AchievementType.MILESTONE,   iconUrl: 'Monitor',       pointValue: 75,   criteria: { liveQuizCount: 5 } },
  { name: 'Live Pro',           description: 'Participate in 10 live quizzes',                                                          type: AchievementType.MILESTONE,   iconUrl: 'Target',        pointValue: 150,  criteria: { liveQuizCount: 10 } },
  { name: 'Live Veteran',       description: 'Participate in 25 live quizzes',                                                          type: AchievementType.MILESTONE,   iconUrl: 'Trophy',        pointValue: 300,  criteria: { liveQuizCount: 25 } },
  { name: 'Overachiever',       description: 'Complete 25 resources, pass 10 quizzes, and score 100% twice',                            type: AchievementType.MILESTONE,   iconUrl: 'Rocket',        pointValue: 350,  criteria: { resourceCount: 25, quizCount: 10, perfectQuizCount: 2 } },

  // ── SOCIAL (12) ─────────────────────────────────────────────────────────────
  { name: 'First Post',         description: 'Post your first discussion',                                                              type: AchievementType.SOCIAL,      iconUrl: 'MessageCircle', pointValue: 10,   criteria: { discussionCount: 1 } },
  { name: 'Regular Poster',     description: 'Post 3 discussions',                                                                      type: AchievementType.SOCIAL,      iconUrl: 'MessageSquare', pointValue: 20,   criteria: { discussionCount: 3 } },
  { name: 'Conversationalist',  description: 'Post 5 discussions',                                                                      type: AchievementType.SOCIAL,      iconUrl: 'MessagesSquare',pointValue: 35,   criteria: { discussionCount: 5 } },
  { name: 'Community Voice',    description: 'Post 10 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: 'Megaphone',     pointValue: 75,   criteria: { discussionCount: 10 } },
  { name: 'Forum Regular',      description: 'Post 25 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: 'Landmark',      pointValue: 150,  criteria: { discussionCount: 25 } },
  { name: 'Community Pillar',   description: 'Post 50 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: 'Globe',         pointValue: 300,  criteria: { discussionCount: 50 } },
  { name: 'First Reply',        description: 'Post your first comment',                                                                 type: AchievementType.SOCIAL,      iconUrl: 'Reply',         pointValue: 5,    criteria: { commentCount: 1 } },
  { name: 'Active Responder',   description: 'Post 10 comments',                                                                        type: AchievementType.SOCIAL,      iconUrl: 'MessageSquareDot', pointValue: 25, criteria: { commentCount: 10 } },
  { name: 'Reply Guru',         description: 'Post 25 comments',                                                                        type: AchievementType.SOCIAL,      iconUrl: 'Mic',           pointValue: 75,   criteria: { commentCount: 25 } },
  { name: 'Reply Legend',       description: 'Post 50 comments',                                                                        type: AchievementType.SOCIAL,      iconUrl: 'Radio',         pointValue: 150,  criteria: { commentCount: 50 } },
  { name: 'Mega Contributor',   description: 'Post 100 comments',                                                                       type: AchievementType.SOCIAL,      iconUrl: 'Volume2',       pointValue: 300,  criteria: { commentCount: 100 } },
  { name: 'Social Butterfly',   description: 'Post 10 discussions and 10 comments',                                                     type: AchievementType.SOCIAL,      iconUrl: 'Heart',         pointValue: 100,  criteria: { discussionCount: 10, commentCount: 10 } },

  // ── STREAK / COMBO (10) ─────────────────────────────────────────────────────
  { name: 'Combo Starter',      description: 'Complete 5 resources and pass 2 quizzes',                                                 type: AchievementType.STREAK,      iconUrl: 'Zap',           pointValue: 35,   criteria: { resourceCount: 5, quizCount: 2 } },
  { name: 'Momentum Builder',   description: 'Complete 10 resources and pass 5 quizzes',                                                type: AchievementType.STREAK,      iconUrl: 'Flame',         pointValue: 75,   criteria: { resourceCount: 10, quizCount: 5 } },
  { name: 'All-Rounder',        description: 'Complete 10 resources, pass 5 quizzes, and post 5 discussions',                           type: AchievementType.STREAK,      iconUrl: 'LayoutGrid',    pointValue: 150,  criteria: { resourceCount: 10, quizCount: 5, discussionCount: 5 } },
  { name: 'Triple Threat',      description: 'Complete 25 resources, pass 10 quizzes, and post 10 discussions',                         type: AchievementType.STREAK,      iconUrl: 'Swords',        pointValue: 300,  criteria: { resourceCount: 25, quizCount: 10, discussionCount: 10 } },
  { name: 'Scholar',            description: 'Complete 20 resources, score 100% on 3 quizzes, and post 5 discussions',                  type: AchievementType.STREAK,      iconUrl: 'BookMarked',    pointValue: 250,  criteria: { resourceCount: 20, perfectQuizCount: 3, discussionCount: 5 } },
  { name: 'Live Learner',       description: 'Complete 5 resources and join 3 live quizzes',                                            type: AchievementType.STREAK,      iconUrl: 'MonitorPlay',   pointValue: 50,   criteria: { resourceCount: 5, liveQuizCount: 3 } },
  { name: 'Engaged Scholar',    description: 'Complete 15 resources, post 5 discussions, and 5 comments',                               type: AchievementType.STREAK,      iconUrl: 'Sprout',        pointValue: 200,  criteria: { resourceCount: 15, discussionCount: 5, commentCount: 5 } },
  { name: 'The Trifecta',       description: 'Complete 50 resources, pass 20 quizzes, and post 25 discussions',                         type: AchievementType.STREAK,      iconUrl: 'BadgeCheck',    pointValue: 600,  criteria: { resourceCount: 50, quizCount: 20, discussionCount: 25 } },
  { name: 'Perfect Scholar',    description: 'Score 100% on 5 quizzes and post 10 discussions',                                         type: AchievementType.STREAK,      iconUrl: 'Diamond',       pointValue: 300,  criteria: { perfectQuizCount: 5, discussionCount: 10 } },
  { name: 'Campus Legend',      description: 'Complete 50 resources, pass 15 quizzes, post 20 discussions, join 10 live quizzes',       type: AchievementType.STREAK,      iconUrl: 'Crown',         pointValue: 750,  criteria: { resourceCount: 50, quizCount: 15, discussionCount: 20, liveQuizCount: 10 } },

  // ── LEADERBOARD / POINTS (10) ───────────────────────────────────────────────
  { name: 'Point Starter',      description: 'Earn 50 points',                                                                          type: AchievementType.LEADERBOARD, iconUrl: 'CircleDollarSign', pointValue: 15,   criteria: { totalPoints: 50 } },
  { name: 'Point Collector',    description: 'Earn 150 points',                                                                         type: AchievementType.LEADERBOARD, iconUrl: 'Coins',            pointValue: 25,   criteria: { totalPoints: 150 } },
  { name: 'Point Accumulator',  description: 'Earn 400 points',                                                                         type: AchievementType.LEADERBOARD, iconUrl: 'BarChart2',         pointValue: 50,   criteria: { totalPoints: 400 } },
  { name: 'Point Hoarder',      description: 'Earn 800 points',                                                                         type: AchievementType.LEADERBOARD, iconUrl: 'Wallet',            pointValue: 75,   criteria: { totalPoints: 800 } },
  { name: 'Point Enthusiast',   description: 'Earn 1,500 points',                                                                       type: AchievementType.LEADERBOARD, iconUrl: 'BatteryCharging',  pointValue: 100,  criteria: { totalPoints: 1500 } },
  { name: 'Point Expert',       description: 'Earn 3,500 points',                                                                       type: AchievementType.LEADERBOARD, iconUrl: 'BarChart3',         pointValue: 150,  criteria: { totalPoints: 3500 } },
  { name: 'Point Legend',       description: 'Earn 6,000 points',                                                                       type: AchievementType.LEADERBOARD, iconUrl: 'Trophy',            pointValue: 200,  criteria: { totalPoints: 6000 } },
  { name: 'Point Elite',        description: 'Earn 10,000 points',                                                                      type: AchievementType.LEADERBOARD, iconUrl: 'ShieldCheck',       pointValue: 300,  criteria: { totalPoints: 10000 } },
  { name: 'Living Legend',      description: 'Earn 18,000 points',                                                                      type: AchievementType.LEADERBOARD, iconUrl: 'Shield',            pointValue: 500,  criteria: { totalPoints: 18000 } },
  { name: 'The GOAT',           description: 'Earn 50,000 points — the greatest of all time',                                           type: AchievementType.LEADERBOARD, iconUrl: 'Flame',             pointValue: 1000, criteria: { totalPoints: 50000 } },
];

async function main() {
  console.log('🏆 Seeding achievements...');

  // Remove existing UserAchievements first (FK constraint)
  const deletedUA = await prisma.userAchievement.deleteMany();
  console.log(`   Cleared ${deletedUA.count} user achievement record(s)`);

  // Remove old achievement definitions
  const deletedA = await prisma.achievement.deleteMany();
  console.log(`   Cleared ${deletedA.count} old achievement definition(s)`);

  // Insert all 50
  const result = await prisma.achievement.createMany({
    data: ACHIEVEMENTS.map((a) => ({
      ...a,
      criteria: JSON.stringify(a.criteria),
    })),
  });

  console.log(`✅ Created ${result.count} achievements`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
