-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "state" "ResourceState" NOT NULL DEFAULT 'LOCKED';
