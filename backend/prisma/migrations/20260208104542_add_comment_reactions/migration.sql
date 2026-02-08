-- CreateEnum
CREATE TYPE "CommentReactionType" AS ENUM ('LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL', 'LOVE');

-- AlterTable
ALTER TABLE "discussion_comments" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "discussion_comment_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommentReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussion_comment_reactions_commentId_idx" ON "discussion_comment_reactions"("commentId");

-- CreateIndex
CREATE INDEX "discussion_comment_reactions_userId_idx" ON "discussion_comment_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_comment_reactions_commentId_userId_type_key" ON "discussion_comment_reactions"("commentId", "userId", "type");

-- CreateIndex
CREATE INDEX "discussion_comments_parentId_idx" ON "discussion_comments"("parentId");

-- AddForeignKey
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "discussion_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comment_reactions" ADD CONSTRAINT "discussion_comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "discussion_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comment_reactions" ADD CONSTRAINT "discussion_comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
