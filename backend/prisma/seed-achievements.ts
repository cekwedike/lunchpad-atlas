/**
 * seed-achievements.ts
 * Run from backend root: npx ts-node prisma/seed-achievements.ts
 *
 * Uses the same achievement list as AchievementsService (achievement-definitions.ts).
 * Replaces all achievement definitions. Clears UserAchievement rows first (FK).
 */

import { PrismaClient } from '@prisma/client';
import { ACHIEVEMENT_DEFINITIONS } from '../src/achievements/achievement-definitions';

const prisma = new PrismaClient();

async function main() {
  console.log('🏆 Seeding achievements...');

  const deletedUA = await prisma.userAchievement.deleteMany();
  console.log(`   Cleared ${deletedUA.count} user achievement record(s)`);

  const deletedA = await prisma.achievement.deleteMany();
  console.log(`   Cleared ${deletedA.count} old achievement definition(s)`);

  const result = await prisma.achievement.createMany({
    data: ACHIEVEMENT_DEFINITIONS.map((a) => ({
      ...a,
      criteria: JSON.stringify(a.criteria),
    })),
  });

  console.log(`✅ Created ${result.count} achievements (expected ${ACHIEVEMENT_DEFINITIONS.length})`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
