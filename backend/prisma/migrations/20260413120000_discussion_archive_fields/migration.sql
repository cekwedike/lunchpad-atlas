-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- CreateIndex
CREATE INDEX "discussions_archivedAt_idx" ON "discussions"("archivedAt");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
