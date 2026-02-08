import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupCohortIds() {
  console.log('Cleaning up orphaned cohortId values...');

  // Remove cohortId from users who are not FELLOWs
  const result = await prisma.user.updateMany({
    where: {
      cohortId: { not: null },
      role: { not: 'FELLOW' },
    },
    data: {
      cohortId: null,
    },
  });

  console.log(`✅ Cleaned up ${result.count} user(s) with orphaned cohortId`);

  // Show current cohort member counts
  const cohorts = await prisma.cohort.findMany({
    include: {
      _count: {
        select: {
          fellows: { where: { role: 'FELLOW' } },
        },
      },
    },
  });

  console.log('\nCohort member counts:');
  cohorts.forEach((cohort) => {
    console.log(`  ${cohort.name}: ${cohort._count.fellows} fellows`);
  });

  await prisma.$disconnect();
}

cleanupCohortIds().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
