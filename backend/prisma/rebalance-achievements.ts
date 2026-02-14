/**
 * rebalance-achievements.ts
 *
 * Run ONCE after the monthly cap is raised to 2,500.
 * Updates:
 *   1. All users' monthlyPointsCap to 2,500
 *   2. LEADERBOARD point thresholds to spread evenly across a 6-month program
 *   3. Does NOT clear UserAchievement rows — existing unlocks are preserved
 *
 * Run with:
 *   npx ts-node prisma/rebalance-achievements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// New point thresholds for "total points earned" achievements.
//
// With 2,500 pts/month cap × 6 months = 15,000 regular points
// + ~9,200 achievement bonus points = ~24,000 max total for a dedicated fellow.
//
// Spread so one tier unlocks each month:
//   Starter – Accumulator  : Month 1 (early dopamine hits)
//   Hoarder  – Expert      : Month 1–2 (keeps momentum)
//   Legend                 : Month 2–3
//   Elite                  : Month 3–4
//   Living Legend          : Month 5–6 (end-of-program milestone)
//   The GOAT               : 50 000 — aspirational / multi-cohort, never easy
// ---------------------------------------------------------------------------
const LEADERBOARD_UPDATES: Array<{
  name: string;
  description: string;
  totalPoints: number;
}> = [
  { name: 'Point Starter',     description: 'Earn 50 points',              totalPoints: 50 },
  { name: 'Point Collector',   description: 'Earn 150 points',             totalPoints: 150 },
  { name: 'Point Accumulator', description: 'Earn 400 points',             totalPoints: 400 },
  { name: 'Point Hoarder',     description: 'Earn 800 points',             totalPoints: 800 },
  { name: 'Point Enthusiast',  description: 'Earn 1,500 points',           totalPoints: 1500 },
  { name: 'Point Expert',      description: 'Earn 3,500 points',           totalPoints: 3500 },
  { name: 'Point Legend',      description: 'Earn 6,000 points',           totalPoints: 6000 },
  { name: 'Point Elite',       description: 'Earn 10,000 points',          totalPoints: 10000 },
  { name: 'Living Legend',     description: 'Earn 18,000 points',          totalPoints: 18000 },
  { name: 'The GOAT',          description: 'Earn 50,000 points — the greatest of all time', totalPoints: 50000 },
];

async function main() {
  console.log('⚙️  Rebalancing gamification system...\n');

  // 1. Raise monthly cap for all existing users
  const userUpdate = await prisma.user.updateMany({
    where: { monthlyPointsCap: { lt: 2500 } },
    data: { monthlyPointsCap: 2500 },
  });
  console.log(`✅ Raised monthlyPointsCap to 2,500 for ${userUpdate.count} user(s)`);

  // 2. Update leaderboard achievement thresholds
  let updated = 0;
  for (const entry of LEADERBOARD_UPDATES) {
    const achievement = await prisma.achievement.findFirst({
      where: { name: entry.name },
    });

    if (!achievement) {
      console.log(`   ⚠️  Achievement not found: "${entry.name}" — skipping`);
      continue;
    }

    await prisma.achievement.update({
      where: { id: achievement.id },
      data: {
        description: entry.description,
        criteria: JSON.stringify({ totalPoints: entry.totalPoints }),
      },
    });
    updated++;
  }
  console.log(`✅ Updated ${updated} leaderboard achievement thresholds`);

  console.log('\n🎮 Summary of new point thresholds:');
  console.log('   Tier              Old → New');
  console.log('   Point Starter     50 → 50');
  console.log('   Point Collector   100 → 150');
  console.log('   Point Accumulator 250 → 400');
  console.log('   Point Hoarder     500 → 800');
  console.log('   Point Enthusiast  1,000 → 1,500');
  console.log('   Point Expert      2,500 → 3,500');
  console.log('   Point Legend      5,000 → 6,000');
  console.log('   Point Elite       10,000 → 10,000 (unchanged)');
  console.log('   Living Legend     25,000 → 18,000');
  console.log('   The GOAT          50,000 → 50,000 (unchanged)');

  console.log('\n📊 Monthly cap: 1,000 → 2,500 pts/month');
  console.log('   Max achievable over 6 months: ~24,000 pts');
  console.log('   Living Legend reachable at program end for dedicated fellows.');
  console.log('   The GOAT is aspirational — achievable only across multiple cohorts.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
