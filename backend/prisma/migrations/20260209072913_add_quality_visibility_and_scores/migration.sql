-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'DISCUSSION_QUALITY_SCORE';
ALTER TYPE "EventType" ADD VALUE 'COMMENT_QUALITY_SCORE';

-- AlterTable
ALTER TABLE "discussion_comments" ADD COLUMN     "isQualityVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualityAnalysis" JSONB,
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "scoredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "isQualityVisible" BOOLEAN NOT NULL DEFAULT false;
