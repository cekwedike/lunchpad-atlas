-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "discussions_isApproved_idx" ON "discussions"("isApproved");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
