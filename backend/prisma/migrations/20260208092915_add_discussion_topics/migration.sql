-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "resourceId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "discussions_sessionId_idx" ON "discussions"("sessionId");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
