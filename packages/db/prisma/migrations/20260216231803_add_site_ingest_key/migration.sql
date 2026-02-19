-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "ingestKey" TEXT,
ALTER COLUMN "type" DROP DEFAULT;
