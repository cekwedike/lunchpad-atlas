-- Chat read receipts + daily platform time aggregates

CREATE TABLE "chat_message_reads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_message_reads_messageId_userId_key" ON "chat_message_reads"("messageId", "userId");
CREATE INDEX "chat_message_reads_messageId_idx" ON "chat_message_reads"("messageId");
CREATE INDEX "chat_message_reads_userId_idx" ON "chat_message_reads"("userId");

ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_message_reads" ADD CONSTRAINT "chat_message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "platform_time_daily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_time_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_time_daily_userId_day_key" ON "platform_time_daily"("userId", "day");
CREATE INDEX "platform_time_daily_userId_idx" ON "platform_time_daily"("userId");

ALTER TABLE "platform_time_daily" ADD CONSTRAINT "platform_time_daily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
