-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "fonts" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "draft" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "websiteId" TEXT NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Page_websiteId_idx" ON "Page"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_websiteId_slug_key" ON "Page"("websiteId", "slug");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each website's single page becomes its start page (slug ""), with its
-- published content and any unpublished draft.
INSERT INTO "Page" ("id", "slug", "title", "data", "draft", "position", "createdAt", "updatedAt", "websiteId")
SELECT 'pg' || replace(gen_random_uuid()::text, '-', ''), '', 'Startsida', "data", "draft", 0, "createdAt", CURRENT_TIMESTAMP, "id"
FROM "Website";

-- Uploaded fonts are shared by every page now: take them from that page
-- (its draft if there is one).
UPDATE "Website"
SET "fonts" = CASE
  WHEN jsonb_typeof(COALESCE("draft", "data") -> 'root' -> 'props' -> 'customFonts') = 'array'
    THEN COALESCE("draft", "data") -> 'root' -> 'props' -> 'customFonts'
  ELSE '[]'::jsonb
END;
