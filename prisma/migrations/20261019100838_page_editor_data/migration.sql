-- AlterTable
ALTER TABLE "Website" DROP COLUMN "content",
DROP COLUMN "ctaLink",
DROP COLUMN "ctaText",
DROP COLUMN "subtitle",
DROP COLUMN "themeColor",
ADD COLUMN     "data" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Website_userId_idx" ON "Website"("userId");

