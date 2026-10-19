-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "subdomain" TEXT NOT NULL,
ALTER COLUMN "published" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Website_subdomain_key" ON "Website"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Website_customDomain_key" ON "Website"("customDomain");

